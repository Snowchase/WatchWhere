from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

# Watchmode stream-type integer → our ENUM mapping
_STREAM_TYPE_MAP: dict[int, str] = {
    1: "subscription",
    2: "free",
    3: "buy",
    4: "rent",
    5: "subscription",  # ad-supported subscription treated as subscription
    6: "broadcast",
}


class WatchmodeClient:
    """Async client for the Watchmode streaming availability API."""

    def __init__(self) -> None:
        self._base_url = settings.watchmode_base_url
        self._api_key = settings.watchmode_api_key
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                params={"apiKey": self._api_key},
                timeout=httpx.Timeout(15.0),
                headers={"Accept": "application/json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _get(self, path: str, **params: Any) -> dict | list:
        client = await self._get_client()
        response = await client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def search_title(self, name: str, type_filter: str = "movie,tv") -> list[dict]:
        """Search Watchmode for a title by name."""
        data = await self._get("/search/", search_field="name", search_value=name, types=type_filter)
        return data.get("title_results", []) if isinstance(data, dict) else []

    async def get_title_sources(
        self,
        watchmode_id: int,
        regions: str = "US",
    ) -> list[dict]:
        """
        Fetch streaming sources for a Watchmode title ID.
        Returns a list of source objects with platform/pricing/type info.
        """
        data = await self._get(f"/title/{watchmode_id}/sources/", regions=regions)
        return data if isinstance(data, list) else []

    async def get_title_details(self, watchmode_id: int) -> dict:
        """Fetch full title details from Watchmode."""
        data = await self._get(f"/title/{watchmode_id}/details/", append_to_response="sources")
        return data if isinstance(data, dict) else {}

    async def list_titles_changed(self, since_unix_ts: int, region: str = "US") -> list[dict]:
        """
        Fetch titles whose availability changed since a Unix timestamp.
        Useful for incremental sync jobs.
        """
        data = await self._get(
            "/list-titles/",
            source_ids="",
            regions=region,
            types="movie,tv",
            release_date_start=since_unix_ts,
        )
        return data.get("titles", []) if isinstance(data, dict) else []

    @staticmethod
    def normalize_source(source: dict, title_id: str, region: str) -> dict:
        """
        Map a Watchmode source dict to our internal availability schema dict.
        `title_id` should be our DB UUID (as string).
        """
        stream_type_int = source.get("type", 1)
        stream_type = _STREAM_TYPE_MAP.get(stream_type_int, "subscription")

        price_raw = source.get("price")
        price = float(price_raw) if price_raw else None

        return {
            "title_id": title_id,
            "platform_id": None,  # caller must resolve slug → UUID
            "platform_slug": source.get("source_id"),
            "region": region,
            "content_url": source.get("web_url", ""),
            "stream_type": stream_type,
            "price": price,
            "available_from": None,
            "available_until": None,
            "source": "watchmode",
        }


watchmode_client = WatchmodeClient()
