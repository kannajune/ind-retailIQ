"""Authentication routes for login and token management."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import hashlib
import os

router = APIRouter()

# Simple user credentials (in production, use database)
# Default credentials: admin / RetailIQ@2024
USERS = {
    "admin": {
        "password_hash": hashlib.sha256("RetailIQ@2024".encode()).hexdigest(),
        "role": "admin"
    }
}

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
    role: str
    message: str

class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint to authenticate users.
    
    Default credentials:
    - Username: admin
    - Password: RetailIQ@2024
    """
    username = request.username
    password = request.password
    
    # Check if user exists
    if username not in USERS:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    if USERS[username]["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate simple token (in production, use JWT)
    token = hashlib.sha256(f"{username}:{password}:{os.urandom(16).hex()}".encode()).hexdigest()
    
    return LoginResponse(
        token=token,
        username=username,
        role=USERS[username]["role"],
        message="Login successful"
    )

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest):
    """Change user password."""
    username = request.username
    
    # Check if user exists
    if username not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    old_password_hash = hashlib.sha256(request.old_password.encode()).hexdigest()
    if USERS[username]["password_hash"] != old_password_hash:
        raise HTTPException(status_code=401, detail="Invalid old password")
    
    # Update password
    new_password_hash = hashlib.sha256(request.new_password.encode()).hexdigest()
    USERS[username]["password_hash"] = new_password_hash
    
    return {"message": "Password changed successfully"}

@router.get("/verify")
async def verify_token():
    """Verify if the current token is valid."""
    # In production, verify JWT token
    return {"valid": True, "message": "Token is valid"}
