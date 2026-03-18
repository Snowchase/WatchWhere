from __future__ import annotations

"""
Celery task definitions for WatchWhere.

All tasks are bound (bind=True) so they can retry themselves via self.retry().
Database access uses a synchronous SQLAlchemy session (psycopg2) because
Celery workers run in a regular synchronous context.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from celery import Task

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: run async functions from sync Celery tasks
# ---------------------------------------------------------------------------

def _run(coro):
    """Execute an async coroutine from a synchronous Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Task base with shared retry config
# ---------------------------------------------------------------------------

class BaseTask(Task):
    abstract = True
    autoretry_for = (Exception,)
    max_retries = 3
    default_retry_delay = 60  # seconds
    retry_backoff = True


# ---------------------------------------------------------------------------
# 1. sync_watchmode_availability  — every 12 hours
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.sync_watchmode_availability")
def sync_watchmode_availability(self) -> dict:
    """
    Pull streaming availability data from Watchmode and upsert into the
    availability table for all known titles.
    """
    from app.database import AsyncSessionLocal
    from app.models.title import Title
    from app.models.platform import Platform
    from app.models.availability import Availability
    from app.services.watchmode import watchmode_client
    from sqlalchemy import select
    import asyncio

    async def _sync():
        updated = 0
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Title).where(Title.tmdb_id.isnot(None)).limit(500)
            )
            titles = result.scalars().all()

            # Build slug→UUID platform map
            plat_result = await db.execute(select(Platform))
            platforms = {p.slug: p.id for p in plat_result.scalars().all()}

            for title in titles:
                try:
                    # Search Watchmode for this title
                    search_results = await watchmode_client.search_title(title.title)
                    if not search_results:
                        continue

                    wm_id = search_results[0].get("id")
                    if not wm_id:
                        continue

                    sources = await watchmode_client.get_title_sources(wm_id)
                    for src in sources:
                        region = src.get("region", "US")
                        normalized = watchmode_client.normalize_source(
                            src, str(title.id), region
                        )
                        slug = normalized.pop("platform_slug", None)
                        platform_id = platforms.get(str(slug))
                        if not platform_id:
                            continue

                        normalized["platform_id"] = platform_id

                        # Upsert: check existing record
                        existing = await db.execute(
                            select(Availability).where(
                                Availability.title_id == title.id,
                                Availability.platform_id == platform_id,
                                Availability.region == region,
                                Availability.stream_type == normalized["stream_type"],
                            )
                        )
                        record = existing.scalar_one_or_none()
                        if record:
                            record.content_url = normalized["content_url"]
                            record.price = normalized["price"]
                            record.last_verified = datetime.now(tz=timezone.utc)
                        else:
                            new_rec = Availability(**normalized)
                            db.add(new_rec)
                        updated += 1

                    await db.commit()
                except Exception as exc:
                    logger.warning("Watchmode sync failed for title %s: %s", title.id, exc)
                    await db.rollback()

        return updated

    count = _run(_sync())
    logger.info("sync_watchmode_availability: updated %d records", count)
    return {"updated": count}


# ---------------------------------------------------------------------------
# 2. sync_sports_schedule  — every 1 hour
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.sync_sports_schedule")
def sync_sports_schedule(self) -> dict:
    """
    Pull upcoming sports events from TheSportsDB and upsert into sports_events.
    """
    from app.database import AsyncSessionLocal
    from app.models.sports_event import SportsEvent
    from app.models.title import Title
    from app.services.sportsdb import sportsdb_client
    from sqlalchemy import select

    # Leagues to track — in production, load from DB or config
    LEAGUE_IDS = ["4335", "4328", "4346", "4391"]  # EPL, NBA, MLB, NFL

    async def _sync():
        created = 0
        async with AsyncSessionLocal() as db:
            for league_id in LEAGUE_IDS:
                try:
                    events = await sportsdb_client.get_upcoming_events_by_league(league_id)
                    for raw in events:
                        normalized = sportsdb_client.normalize_event(raw)
                        ext_id = normalized.get("external_event_id")

                        if ext_id:
                            existing = await db.execute(
                                select(SportsEvent).where(
                                    SportsEvent.external_event_id == ext_id
                                )
                            )
                            if existing.scalar_one_or_none():
                                continue

                        # Create a placeholder title for this sport event
                        match_title = f"{normalized['home_team']} vs {normalized['away_team']}"
                        title = Title(
                            title=match_title,
                            type="sport",
                            genres=[],
                        )
                        db.add(title)
                        await db.flush()

                        event = SportsEvent(
                            title_id=title.id,
                            **normalized,
                        )
                        db.add(event)
                        created += 1

                    await db.commit()
                except Exception as exc:
                    logger.warning("Sports sync failed for league %s: %s", league_id, exc)
                    await db.rollback()

        return created

    count = _run(_sync())
    logger.info("sync_sports_schedule: created %d events", count)
    return {"created": count}


