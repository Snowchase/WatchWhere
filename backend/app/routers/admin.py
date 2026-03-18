from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import CacheClient, get_redis
from app.database import get_db
from app.models.availability import Availability
from app.models.platform import Platform
from app.models.title import Title
from app.schemas.availability import AvailabilityCreate, AvailabilityRead
from app.schemas.platform import PlatformCreate, PlatformRead
from app.schemas.title import TitleCreate, TitleRead

logger = logging.getLogger(__name__)

# NOTE: In production, protect this router with an admin-only dependency.
# For now it is registered under /api/v1/admin and should be placed behind
# network-level access control or a separate API key middleware.
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """Return basic database statistics for the admin dashboard."""
    title_count = await db.scalar(select(func.count(Title.id)))
    platform_count = await db.scalar(select(func.count(Platform.id)))
    availability_count = await db.scalar(select(func.count(Availability.id)))
    return {
        "titles": title_count,
        "platforms": platform_count,
        "availability_records": availability_count,
    }


# ---------------------------------------------------------------------------
# Titles
# ---------------------------------------------------------------------------


@router.post("/titles", response_model=TitleRead, status_code=status.HTTP_201_CREATED)
async def create_title(
    body: TitleCreate,
    db: AsyncSession = Depends(get_db),
) -> TitleRead:
    """Create a new title record."""
    title = Title(**body.model_dump())
    db.add(title)
    await db.flush()
    await db.refresh(title)
    return TitleRead.model_validate(title)


@router.delete("/titles/{title_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_title(
    title_id: Annotated[uuid.UUID, Path()],
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a title and all associated records (cascade)."""
    result = await db.execute(select(Title).where(Title.id == title_id))
    title = result.scalar_one_or_none()
    if title is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "TITLE_NOT_FOUND",
                    "message": f"Title {title_id} not found.",
                    "status": 404,
                }
            },
        )
    await db.delete(title)


# ---------------------------------------------------------------------------
# Platforms
# ---------------------------------------------------------------------------


@router.get("/platforms", response_model=list[PlatformRead])
async def list_platforms(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
    db: AsyncSession = Depends(get_db),
) -> list[PlatformRead]:
    result = await db.execute(
        select(Platform)
        .order_by(Platform.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [PlatformRead.model_validate(p) for p in result.scalars().all()]


@router.post("/platforms", response_model=PlatformRead, status_code=status.HTTP_201_CREATED)
async def create_platform(
    body: PlatformCreate,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> PlatformRead:
    """Create a new platform and invalidate the platform cache."""
    platform = Platform(**body.model_dump())
    db.add(platform)
    await db.flush()
    await db.refresh(platform)

    cache = CacheClient(redis)
    await cache.delete("platform:all")

    return PlatformRead.model_validate(platform)


@router.delete("/platforms/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platform(
    platform_id: Annotated[uuid.UUID, Path()],
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> None:
    result = await db.execute(select(Platform).where(Platform.id == platform_id))
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "PLATFORM_NOT_FOUND",
                    "message": f"Platform {platform_id} not found.",
                    "status": 404,
                }
            },
        )
    await db.delete(platform)
    cache = CacheClient(redis)
    await cache.delete("platform:all")


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------


@router.post(
    "/availability",
    response_model=AvailabilityRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_availability(
    body: AvailabilityCreate,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> AvailabilityRead:
    """Upsert an availability record and bust relevant caches."""
    record = Availability(**body.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)

    cache = CacheClient(redis)
    await cache.delete(f"title:{body.title_id}:availability:{body.region.upper()}")
    await cache.delete(f"leaving_soon:{body.region.upper()}")

    return AvailabilityRead.model_validate(record)


@router.delete("/availability/{availability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability(
    availability_id: Annotated[uuid.UUID, Path()],
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> None:
    result = await db.execute(
        select(Availability).where(Availability.id == availability_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "AVAILABILITY_NOT_FOUND",
                    "message": f"Availability record {availability_id} not found.",
                    "status": 404,
                }
            },
        )
    region = record.region
    title_id = record.title_id
    await db.delete(record)

    cache = CacheClient(redis)
    await cache.delete(f"title:{title_id}:availability:{region}")
    await cache.delete(f"leaving_soon:{region}")


# ---------------------------------------------------------------------------
# Task triggers
# ---------------------------------------------------------------------------


@router.post("/tasks/{task_name}/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_task(task_name: Annotated[str, Path()]) -> dict:
    """Manually enqueue a Celery task by name."""
    from app.tasks.jobs import (  # local import to avoid circular deps
        TASK_REGISTRY,
    )

    task_fn = TASK_REGISTRY.get(task_name)
    if task_fn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "TASK_NOT_FOUND",
                    "message": f"No task named '{task_name}'.",
                    "status": 404,
                }
            },
        )
    result = task_fn.delay()
    return {"task_id": result.id, "status": "queued"}
