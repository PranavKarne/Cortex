import hashlib
import os
from datetime import datetime, timedelta

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import csrf_protect, get_current_user
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    generate_csrf_token,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models.auth_models import (
    EmailVerificationToken,
    PasswordResetToken,
    RefreshToken,
    User,
)
from app.schemas.auth import (
    AuthMessage,
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    VerifyEmailRequest,
)
from app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
LOCK_MINUTES = int(os.getenv("LOCK_MINUTES", "15"))
RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", "30"))
VERIFY_TOKEN_MINUTES = int(os.getenv("VERIFY_TOKEN_MINUTES", "60"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")


@router.post("/signup", response_model=AuthResponse)
def signup(
    request: Request,
    payload: SignupRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="user",
    )

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

    user.is_verified = True
    db.commit()

    csrf_token = generate_csrf_token()

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return {"user": _to_user_public(user)}


@router.post("/login", response_model=AuthResponse)
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=423, detail="Account locked")

    if not verify_password(payload.password, user.password_hash):
        user.failed_attempts += 1

        if user.failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(
                minutes=LOCK_MINUTES
            )

        db.commit()

        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.failed_attempts = 0
    user.locked_until = None
    db.commit()

    access_token = create_access_token(user.id, user.role)

    refresh_token, refresh_expires = create_refresh_token(
        user.id,
        user.role,
        payload.remember_me,
    )

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=refresh_expires,
        )
    )

    db.commit()

    csrf_token = generate_csrf_token()

    _set_auth_cookies(
        response,
        access_token,
        refresh_token,
        csrf_token,
    )

    return {"user": _to_user_public(user)}


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias="refresh_token",
    ),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Missing refresh token",
        )

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    if not stored or stored.revoked_at or stored.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        )

    user = db.query(User).filter(User.id == stored.user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(user.id, user.role)

    new_refresh, refresh_expires = create_refresh_token(
        user.id,
        user.role,
        False,
    )

    new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()

    stored.revoked_at = datetime.utcnow()
    stored.replaced_by = new_hash

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=refresh_expires,
        )
    )

    db.commit()

    csrf_token = generate_csrf_token()

    _set_auth_cookies(
        response,
        access_token,
        new_refresh,
        csrf_token,
    )

    return {"user": _to_user_public(user)}


@router.post("/logout", response_model=AuthMessage)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias="refresh_token",
    ),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    __: None = Depends(csrf_protect),
):
    if refresh_token:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

        stored = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash)
            .first()
        )

        if stored:
            stored.revoked_at = datetime.utcnow()
            db.commit()

    _clear_auth_cookies(response)

    return {"message": "Logged out"}


@router.get("/me", response_model=AuthResponse)
def me(user: User = Depends(get_current_user)):
    return {"user": _to_user_public(user)}


@router.post("/forgot-password", response_model=AuthMessage)
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user:
        return {
            "message": "If the email exists, reset instructions were sent."
        }

    token = os.urandom(32).hex()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow()
        + timedelta(minutes=RESET_TOKEN_MINUTES),
    )

    db.add(reset)
    db.commit()

    reset_link = (
        f"{FRONTEND_BASE_URL}/reset-password?token={token}"
    )

    send_email(
        user.email,
        "Reset your CORTEX password",
        f"Reset your password: {reset_link}",
    )

    return {
        "message": "If the email exists, reset instructions were sent."
    }


@router.post("/reset-password", response_model=AuthMessage)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    stored = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not stored or stored.used_at or stored.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == stored.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)

    stored.used_at = datetime.utcnow()

    db.commit()

    return {"message": "Password updated"}


@router.post("/verify-email", response_model=AuthMessage)
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    stored = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == token_hash)
        .first()
    )

    if not stored or stored.used_at or stored.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == stored.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True

    stored.used_at = datetime.utcnow()

    db.commit()

    return {"message": "Email verified"}


@router.post("/resend-verification", response_model=AuthMessage)
def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user:
        return {
            "message": "If the email exists, verification was sent."
        }

    token = os.urandom(32).hex()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    verify = EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow()
        + timedelta(minutes=VERIFY_TOKEN_MINUTES),
    )

    db.add(verify)
    db.commit()

    verify_link = (
        f"{FRONTEND_BASE_URL}/verify-email?token={token}"
    )

    send_email(
        user.email,
        "Verify your CORTEX account",
        f"Verify your email: {verify_link}",
    )

    return {
        "message": "If the email exists, verification was sent."
    }


def _to_user_public(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
    }


def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=60 * 60,
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=60 * 60 * 24 * 30,
        path="/auth/refresh",
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=60 * 60 * 24,
        path="/",
    )


def _clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    response.delete_cookie("csrf_token", path="/")
    
    
    