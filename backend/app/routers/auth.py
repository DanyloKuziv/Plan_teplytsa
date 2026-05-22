import uuid
import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserOut, Token

router = APIRouter()

VERIFICATION_TTL_MINUTES = 15


def _gen_code() -> str:
    return "".join(random.choices(string.digits, k=6))


async def _send_verification_bg(to_email: str, full_name: str, code: str):
    from app.services.email_service import send_verification_email
    await send_verification_email(to_email, full_name, code)


async def _send_reset_bg(to_email: str, full_name: str, code: str):
    from app.services.email_service import send_reset_email
    await send_reset_email(to_email, full_name, code)


class VerifyEmailPayload(BaseModel):
    email: EmailStr
    code: str


class ForgotPasswordPayload(BaseModel):
    email: EmailStr


class ResetPasswordPayload(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class ResendPayload(BaseModel):
    email: EmailStr


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    code = _gen_code()
    expires = datetime.utcnow() + timedelta(minutes=VERIFICATION_TTL_MINUTES)

    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_verified=False,
        verification_code=code,
        verification_expires=expires,
    )
    db.add(user)
    db.commit()

    background_tasks.add_task(_send_verification_bg, payload.email, payload.full_name, code)
    return {"detail": "Verification code sent to your email."}


@router.post("/verify-email", response_model=Token)
def verify_email(payload: VerifyEmailPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    if not user.verification_code or user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if user.verification_expires and datetime.utcnow() > user.verification_expires:
        raise HTTPException(status_code=400, detail="Verification code expired")

    user.is_verified = True
    user.verification_code = None
    user.verification_expires = None
    db.commit()

    token = create_access_token({
        "sub":       str(user.id),
        "full_name": user.full_name,
        "email":     user.email,
        "is_admin":  user.is_admin,
    })
    return Token(access_token=token)


@router.post("/resend-verification", status_code=200)
async def resend_verification(
    payload: ResendPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    code = _gen_code()
    user.verification_code = code
    user.verification_expires = datetime.utcnow() + timedelta(minutes=VERIFICATION_TTL_MINUTES)
    db.commit()

    background_tasks.add_task(_send_verification_bg, user.email, user.full_name, code)
    return {"detail": "New verification code sent."}


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    payload: ForgotPasswordPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 200 to avoid email enumeration
    if not user:
        return {"detail": "If this email exists, a reset code has been sent."}

    code = _gen_code()
    user.reset_code = code
    user.reset_expires = datetime.utcnow() + timedelta(minutes=VERIFICATION_TTL_MINUTES)
    db.commit()

    background_tasks.add_task(_send_reset_bg, user.email, user.full_name, code)
    return {"detail": "If this email exists, a reset code has been sent."}


@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.reset_code or user.reset_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    if user.reset_expires and datetime.utcnow() > user.reset_expires:
        raise HTTPException(status_code=400, detail="Reset code expired")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = hash_password(payload.new_password)
    user.reset_code = None
    user.reset_expires = None
    db.commit()
    return {"detail": "Password has been reset successfully."}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox.",
        )
    token = create_access_token({
        "sub":       str(user.id),
        "full_name": user.full_name,
        "email":     user.email,
        "is_admin":  user.is_admin,
    })
    return Token(access_token=token)
