from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import redis.asyncio as aioredis
from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache TTL constants (seconds) from SDS
# ---------------------------------------------------------------------------
TTL_SEARCH = 6 * 3600           # search:{query}:{region}         — 6 h
TTL_TITLE_AVAILABILITY = 6 * 3600  # title:{id}:availability:{region} — 6 h
TTL_PLATFORM_ALL = 24 * 3600    # platform:all                    — 24 h
TTL_SPORTS_UPCOMING = 30 * 60   # sports:upcoming:{league}        — 30 min
TTL_LEAVING_SOON = 12 * 3600    # leaving_soon:{region}           — 12 h

# ---------------------------------------------------------------------------
# Cache key builders
# ---------------------------------------------------------------------------

def key_search(query: str, region: str) -> str:
    return f"search:{query.lower().strip()}:{region.upper()}"


def key_title_availability(title_id: str, region: str) -> str:
    return f"title:{title_id}:availability:{region.upper()}"


def key_platform_all() -> str:
    return "platform:all"


def key_sports_upcoming(league: str) -> str:
    return f"sports:upcoming:{league.lower()}"


def key_leaving_soon(region: str) -> str:
    return f"leaving_soon:{region.upper()}"


# ---------------------------------------------------------------------------
# Redis client
# ---------------------------------------------------------------------------

_redis_pool: Redis | None = None


async def get_redis_pool() -> Redis:
    """Return (creating if needed) the global async Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def close_redis_pool() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


# FastAPI dependency
async def get_redis() -> AsyncGenerator[Redis, None]:
    pool = await get_redis_pool()
    yield pool


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

class CacheClient:
    """Thin wrapper around the Redis client providing get/set/delete helpers."""

    def __init__(self, redis: Redis) -> None:
        self._r = redis

    async def get(self, key: str) -> Any | None:
        """Retrieve a JSON-serialised value; returns None on miss or error."""
        try:
            raw = await self._r.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Cache GET error for key %r: %s", key, exc)
            return None

    async def set(self, key: str, value: Any, ttl: int) -> None:
        """Serialise value to JSON and store with expiry (seconds)."""
        try:
            await self._r.setex(key, ttl, json.dumps(value, default=str))
        except Exception as exc:
            logger.warning("Cache SET error for key %r: %s", key, exc)

    async def delete(self, *keys: str) -> None:
        """Delete one or more keys."""
        try:
            if keys:
                await self._r.delete(*keys)
        except Exception as exc:
            logger.warning("Cache DELETE error: %s", exc)

    async def exists(self, key: str) -> bool:
        try:
            return bool(await self._r.exists(key))
        except Exception:
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern. Use sparingly."""
        try:
            keys = [k async for k in self._r.scan_iter(pattern)]
            if keys:
                await self._r.delete(*keys)
            return len(keys)
        except Exception as exc:
            logger.warning("Cache pattern invalidation error for %r: %s", pattern, exc)
            return 0
