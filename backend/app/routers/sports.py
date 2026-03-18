from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.redis import (
    CacheClient,
    TTL_SPORTS_UPCOMING,
    get_redis,
    key_sports_upcoming,
)
from app.database import get_db
from app.models.sports_event import SportsEvent
from app.schemas.sports_event import SportsEventRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sports", tags=["sports"])


@router.get("/upcoming", response_model=list[SportsEventRead])
async def upcoming_sports_events(
    league: Annotated[str | None, Query(description="Filter by league name")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[SportsEventRead]:
    """
    Return upcoming sports events, optionally filtered by league.
    Cached per league for 30 minutes.
    """
    cache = CacheClient(redis)
    league_key = league or "all"
    cache_key = key_sports_upcoming(league_key)

    cached = await cache.get(cache_key)
    if cached is not None:
        return [SportsEventRead.model_validate(item) for item in cached]

    now = datetime.now(tz=timezone.utc)
    stmt = (
        select(SportsEvent)
        .where(SportsEvent.event_time >= now)
        .order_by(SportsEvent.event_time.asc())
        .limit(limit)
    )

    if league is not None:
        stmt = stmt.where(SportsEvent.league.ilike(f"%{league}%"))

    result = await db.execute(stmt)
    events = result.scalars().all()

    response = [SportsEventRead.model_validate(e) for e in events]
    await cache.set(cache_key, [r.model_dump() for r in response], TTL_SPORTS_UPCOMING)

    return response
