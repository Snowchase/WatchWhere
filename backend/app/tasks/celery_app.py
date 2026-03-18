from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.config import settings

# ---------------------------------------------------------------------------
# Celery application
# ---------------------------------------------------------------------------

celery_app = Celery(
    "watchwhere",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    # Prevent tasks from running more than once on reconnect
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# ---------------------------------------------------------------------------
# Beat schedule
# ---------------------------------------------------------------------------

celery_app.conf.beat_schedule = {
    # Sync streaming availability from Watchmode every 12 hours
    "sync_watchmode_availability": {
        "task": "app.tasks.jobs.sync_watchmode_availability",
        "schedule": crontab(minute=0, hour="*/12"),
    },
    # Sync sports schedule every hour
    "sync_sports_schedule": {
        "task": "app.tasks.jobs.sync_sports_schedule",
        "schedule": crontab(minute=0),
    },
    # Scrape JustWatch for titles missing from Watchmode — daily at 2am
    "scrape_justwatch_gaps": {
        "task": "app.tasks.jobs.scrape_justwatch_gaps",
        "schedule": crontab(minute=0, hour=2),
    },
    # Scrape leaving-soon data every 6 hours
    "scrape_leaving_soon": {
        "task": "app.tasks.jobs.scrape_leaving_soon",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    # Sync anime availability from AniList — daily at 3am
    "sync_anime_availability": {
        "task": "app.tasks.jobs.sync_anime_availability",
        "schedule": crontab(minute=0, hour=3),
    },
    # Purge stale records — weekly on Monday at 4am
    "purge_stale_records": {
        "task": "app.tasks.jobs.purge_stale_records",
        "schedule": crontab(minute=0, hour=4, day_of_week=1),
    },
    # Send watchlist alerts every 30 minutes
    "send_watchlist_alerts": {
        "task": "app.tasks.jobs.send_watchlist_alerts",
        "schedule": crontab(minute="*/30"),
    },
}

# Import tasks so Celery registers them
celery_app.autodiscover_tasks(["app.tasks.jobs"])
