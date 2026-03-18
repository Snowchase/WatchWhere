from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.cache.redis import get_redis_pool, close_redis_pool
from app.config import settings
from app.routers.search import router as search_router
from app.routers.titles import router as titles_router, leaving_soon_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.watchlist import router as watchlist_router
from app.routers.sports import router as sports_router
from app.routers.admin import router as admin_router

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize shared resources on startup, clean up on shutdown."""
    logger.info("Starting up WatchWhere API...")
    # Initialize Redis connection pool
    try:
        await get_redis_pool()
        logger.info("Redis connection pool initialized.")
    except Exception as exc:
        logger.error("Failed to connect to Redis: %s", exc)

    yield

    logger.info("Shutting down WatchWhere API...")
    await close_redis_pool()
    logger.info("Redis connection pool closed.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="WatchWhere API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Attach rate limiter state and handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(search_router)
app.include_router(titles_router)
app.include_router(leaving_soon_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(watchlist_router)
app.include_router(sports_router)
app.include_router(admin_router)

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "NOT_FOUND",
                "message": f"The requested resource was not found: {request.url.path}",
                "status": 404,
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # If the detail is already in our standard error format, pass it through
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": str(exc.status_code),
                "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "status": exc.status_code,
            }
        },
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Simple health probe used by load balancers and orchestration."""
    return {"status": "ok", "version": "1.0.0"}
