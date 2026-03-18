# WatchWhere 📺

> Find exactly where to watch any movie, show, anime, or live sport — across every streaming service and broadcast channel, always up to date.

---

## What It Does

Streaming availability changes constantly. WatchWhere maintains a continuously refreshed database of what's on where, so you can search any title and instantly see every platform currently hosting it — with direct links to watch.

Supports **movies**, **TV shows**, **anime**, and **live sports**.

---

## Core Features

- **Universal Search** — one search covers all content types and platforms
- **Multi-Platform Results** — see every service (Netflix, Hulu, Max, Prime, etc.) at once, including rent/buy options
- **Sports Schedules** — find what channel a game is airing on before it starts
- **Leaving Soon** — surface content expiring from a platform within 30 days
- **Watchlist & Alerts** — save titles and get notified when availability changes
- **Subscription Filter** — declare which services you own; your platforms appear first

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | React + TypeScript + Tailwind CSS |
| Mobile App | React Native + Expo |
| Backend API | Python + FastAPI |
| Database | PostgreSQL + Redis |
| Scrapers | Python + Playwright + BeautifulSoup |
| Scheduler | Celery + Celery Beat |
| Notifications | SendGrid (email) + FCM (push) |

---

## Data Sources

- **Watchmode API** — primary streaming availability (~150 services)
- **TMDB API** — movie and TV metadata
- **AniList GraphQL** — anime metadata and streaming links
- **TheSportsDB API** — sports schedules and broadcast channels
- **JustWatch** *(scraped)* — fallback availability data
- **Platform pages** *(scraped)* — expiry dates for leaving-soon content

---

## Architecture Overview

```
[External APIs + Scrapers]
         ↓  (Celery ETL jobs, scheduled)
    [PostgreSQL]  ←→  [Redis Cache]
         ↓
    [FastAPI REST API]
         ↓
 [React Web]  [React Native Mobile]
```

---

## Roadmap

| Phase | Focus |
|---|---|
| 1 — MVP | Search, availability display, TMDB + Watchmode integration |
| 2 — Content Types | Sports schedules, anime via AniList |
| 3 — Accounts | Auth, watchlist, email notifications |
| 4 — Scrapers | JustWatch scraper, leaving-soon pipeline, admin dashboard |
| 5 — Mobile | React Native app, push notifications, App Store + Play Store |
| 6 — Scale | International regions, MeiliSearch, browser extension |

---

## Documentation

Full architecture, database schema, API reference, and pipeline design are covered in [`WatchWhere_SDS.docx`](./WatchWhere_SDS.docx).
