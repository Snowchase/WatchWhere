from __future__ import annotations

"""
JustWatch Playwright scraper.

Uses a headless Chromium browser to scrape streaming availability data
from JustWatch when API sources (Watchmode, etc.) have gaps.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

_JUSTWATCH_BASE = "https://www.justwatch.com"


@dataclass
class JustWatchOffer:
    platform_name: str
    stream_type: str  # subscription | rent | buy | free
    price: float | None
    content_url: str
    currency: str = "USD"


@dataclass
class JustWatchResult:
    title: str
    year: int | None
    offers: list[JustWatchOffer] = field(default_factory=list)
    poster_url: str | None = None


class JustWatchScraper:
    """
    Playwright-based scraper for JustWatch title pages.

    Usage (within an async context):
        async with JustWatchScraper() as scraper:
            results = await scraper.search("Inception", region="us")
            offers = await scraper.get_offers("/us/movie/inception")
    """

    def __init__(self, headless: bool = True, region: str = "us") -> None:
        self._headless = headless
        self._region = region.lower()
        self._browser = None
        self._playwright = None

    async def __aenter__(self) -> "JustWatchScraper":
        await self._start()
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self._stop()

    async def _start(self) -> None:
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self._headless)
        logger.info("JustWatch scraper browser started (headless=%s)", self._headless)

    async def _stop(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("JustWatch scraper browser stopped")

    async def _new_page(self):
        ctx = await self._browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await ctx.new_page()
        # Block images and fonts for speed
        await page.route(
            "**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,otf}",
            lambda route: route.abort(),
        )
        return page

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def search(self, query: str, region: str | None = None) -> list[dict]:
        """
        Search JustWatch for a title and return a list of result dicts with
        keys: title, year, path, poster_url.
        """
        region = (region or self._region).lower()
        url = f"{_JUSTWATCH_BASE}/{region}/search?q={query.replace(' ', '+')}"

        page = await self._new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_selector(".title-list-row__row", timeout=10_000)
            html = await page.content()
        except Exception as exc:
            logger.warning("JustWatch search failed for %r: %s", query, exc)
            return []
        finally:
            await page.close()

        return self._parse_search_results(html, region)

    async def get_offers(self, path: str) -> list[JustWatchOffer]:
        """
        Given a JustWatch title path (e.g. /us/movie/inception), scrape
        the available streaming offers from that page.
        """
        url = f"{_JUSTWATCH_BASE}{path}"
        page = await self._new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_selector(".buybox-row", timeout=10_000)
            html = await page.content()
        except Exception as exc:
            logger.warning("JustWatch offer scrape failed for %r: %s", path, exc)
            return []
        finally:
            await page.close()

        return self._parse_offers(html)

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_search_results(html: str, region: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        results: list[dict] = []

        for row in soup.select(".title-list-row__row"):
            title_el: Tag | None = row.select_one(".title-list-row__title")
            link_el: Tag | None = row.select_one("a.title-list-row__row")
            img_el: Tag | None = row.select_one("img.title-card-poster")
            year_el: Tag | None = row.select_one(".title-list-row__year")

            if not title_el:
                continue

            title_text = title_el.get_text(strip=True)
            path = link_el.get("href", "") if link_el else ""
            poster = img_el.get("src") if img_el else None
            year_text = year_el.get_text(strip=True) if year_el else ""
            year: int | None = None
            if year_text.isdigit():
                year = int(year_text)

            results.append(
                {
                    "title": title_text,
                    "year": year,
                    "path": path,
                    "poster_url": poster,
                }
            )

        return results

    @staticmethod
    def _parse_offers(html: str) -> list[JustWatchOffer]:
        soup = BeautifulSoup(html, "html.parser")
        offers: list[JustWatchOffer] = []

        # Map CSS class / section label → stream type
        _section_map = {
            "stream": "subscription",
            "buy": "buy",
            "rent": "rent",
            "free": "free",
        }

        for section in soup.select(".buybox-row"):
            label_el: Tag | None = section.select_one(".buybox-row__label")
            label_text = label_el.get_text(strip=True).lower() if label_el else ""
            stream_type = _section_map.get(label_text, "subscription")

            for offer in section.select(".offer"):
                link: Tag | None = offer.select_one("a")
                name_el: Tag | None = offer.select_one("img")
                price_el: Tag | None = offer.select_one(".offer__price-label")

                content_url = link.get("href", "") if link else ""
                platform_name = name_el.get("alt", "unknown") if name_el else "unknown"

                price: float | None = None
                if price_el:
                    price_text = price_el.get_text(strip=True)
                    match = re.search(r"[\d.]+", price_text)
                    if match:
                        try:
                            price = float(match.group())
                        except ValueError:
                            pass

                offers.append(
                    JustWatchOffer(
                        platform_name=platform_name,
                        stream_type=stream_type,
                        price=price,
                        content_url=content_url,
                    )
                )

        return offers
