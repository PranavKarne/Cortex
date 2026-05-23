import hmac
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
REMEMBER_REFRESH_DAYS = int(os.getenv("REMEMBER_REFRESH_DAYS", "30"))

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)


def hash_password(password: str) -> str:
    password = password[:72]
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    password = password[:72]
    return pwd_context.verify(password, hashed)


def create_access_token(subject: str, role: str):
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES)

    payload = {
        "sub": subject,
        "role": role,
        "exp": expires
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def create_refresh_token(subject: str, role: str, remember: bool):
    days = REMEMBER_REFRESH_DAYS if remember else REFRESH_TOKEN_DAYS

    expires = datetime.utcnow() + timedelta(days=days)

    payload = {
        "sub": subject,
        "role": role,
        "exp": expires
    }

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token, expires


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
    except Exception:
        return None


def generate_csrf_token():
    return secrets.token_hex(32)


def csrf_matches(token: str, csrf_cookie: str):
    return hmac.compare_digest(
        token or "",
        csrf_cookie or ""
    )
    
    