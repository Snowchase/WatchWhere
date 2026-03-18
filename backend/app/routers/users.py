from __future__ import annotations

import logging
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import CurrentUserID
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


async def _get_user_or_404(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found.",
                    "status": 404,
                }
            },
        )
    return user


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Return the authenticated user's profile."""
    user = await _get_user_or_404(current_user_id, db)
    return UserRead.model_validate(user)


@router.put("/me", response_model=UserRead)
async def update_me(
    body: UserUpdate,
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Update the authenticated user's profile."""
    user = await _get_user_or_404(current_user_id, db)

    if body.region is not None:
        user.region = body.region.upper()
    if body.subscriptions is not None:
        user.subscriptions = body.subscriptions
    if body.notify_email is not None:
        user.notify_email = body.notify_email
    if body.notify_push is not None:
        user.notify_push = body.notify_push
    if body.password is not None:
        hashed = bcrypt.hashpw(
            body.password.encode(), bcrypt.gensalt(rounds=settings.bcrypt_rounds)
        ).decode()
        user.password_hash = hashed

    await db.flush()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete the authenticated user's account."""
    user = await _get_user_or_404(current_user_id, db)
    await db.delete(user)
