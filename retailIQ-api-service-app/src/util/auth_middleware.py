from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, secret_key: str, token_handler):
        super().__init__(app)
        self.secret_key = secret_key
        self.token_handler = token_handler
        # Public endpoints that don't require authentication
        self.public_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/verify",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]
    
    async def dispatch(self, request, call_next):
        # Check if path is public
        path = request.url.path
        
        # Allow public endpoints
        if any(path.startswith(public_path) for public_path in self.public_paths):
            response = await call_next(request)
            return response
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authorization header. Please login first."}
            )
        
        # Simple token validation (in production, use JWT)
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid authorization format. Use: Bearer <token>"}
            )
        
        token = auth_header.replace("Bearer ", "")
        
        # Basic token validation (in production, verify JWT signature)
        if len(token) < 32:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token. Please login again."}
            )
        
        # Token is valid, proceed with request
        response = await call_next(request)
        return response