# ---------------------------------------------------------------------------
# 3. scrape_justwatch_gaps  — every 24 hours
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.scrape_justwatch_gaps")
def scrape_justwatch_gaps(self) -> dict:
    """
    Identify titles with no availability records and scrape JustWatch to fill gaps.
    """
    from app.database import AsyncSessionLocal
    from app.models.title import Title
    from app.models.availability import Availability
    from app.scrapers.justwatch import JustWatchScraper
    from sqlalchemy import select, not_, exists

    async def _scrape():
        filled = 0
        async with AsyncSessionLocal() as db:
            # Titles with zero availability records
            subq = select(Availability.title_id).distinct()
            result = await db.execute(
                select(Title)
                .where(not_(Title.id.in_(subq)))
                .limit(100)
            )
            titles = result.scalars().all()

            if not titles:
                return 0

            async with JustWatchScraper() as scraper:
                for title in titles:
                    try:
                        results = await scraper.search(title.title)
                        if not results:
                            continue

                        best = results[0]
                        offers = await scraper.get_offers(best["path"])

                        for offer in offers:
                            # We can't resolve platform_id without the DB mapping here;
                            # log for manual review or future batch resolution
                            logger.debug(
                                "JustWatch offer for %r: platform=%r type=%r price=%r",
                                title.title,
                                offer.platform_name,
                                offer.stream_type,
                                offer.price,
                            )
                        filled += len(offers)
                    except Exception as exc:
                        logger.warning("JustWatch scrape failed for %r: %s", title.title, exc)

        return filled

    count = _run(_scrape())
    logger.info("scrape_justwatch_gaps: filled %d offers", count)
    return {"offers_scraped": count}


# ---------------------------------------------------------------------------
# 4. scrape_leaving_soon  — every 6 hours
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.scrape_leaving_soon")
def scrape_leaving_soon(self) -> dict:
    """
    Scrape platform leaving-soon pages and update available_until on
    matching availability records. Also busts the leaving_soon cache.
    """
    from app.database import AsyncSessionLocal
    from app.models.availability import Availability
    from app.models.platform import Platform
    from app.models.title import Title
    from app.scrapers.leaving_soon import scrape_all_leaving_soon
    from app.cache.redis import get_redis_pool, CacheClient
    from sqlalchemy import select, func

    async def _scrape():
        items = await scrape_all_leaving_soon()
        updated = 0

        if not items:
            return 0

        async with AsyncSessionLocal() as db:
            plat_result = await db.execute(select(Platform))
            slug_to_id = {p.slug: p.id for p in plat_result.scalars().all()}

            for item in items:
                try:
                    platform_id = slug_to_id.get(item.platform_slug)
                    if not platform_id:
                        continue

                    # Find matching title by name (case-insensitive)
                    title_result = await db.execute(
                        select(Title).where(
                            func.lower(Title.title) == item.title.lower()
                        )
                    )
                    title = title_result.scalar_one_or_none()
                    if not title:
                        continue

                    # Update availability record
                    avail_result = await db.execute(
                        select(Availability).where(
                            Availability.title_id == title.id,
                            Availability.platform_id == platform_id,
                            Availability.region == item.region,
                        )
                    )
                    record = avail_result.scalar_one_or_none()
                    if record and item.available_until:
                        record.available_until = item.available_until
                        updated += 1

                except Exception as exc:
                    logger.warning("Failed to process leaving-soon item %r: %s", item.title, exc)

            await db.commit()

        # Bust cache
        redis = await get_redis_pool()
        cache = CacheClient(redis)
        await cache.invalidate_pattern("leaving_soon:*")

        return updated

    count = _run(_scrape())
    logger.info("scrape_leaving_soon: updated %d records", count)
    return {"updated": count}


# ---------------------------------------------------------------------------
# 5. sync_anime_availability  — every 24 hours
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.sync_anime_availability")
def sync_anime_availability(self) -> dict:
    """
    Pull anime titles and streaming links from AniList and upsert into
    our titles/availability tables.
    """
    from app.database import AsyncSessionLocal
    from app.models.title import Title
    from app.models.availability import Availability
    from app.models.platform import Platform
    from app.services.anilist import anilist_client
    from sqlalchemy import select

    POPULAR_ANIME = ["Demon Slayer", "Attack on Titan", "One Piece", "Naruto", "Bleach"]

    async def _sync():
        upserted = 0
        async with AsyncSessionLocal() as db:
            plat_result = await db.execute(select(Platform))
            slug_to_id = {p.slug: p.id for p in plat_result.scalars().all()}

            for anime_name in POPULAR_ANIME:
                try:
                    results = await anilist_client.search_anime(anime_name, per_page=5)
                    for raw in results:
                        normalized = anilist_client.normalize(raw)

                        # Find or create title
                        title_result = await db.execute(
                            select(Title).where(Title.mal_id == normalized["mal_id"])
                        )
                        title = title_result.scalar_one_or_none()
                        if not title:
                            title = Title(**normalized)
                            db.add(title)
                            await db.flush()

                        # Process streaming episodes
                        streaming_eps = anilist_client.streaming_links(raw)
                        for ep in streaming_eps:
                            site = ep.get("site", "").lower()
                            # Map site name to our platform slugs
                            platform_id = slug_to_id.get(site)
                            if not platform_id:
                                continue

                            existing = await db.execute(
                                select(Availability).where(
                                    Availability.title_id == title.id,
                                    Availability.platform_id == platform_id,
                                    Availability.region == "US",
                                    Availability.stream_type == "subscription",
                                )
                            )
                            if not existing.scalar_one_or_none():
                                record = Availability(
                                    title_id=title.id,
                                    platform_id=platform_id,
                                    region="US",
                                    content_url=ep.get("url", ""),
                                    stream_type="subscription",
                                    source="anilist",
                                )
                                db.add(record)
                                upserted += 1

                    await db.commit()
                except Exception as exc:
                    logger.warning("Anime sync failed for %r: %s", anime_name, exc)
                    await db.rollback()

        return upserted

    count = _run(_sync())
    logger.info("sync_anime_availability: upserted %d records", count)
    return {"upserted": count}


