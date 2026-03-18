from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import (
    CacheClient,
    TTL_SEARCH,
    get_redis,
    key_search,
)
from app.database import get_db
from app.models.title import Title
from app.schemas.title import TitleSummary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["search"])


@router.get("/search", response_model=list[TitleSummary])
async def search_titles(
    q: Annotated[str, Query(min_length=1, max_length=256, description="Search query")],
    region: Annotated[str, Query(min_length=2, max_length=2)] = "US",
    type: Annotated[str | None, Query(description="Filter by title type")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[TitleSummary]:
    """
    Full-text search across titles using PostgreSQL tsvector GIN index.
    Results are cached per query+region for 6 hours.
    """
    cache = CacheClient(redis)
    cache_key = key_search(f"{q}:{type}:p{page}:ps{page_size}", region)

    cached = await cache.get(cache_key)
    if cached is not None:
        return [TitleSummary.model_validate(item) for item in cached]

    # Build FTS query using to_tsquery; fall back to ILIKE for short/simple terms
    ts_query = func.plainto_tsquery("english", q)
    fts_condition = func.to_tsvector("english", Title.title).bool_op("@@")(ts_query)
    like_condition = Title.title.ilike(f"%{q}%")

    stmt = (
        select(Title)
        .where(or_(fts_condition, like_condition))
        .order_by(
            func.ts_rank(func.to_tsvector("english", Title.title), ts_query).desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    if type is not None:
        stmt = stmt.where(Title.type == type)

    result = await db.execute(stmt)
    titles = result.scalars().all()

    response = [TitleSummary.model_validate(t) for t in titles]

    await cache.set(cache_key, [r.model_dump() for r in response], TTL_SEARCH)

    return response


@router.get("/browse", response_model=list[TitleSummary])
async def browse_titles(
    type: Annotated[str | None, Query(description="Filter by title type")] = None,
    genre: Annotated[str | None, Query(description="Filter by genre")] = None,
    year: Annotated[int | None, Query(ge=1888, le=2100)] = None,
    region: Annotated[str, Query(min_length=2, max_length=2)] = "US",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
) -> list[TitleSummary]:
    """Browse/filter titles with optional type, genre, year, and region filters."""
    stmt = select(Title).order_by(Title.created_at.desc())

    if type is not None:
        stmt = stmt.where(Title.type == type)
    if genre is not None:
        stmt = stmt.where(Title.genres.any(genre))  # type: ignore[attr-defined]
    if year is not None:
        stmt = stmt.where(Title.year == year)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    titles = result.scalars().all()
    return [TitleSummary.model_validate(t) for t in titles]
