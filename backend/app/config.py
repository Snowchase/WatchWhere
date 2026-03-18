from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "WatchWhere API"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "production"

    # Database
    db_user: str = "watchwhere"
    db_password: str = "changeme"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "watchwhere"
    db_pool_size: int = 10
    db_max_overflow: int = 20

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def sync_database_url(self) -> str:
        """Used by Alembic which needs a sync driver."""
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # JWT
    jwt_secret_key: str = "super-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # bcrypt
    bcrypt_rounds: int = 12

    # External APIs
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    watchmode_api_key: str = ""
    watchmode_base_url: str = "https://api.watchmode.com/v1"
    anilist_graphql_url: str = "https://graphql.anilist.co"
    sportsdb_api_key: str = "1"  # free tier
    sportsdb_base_url: str = "https://www.thesportsdb.com/api/v1/json"

    # Rate limiting
    rate_limit_unauthenticated: int = 60   # req/min per IP
    rate_limit_authenticated: int = 300    # req/min per user

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Celery
    celery_broker_url: str = ""
    celery_result_backend: str = ""

    @property
    def celery_broker(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def celery_backend(self) -> str:
        return self.celery_result_backend or self.redis_url


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
