from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_SEARCH_QUERY = """
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage total }
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large }
      startDate { year }
      genres
      averageScore
      episodes
      status
      externalLinks { site url }
    }
  }
}
"""

_BY_ID_QUERY = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    description(asHtml: false)
    coverImage { large }
    startDate { year }
    genres
    averageScore
    episodes
    status
    externalLinks { site url }
    streamingEpisodes { title thumbnail url site }
  }
}
"""


class AniListClient:
    """Async GraphQL client for the AniList anime database."""

    def __init__(self) -> None:
        self._url = settings.anilist_graphql_url
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(15.0),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _query(self, query: str, variables: dict[str, Any]) -> dict:
        client = await self._get_client()
        response = await client.post(
            self._url,
            json={"query": query, "variables": variables},
        )
        response.raise_for_status()
        data = response.json()
        if "errors" in data:
            raise RuntimeError(f"AniList GraphQL error: {data['errors']}")
        return data.get("data", {})

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def search_anime(
        self, query: str, page: int = 1, per_page: int = 20
    ) -> list[dict]:
        """Search AniList for anime matching `query`."""
        data = await self._query(
            _SEARCH_QUERY,
            {"search": query, "page": page, "perPage": per_page},
        )
        return data.get("Page", {}).get("media", [])

    async def get_anime(self, mal_id: int) -> dict:
        """Fetch a single anime entry by its AniList/MAL ID."""
        data = await self._query(_BY_ID_QUERY, {"id": mal_id})
        return data.get("Media", {})

    @staticmethod
    def _preferred_title(title: dict) -> str:
        return title.get("english") or title.get("romaji") or title.get("native") or ""

    @staticmethod
    def normalize(raw: dict) -> dict:
        """Map an AniList media object to our internal title schema dict."""
        title_obj = raw.get("title", {})
        cover = raw.get("coverImage", {})
        start_date = raw.get("startDate", {})
        return {
            "title": AniListClient._preferred_title(title_obj),
            "type": "anime",
            "mal_id": raw.get("id"),
            "year": start_date.get("year"),
            "genres": raw.get("genres", []),
            "description": raw.get("description"),
            "poster_url": cover.get("large"),
            "tmdb_id": None,
            "imdb_id": None,
        }

    @staticmethod
    def streaming_links(raw: dict) -> list[dict]:
        """Extract streaming episode links from an AniList media object."""
        return raw.get("streamingEpisodes", [])


anilist_client = AniListClient()
