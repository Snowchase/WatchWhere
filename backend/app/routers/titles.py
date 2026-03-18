from __future__ import annotations

import uuid
import logging
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.redis import (
    CacheClient,
    TTL_LEAVING_SOON,
    TTL_TITLE_AVAILABILITY,
    get_redis,
    key_leaving_soon,
    key_title_availability,
)
from app.database import get_db
from app.models.availability import Availability
from app.models.title import Title
from app.schemas.availability import AvailabilityRead
from app.schemas.title import TitleRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/titles", tags=["titles"])


def _not_found(title_id: uuid.UUID) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error": {
                "code": "TITLE_NOT_FOUND",
                "message": f"Title {title_id} not found.",
                "status": 404,
            }
        },
    )


@router.get("/{title_id}", response_model=TitleRead)
async def get_title(
    title_id: Annotated[uuid.UUID, Path()],
    db: AsyncSession = Depends(get_db),
) -> TitleRead:
    """Retrieve full details for a single title by UUID."""
    result = await db.execute(select(Title).where(Title.id == title_id))
    title = result.scalar_one_or_none()
    if title is None:
        raise _not_found(title_id)
    return TitleRead.model_validate(title)


@router.get("/{title_id}/availability", response_model=list[AvailabilityRead])
async def get_title_availability(
    title_id: Annotated[uuid.UUID, Path()],
    region: Annotated[str, Query(min_length=2, max_length=2)] = "US",
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[AvailabilityRead]:
    """
    Return streaming availability for a title in a given region.
    Cached per title+region for 6 hours.
    """
    cache = CacheClient(redis)
    cache_key = key_title_availability(str(title_id), region)

    cached = await cache.get(cache_key)
    if cached is not None:
        return [AvailabilityRead.model_validate(item) for item in cached]

    # Verify title exists
    title_result = await db.execute(select(Title).where(Title.id == title_id))
    if title_result.scalar_one_or_none() is None:
        raise _not_found(title_id)

    stmt = (
        select(Availability)
        .where(
            Availability.title_id == title_id,
            Availability.region == region.upper(),
        )
        .options(selectinload(Availability.platform))
        .order_by(Availability.stream_type)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    response = [AvailabilityRead.model_validate(r) for r in records]
    await cache.set(cache_key, [r.model_dump() for r in response], TTL_TITLE_AVAILABILITY)

    return response


leaving_soon_router = APIRouter(prefix="/api/v1", tags=["titles"])


@leaving_soon_router.get("/leaving-soon", response_model=list[AvailabilityRead])
async def leaving_soon(
    region: Annotated[str, Query(min_length=2, max_length=2)] = "US",
    days: Annotated[int, Query(ge=1, le=60)] = 30,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[AvailabilityRead]:
    """
    Return availability records expiring within `days` days.
    Cached per region for 12 hours.
    """
    cache = CacheClient(redis)
    cache_key = key_leaving_soon(region)

    cached = await cache.get(cache_key)
    if cached is not None:
        return [AvailabilityRead.model_validate(item) for item in cached]

    cutoff = date.today() + timedelta(days=days)
    stmt = (
        select(Availability)
        .where(
            Availability.region == region.upper(),
            Availability.available_until.isnot(None),
            Availability.available_until <= cutoff,
            Availability.available_until >= date.today(),
        )
        .options(selectinload(Availability.platform))
        .order_by(Availability.available_until.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    response = [AvailabilityRead.model_validate(r) for r in records]
    await cache.set(cache_key, [r.model_dump() for r in response], TTL_LEAVING_SOON)

    return response
