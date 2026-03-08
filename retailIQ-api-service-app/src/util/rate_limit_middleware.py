"""
Rate limiting middleware to protect API from abuse.
Uses in-memory storage for simplicity (for production, use Redis).
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with different limits for different endpoint types.
    
    Limits:
    - Login: 5 requests per minute per IP
    - Upload: 10 requests per hour per IP
    - Other endpoints: 100 requests per minute per IP
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Storage: {ip_address: {endpoint_key: [(timestamp, count)]}}
        self.request_counts: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self.cleanup_interval = 300  # Clean up old entries every 5 minutes
        self.last_cleanup = datetime.now()
        
        # Rate limit configurations: (max_requests, time_window_seconds)
        self.limits = {
            "login": (5, 60),           # 5 requests per minute
            "upload": (10, 3600),       # 10 requests per hour
            "default": (100, 60),       # 100 requests per minute
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check for CloudFront/ALB forwarded IP
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client
        return request.client.host if request.client else "unknown"
    
    def _get_rate_limit_key(self, request: Request) -> Tuple[str, int, int]:
        """
        Determine which rate limit to apply based on the endpoint.
        Returns: (key, max_requests, time_window_seconds)
        """
        path = request.url.path
        
        if "/auth/login" in path:
            limit = self.limits["login"]
            return ("login", limit[0], limit[1])
        elif "/ingestion/upload" in path:
            limit = self.limits["upload"]
            return ("upload", limit[0], limit[1])
        else:
            limit = self.limits["default"]
            return ("default", limit[0], limit[1])
    
    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory bloat."""
        now = datetime.now()
        if (now - self.last_cleanup).seconds < self.cleanup_interval:
            return
        
        self.last_cleanup = now
        cutoff_time = now - timedelta(hours=2)  # Keep last 2 hours
        
        # Clean up old IPs and timestamps
        ips_to_remove = []
        for ip, endpoints in self.request_counts.items():
            for endpoint_key, timestamps in list(endpoints.items()):
                # Remove old timestamps
                endpoints[endpoint_key] = [
                    ts for ts in timestamps if ts > cutoff_time
                ]
                # Remove empty endpoint keys
                if not endpoints[endpoint_key]:
                    del endpoints[endpoint_key]
            
            # Mark IP for removal if no endpoints left
            if not endpoints:
                ips_to_remove.append(ip)
        
        # Remove empty IPs
        for ip in ips_to_remove:
            del self.request_counts[ip]
        
        if ips_to_remove:
            logger.info(f"Rate limit cleanup: removed {len(ips_to_remove)} IPs")
    
    def _is_rate_limited(
        self, 
        ip: str, 
        endpoint_key: str, 
        max_requests: int, 
        time_window: int
    ) -> Tuple[bool, int, int]:
        """
        Check if the request should be rate limited.
        Returns: (is_limited, remaining_requests, retry_after_seconds)
        """
        now = datetime.now()
        cutoff_time = now - timedelta(seconds=time_window)
        
        # Get timestamps for this IP and endpoint
        timestamps = self.request_counts[ip][endpoint_key]
        
        # Remove old timestamps outside the time window
        valid_timestamps = [ts for ts in timestamps if ts > cutoff_time]
        self.request_counts[ip][endpoint_key] = valid_timestamps
        
        # Check if limit exceeded
        current_count = len(valid_timestamps)
        remaining = max(0, max_requests - current_count)
        
        if current_count >= max_requests:
            # Calculate retry after (time until oldest request expires)
            if valid_timestamps:
                oldest = min(valid_timestamps)
                retry_after = int((oldest + timedelta(seconds=time_window) - now).total_seconds())
                retry_after = max(1, retry_after)  # At least 1 second
            else:
                retry_after = time_window
            
            return True, 0, retry_after
        
        # Add current timestamp
        self.request_counts[ip][endpoint_key].append(now)
        
        return False, remaining - 1, 0
    
    async def dispatch(self, request: Request, call_next):
        """Process the request with rate limiting."""
        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)
        
        # Periodic cleanup
        self._cleanup_old_entries()
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Get rate limit configuration for this endpoint
        endpoint_key, max_requests, time_window = self._get_rate_limit_key(request)
        
        # Check rate limit
        is_limited, remaining, retry_after = self._is_rate_limited(
            client_ip, endpoint_key, max_requests, time_window
        )
        
        if is_limited:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on {endpoint_key} endpoint. "
                f"Retry after {retry_after}s"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": retry_after,
                    "limit": max_requests,
                    "window": f"{time_window}s"
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after)
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = f"{time_window}s"
        
        return response
