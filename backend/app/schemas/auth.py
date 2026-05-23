from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_verified: bool
    created_at: datetime


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class AuthResponse(BaseModel):
    user: UserPublic


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int


class AuthMessage(BaseModel):
    message: str


class SessionInfo(BaseModel):
    user: Optional[UserPublic]
