from datetime import datetime
from fastapi import Cookie, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.security import decode_token
from app.db import get_db
from app.models.auth_models import User


def get_current_user(
    db: Session = Depends(get_db),
    access_token: str | None = Cookie(default=None, alias="access_token"),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=423, detail="Account locked")

    return user


def require_roles(*roles: str):
    def _checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _checker


def csrf_protect(request: Request, csrf_token: str | None = Cookie(default=None, alias="csrf_token")):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    header = request.headers.get("x-csrf-token")
    if not header or not csrf_token or header != csrf_token:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
