from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)


class TheSportsDBClient:
    """Async client for TheSportsDB free-tier API."""

    def __init__(self) -> None:
        self._base_url = settings.sportsdb_base_url
        self._api_key = settings.sportsdb_api_key
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                headers={"Accept": "application/json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def _get(self, path: str, **params: Any) -> dict:
        client = await self._get_client()
        url = f"{self._base_url}/{self._api_key}/{path}"
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def get_upcoming_events_by_league(self, league_id: str) -> list[dict]:
        """Fetch next 15 events for a given league ID."""
        data = await self._get(f"eventsnextleague.php", id=league_id)
        return data.get("events") or []

    async def get_past_events_by_league(self, league_id: str) -> list[dict]:
        """Fetch last 15 events for a given league ID."""
        data = await self._get("eventspastleague.php", id=league_id)
        return data.get("events") or []

    async def search_events(self, event_name: str, season: str | None = None) -> list[dict]:
        """Search for events by name, optionally filtered by season."""
        params: dict[str, Any] = {"e": event_name}
        if season:
            params["s"] = season
        data = await self._get("searchevents.php", **params)
        return data.get("event") or []

    async def get_event_by_id(self, event_id: str) -> dict | None:
        """Fetch a single event by TheSportsDB event ID."""
        data = await self._get("lookupevent.php", id=event_id)
        events = data.get("events") or []
        return events[0] if events else None

    async def get_leagues(self, sport: str = "Soccer") -> list[dict]:
        """List all leagues for a sport."""
        data = await self._get("all_leagues.php", s=sport)
        return data.get("leagues") or []

    @staticmethod
    def normalize_event(raw: dict) -> dict:
        """
        Map a TheSportsDB event dict to our internal sports_event schema dict.
        Returns a partial dict; caller must supply title_id and broadcast_ids.
        """
        # Parse event date+time
        date_str = raw.get("dateEvent", "")
        time_str = raw.get("strTime", "00:00:00") or "00:00:00"
        event_time: datetime | None = None
        if date_str:
            try:
                dt_str = f"{date_str}T{time_str}"
                event_time = datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
            except ValueError:
                logger.warning("Could not parse event time: %r %r", date_str, time_str)

        return {
            "league": raw.get("strLeague", ""),
            "home_team": raw.get("strHomeTeam", ""),
            "away_team": raw.get("strAwayTeam", ""),
            "event_time": event_time,
            "external_event_id": raw.get("idEvent"),
            "broadcast_ids": [],
        }


sportsdb_client = TheSportsDBClient()
