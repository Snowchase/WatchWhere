from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


class TMDBClient:
    """Async client for The Movie Database (TMDB) REST API v3."""

    def __init__(self) -> None:
        self._base_url = settings.tmdb_base_url
        self._api_key = settings.tmdb_api_key
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                params={"api_key": self._api_key},
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
        response = await client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def search_movie(self, query: str, year: int | None = None) -> list[dict]:
        """Search TMDB for movies matching `query`."""
        params: dict[str, Any] = {"query": query}
        if year:
            params["year"] = year
        data = await self._get("/search/movie", **params)
        return data.get("results", [])

    async def search_tv(self, query: str) -> list[dict]:
        """Search TMDB for TV shows matching `query`."""
        data = await self._get("/search/tv", query=query)
        return data.get("results", [])

    async def get_movie(self, tmdb_id: int) -> dict:
        """Fetch full movie details including genres."""
        return await self._get(f"/movie/{tmdb_id}", append_to_response="external_ids")

    async def get_tv(self, tmdb_id: int) -> dict:
        """Fetch full TV show details including genres."""
        return await self._get(f"/tv/{tmdb_id}", append_to_response="external_ids")

    async def get_movie_credits(self, tmdb_id: int) -> dict:
        return await self._get(f"/movie/{tmdb_id}/credits")

    async def get_trending(self, media_type: str = "all", time_window: str = "week") -> list[dict]:
        """Fetch trending titles (media_type: all|movie|tv, time_window: day|week)."""
        data = await self._get(f"/trending/{media_type}/{time_window}")
        return data.get("results", [])

    @staticmethod
    def poster_url(poster_path: str | None) -> str | None:
        if not poster_path:
            return None
        return f"{_TMDB_IMAGE_BASE}{poster_path}"

    @staticmethod
    def normalize_movie(raw: dict) -> dict:
        """Map a TMDB movie result to our internal title schema dict."""
        return {
            "title": raw.get("title") or raw.get("original_title", ""),
            "type": "movie",
            "tmdb_id": raw.get("id"),
            "year": int(raw["release_date"][:4]) if raw.get("release_date") else None,
            "genres": [g["name"] for g in raw.get("genres", [])],
            "description": raw.get("overview"),
            "poster_url": TMDBClient.poster_url(raw.get("poster_path")),
            "imdb_id": raw.get("external_ids", {}).get("imdb_id") or raw.get("imdb_id"),
        }

    @staticmethod
    def normalize_tv(raw: dict) -> dict:
        """Map a TMDB TV result to our internal title schema dict."""
        return {
            "title": raw.get("name") or raw.get("original_name", ""),
            "type": "tv_show",
            "tmdb_id": raw.get("id"),
            "year": int(raw["first_air_date"][:4]) if raw.get("first_air_date") else None,
            "genres": [g["name"] for g in raw.get("genres", [])],
            "description": raw.get("overview"),
            "poster_url": TMDBClient.poster_url(raw.get("poster_path")),
            "imdb_id": raw.get("external_ids", {}).get("imdb_id"),
        }


tmdb_client = TMDBClient()
