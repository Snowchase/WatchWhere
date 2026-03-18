from __future__ import annotations

import logging

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_refresh_token, verify_refresh_token
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_REFRESH_COOKIE = "refresh_token"


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode(), bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    ).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Register a new user account."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "EMAIL_ALREADY_REGISTERED",
                    "message": "A user with this email already exists.",
                    "status": 409,
                }
            },
        )

    user = User(
        email=body.email,
        password_hash=_hash_password(body.password),
        region=body.region.upper(),
        subscriptions=[],
    )
    db.add(user)
    await db.flush()  # assigns user.id before commit
    await db.refresh(user)

    # Issue tokens immediately after registration
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    response.headers["X-Access-Token"] = access_token
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email + password; returns access token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Incorrect email or password.",
                    "status": 401,
                }
            },
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Use the HttpOnly refresh-token cookie to issue a new access token."""
    token = request.cookies.get(_REFRESH_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "MISSING_REFRESH_TOKEN",
                    "message": "Refresh token cookie is missing.",
                    "status": 401,
                }
            },
        )

    payload = verify_refresh_token(token)
    user_id = payload["sub"]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "Associated user account no longer exists.",
                    "status": 401,
                }
            },
        )

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(access_token=new_access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear the HttpOnly refresh-token cookie."""
    response.delete_cookie(_REFRESH_COOKIE, httponly=True, samesite="lax")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )
