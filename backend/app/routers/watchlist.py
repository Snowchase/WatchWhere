from __future__ import annotations

import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.jwt import CurrentUserID
from app.database import get_db
from app.models.title import Title
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistCreate, WatchlistRead, WatchlistUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/watchlist", tags=["watchlist"])


async def _get_entry_or_404(
    entry_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Watchlist:
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.id == entry_id, Watchlist.user_id == user_id)
        .options(selectinload(Watchlist.title))
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "WATCHLIST_ENTRY_NOT_FOUND",
                    "message": "Watchlist entry not found.",
                    "status": 404,
                }
            },
        )
    return entry


@router.get("", response_model=list[WatchlistRead])
async def list_watchlist(
    current_user_id: CurrentUserID,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
) -> list[WatchlistRead]:
    """List all watchlist entries for the authenticated user."""
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user_id)
        .options(selectinload(Watchlist.title))
        .order_by(Watchlist.added_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    entries = result.scalars().all()
    return [WatchlistRead.model_validate(e) for e in entries]


@router.post("", response_model=WatchlistRead, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    body: WatchlistCreate,
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Add a title to the authenticated user's watchlist."""
    # Verify title exists
    title_result = await db.execute(select(Title).where(Title.id == body.title_id))
    if title_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "TITLE_NOT_FOUND",
                    "message": f"Title {body.title_id} not found.",
                    "status": 404,
                }
            },
        )

    entry = Watchlist(
        user_id=current_user_id,
        title_id=body.title_id,
        alert_on_add=body.alert_on_add,
        alert_on_remove=body.alert_on_remove,
    )
    db.add(entry)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "ALREADY_IN_WATCHLIST",
                    "message": "This title is already in your watchlist.",
                    "status": 409,
                }
            },
        )

    await db.refresh(entry)
    # Load the title relationship for the response
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.id == entry.id)
        .options(selectinload(Watchlist.title))
    )
    entry = result.scalar_one()
    return WatchlistRead.model_validate(entry)


@router.get("/{entry_id}", response_model=WatchlistRead)
async def get_watchlist_entry(
    entry_id: Annotated[uuid.UUID, Path()],
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    entry = await _get_entry_or_404(entry_id, current_user_id, db)
    return WatchlistRead.model_validate(entry)


@router.patch("/{entry_id}", response_model=WatchlistRead)
async def update_watchlist_entry(
    entry_id: Annotated[uuid.UUID, Path()],
    body: WatchlistUpdate,
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Update alert preferences for a watchlist entry."""
    entry = await _get_entry_or_404(entry_id, current_user_id, db)

    if body.alert_on_add is not None:
        entry.alert_on_add = body.alert_on_add
    if body.alert_on_remove is not None:
        entry.alert_on_remove = body.alert_on_remove

    await db.flush()
    await db.refresh(entry)
    return WatchlistRead.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    entry_id: Annotated[uuid.UUID, Path()],
    current_user_id: CurrentUserID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a title from the authenticated user's watchlist."""
    entry = await _get_entry_or_404(entry_id, current_user_id, db)
    await db.delete(entry)
