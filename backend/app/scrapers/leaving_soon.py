from __future__ import annotations

"""
Leaving-soon scraper.

Scrapes platform-specific "leaving soon" pages using Playwright + BeautifulSoup4.
Each platform subclass implements `scrape()` and returns a list of LeavingSoonItem.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


@dataclass
class LeavingSoonItem:
    title: str
    available_until: date | None
    content_url: str
    platform_slug: str
    region: str = "US"
    stream_type: str = "subscription"
    extra: dict = field(default_factory=dict)


class BaseLeavingSoonScraper:
    """Base class for platform leaving-soon scrapers."""

    platform_slug: str = ""
    _url: str = ""

    def __init__(self, region: str = "US", headless: bool = True) -> None:
        self._region = region.upper()
        self._headless = headless
        self._browser = None
        self._playwright = None

    async def __aenter__(self) -> "BaseLeavingSoonScraper":
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self._headless)
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def _fetch_html(self, url: str, wait_selector: str = "body") -> str:
        ctx = await self._browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await ctx.new_page()
        await page.route(
            "**/*.{png,jpg,jpeg,gif,webp,woff,woff2,ttf}",
            lambda route: route.abort(),
        )
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_selector(wait_selector, timeout=10_000)
            return await page.content()
        except Exception as exc:
            logger.warning("Failed to fetch %r: %s", url, exc)
            return ""
        finally:
            await page.close()
            await ctx.close()

    async def scrape(self) -> list[LeavingSoonItem]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Netflix scraper (expiring-soon page via Reelgood or similar aggregators)
# ---------------------------------------------------------------------------

class NetflixLeavingSoonScraper(BaseLeavingSoonScraper):
    """
    Scrapes the 'Leaving Netflix' section from a third-party aggregator
    (e.g. What's On Netflix) because Netflix does not expose its own endpoint.
    """

    platform_slug = "netflix"
    _url = "https://www.whats-on-netflix.com/leaving/"

    async def scrape(self) -> list[LeavingSoonItem]:
        html = await self._fetch_html(self._url, wait_selector=".leaving-table")
        if not html:
            return []
        return self._parse(html)

    def _parse(self, html: str) -> list[LeavingSoonItem]:
        soup = BeautifulSoup(html, "html.parser")
        items: list[LeavingSoonItem] = []

        for row in soup.select(".leaving-table tr"):
            cols = row.find_all("td")
            if len(cols) < 3:
                continue

            title_text = cols[0].get_text(strip=True)
            date_text = cols[2].get_text(strip=True)
            link_el: Tag | None = cols[0].find("a")
            content_url = link_el.get("href", "") if link_el else ""

            until = _parse_date(date_text)
            if title_text:
                items.append(
                    LeavingSoonItem(
                        title=title_text,
                        available_until=until,
                        content_url=content_url,
                        platform_slug=self.platform_slug,
                        region=self._region,
                    )
                )

        return items


# ---------------------------------------------------------------------------
# Amazon Prime scraper
# ---------------------------------------------------------------------------

class AmazonPrimeLeavingSoonScraper(BaseLeavingSoonScraper):
    """Scrape titles leaving Amazon Prime Video."""

    platform_slug = "amazon-prime-video"
    _url = "https://www.justwatch.com/us/provider/amazon-prime-video/leaving-soon"

    async def scrape(self) -> list[LeavingSoonItem]:
        html = await self._fetch_html(self._url, wait_selector=".title-list-row__row")
        if not html:
            return []
        return self._parse(html)

    def _parse(self, html: str) -> list[LeavingSoonItem]:
        soup = BeautifulSoup(html, "html.parser")
        items: list[LeavingSoonItem] = []

        for row in soup.select(".title-list-row__row"):
            title_el: Tag | None = row.select_one(".title-list-row__title")
            date_el: Tag | None = row.select_one(".title-list-row__leaving-date")
            link_el: Tag | None = row.select_one("a")

            title_text = title_el.get_text(strip=True) if title_el else ""
            date_text = date_el.get_text(strip=True) if date_el else ""
            content_url = f"https://www.amazon.com{link_el.get('href', '')}" if link_el else ""

            if not title_text:
                continue

            items.append(
                LeavingSoonItem(
                    title=title_text,
                    available_until=_parse_date(date_text),
                    content_url=content_url,
                    platform_slug=self.platform_slug,
                    region=self._region,
                )
            )

        return items


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

SCRAPERS: dict[str, type[BaseLeavingSoonScraper]] = {
    "netflix": NetflixLeavingSoonScraper,
    "amazon-prime-video": AmazonPrimeLeavingSoonScraper,
}


async def scrape_all_leaving_soon(region: str = "US") -> list[LeavingSoonItem]:
    """Run all registered leaving-soon scrapers and aggregate results."""
    results: list[LeavingSoonItem] = []
    for slug, cls in SCRAPERS.items():
        try:
            async with cls(region=region) as scraper:
                items = await scraper.scrape()
                logger.info("Scraped %d leaving-soon items from %s", len(items), slug)
                results.extend(items)
        except Exception as exc:
            logger.error("Leaving-soon scraper %r failed: %s", slug, exc)
    return results


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_date(text: str) -> date | None:
    """Best-effort parse of leaving-date strings like 'January 31' or '2024-01-31'."""
    text = text.strip()
    if not text:
        return None

    # ISO format
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        pass

    # "Month DD, YYYY" or "Month DD"
    match = re.search(
        r"(\b\w+\b)\s+(\d{1,2})(?:,\s*(\d{4}))?", text, re.IGNORECASE
    )
    if match:
        month_str = match.group(1).lower()
        day = int(match.group(2))
        year = int(match.group(3)) if match.group(3) else date.today().year
        month = _MONTH_MAP.get(month_str)
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                pass

    return None
