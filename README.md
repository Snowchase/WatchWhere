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
- **Regional Filtering** — filter results by country/region to reflect local licensing
- **Freshness Indicators** — shows when availability data was last verified and flags stale records
- **Sports Schedules** — find what channel a game is airing on before it starts
- **Leaving Soon** — surface content expiring from a platform within 30 days
- **Watchlist & Alerts** — save titles and get notified when availability changes
- **Subscription Filter** — declare which services you own; your platforms appear first
- **Category Browsing** — browse by content type, genre, or platform

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | React + TypeScript + Tailwind CSS |
| Mobile App | React Native + Expo |
| Backend API | Python + FastAPI |
| Database | PostgreSQL + Redis |
| Search Engine | PostgreSQL FTS / MeiliSearch |
| Scrapers | Python + Playwright + BeautifulSoup |
| Scheduler | Celery + Celery Beat |
| Notifications | SendGrid (email) + FCM (push) |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

---

## Getting Started

### 1. Clone and configure environment variables

```bash
git clone https://github.com/Snowchase/WatchWhere.git
cd WatchWhere
cp .env.example .env
```

Edit `.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

### 2. Start services with Docker Compose

```bash
docker compose up -d
```

### 3. Run database migrations

```bash
docker compose exec api alembic upgrade head
```

### 4. Start the web frontend

```bash
cd frontend
npm install
npm run dev
```

The API will be available at `http://localhost:8000` and the web app at `http://localhost:5173`.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `WATCHMODE_API_KEY` | [Watchmode API](https://api.watchmode.com/) key — **note:** free tier is capped at 1,000 req/month; a paid tier is required for production | Yes |
| `TMDB_API_KEY` | [TMDB API](https://developer.themoviedb.org/) key — attribution must be displayed on title detail pages per TMDB terms | Yes |
| `SPORTS_DB_API_KEY` | [TheSportsDB](https://www.thesportsdb.com/api.php) API key | For sports features |
| `SENDGRID_API_KEY` | SendGrid API key for email notifications | For notifications |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key | For push notifications |
| `SECRET_KEY` | Secret key for JWT signing | Yes |
| `ANILIST_CLIENT_ID` | AniList OAuth client ID — only needed for user-authenticated AniList mutations; basic anime search uses the public GraphQL API without auth | Optional |

---

## Data Sources

- **Watchmode API** — primary streaming availability (~150 services); free tier capped at 1,000 requests/month — upgrade to a paid plan for production use
- **TMDB API** — movie and TV metadata; attribution required on title detail pages per API terms
- **AniList GraphQL** — anime metadata and streaming links (public API, no auth required for reads)
- **TheSportsDB API** — sports schedules and broadcast channels
- **ESPN feeds** — additional sports schedule data for select leagues
- **JustWatch** *(scraped)* — fallback availability data; scraping is rate-limited, respects `robots.txt`, and uses random delays to avoid overloading their servers; verify compliance with their current ToS before deploying
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

---

## Contributing

1. Fork the repository and create a feature branch from `main`
2. Install pre-commit hooks — the project enforces `ruff` (Python linting), `mypy` (Python type checking), `eslint`, and `tsc` (TypeScript) before each commit
3. Ensure any new API integrations are documented in the Environment Variables table
4. Open a pull request with a description of the change and why it's needed

---

## License

MIT License — see [LICENSE](./LICENSE) for details.