# ---------------------------------------------------------------------------
# 6. purge_stale_records  — every 48 hours
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.purge_stale_records")
def purge_stale_records(self) -> dict:
    """
    Delete availability records that have not been verified in the last 14 days
    AND whose available_until date has passed.
    """
    from app.database import AsyncSessionLocal
    from app.models.availability import Availability
    from sqlalchemy import delete
    from datetime import date

    async def _purge():
        stale_threshold = datetime.now(tz=timezone.utc) - timedelta(days=14)
        today = date.today()

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                delete(Availability)
                .where(
                    Availability.last_verified < stale_threshold,
                    Availability.available_until < today,
                )
                .returning(Availability.id)
            )
            deleted = len(result.fetchall())
            await db.commit()
            return deleted

    count = _run(_purge())
    logger.info("purge_stale_records: deleted %d stale availability records", count)
    return {"deleted": count}


# ---------------------------------------------------------------------------
# 7. send_watchlist_alerts  — every 30 minutes
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, base=BaseTask, name="app.tasks.jobs.send_watchlist_alerts")
def send_watchlist_alerts(self) -> dict:
    """
    Check for availability changes affecting watchlisted titles and send
    email/push notifications to users who have opted in.

    Strategy: compare current availability against a Redis snapshot taken
    during the previous run. Differences trigger alerts.
    """
    from app.database import AsyncSessionLocal
    from app.models.availability import Availability
    from app.models.watchlist import Watchlist
    from app.models.user import User
    from app.cache.redis import get_redis_pool, CacheClient
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    import json

    SNAPSHOT_KEY = "internal:availability_snapshot"

    async def _alert():
        alerts_sent = 0
        redis = await get_redis_pool()
        cache = CacheClient(redis)

        async with AsyncSessionLocal() as db:
            # Load current availability as a dict keyed by (title_id, platform_id, region)
            avail_result = await db.execute(select(Availability))
            current: dict[str, str] = {
                f"{a.title_id}:{a.platform_id}:{a.region}": a.stream_type
                for a in avail_result.scalars().all()
            }

            # Load previous snapshot
            previous_raw = await cache.get(SNAPSHOT_KEY)
            previous: dict[str, str] = previous_raw or {}

            # Find newly added availability keys
            added_keys = set(current) - set(previous)
            removed_keys = set(previous) - set(current)

            if not added_keys and not removed_keys:
                await cache.set(SNAPSHOT_KEY, current, ttl=7200)
                return 0

            # Load watchlist entries with user preferences
            wl_result = await db.execute(
                select(Watchlist)
                .options(selectinload(Watchlist.user))
            )
            watchlist_entries = wl_result.scalars().all()

            for entry in watchlist_entries:
                user: User = entry.user
                title_id = str(entry.title_id)

                relevant_added = [k for k in added_keys if k.startswith(f"{title_id}:")]
                relevant_removed = [k for k in removed_keys if k.startswith(f"{title_id}:")]

                if relevant_added and entry.alert_on_add and user.notify_email:
                    logger.info(
                        "ALERT: title %s added to %d platforms for user %s",
                        title_id,
                        len(relevant_added),
                        user.email,
                    )
                    # TODO: integrate with email/push provider (SendGrid, FCM, etc.)
                    alerts_sent += 1

                if relevant_removed and entry.alert_on_remove and user.notify_email:
                    logger.info(
                        "ALERT: title %s removed from %d platforms for user %s",
                        title_id,
                        len(relevant_removed),
                        user.email,
                    )
                    alerts_sent += 1

            # Save new snapshot
            await cache.set(SNAPSHOT_KEY, current, ttl=7200)

        return alerts_sent

    count = _run(_alert())
    logger.info("send_watchlist_alerts: sent %d alerts", count)
    return {"alerts_sent": count}


# ---------------------------------------------------------------------------
# Task registry (for admin trigger endpoint)
# ---------------------------------------------------------------------------

TASK_REGISTRY: dict = {
    "sync_watchmode_availability": sync_watchmode_availability,
    "sync_sports_schedule": sync_sports_schedule,
    "scrape_justwatch_gaps": scrape_justwatch_gaps,
    "scrape_leaving_soon": scrape_leaving_soon,
    "sync_anime_availability": sync_anime_availability,
    "purge_stale_records": purge_stale_records,
    "send_watchlist_alerts": send_watchlist_alerts,
}
