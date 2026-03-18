from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

_bearer = HTTPBearer(auto_error=False)

# Token types
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(subject: str | uuid.UUID) -> str:
    """Create a short-lived JWT access token."""
    now = _utc_now()
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": str(subject),
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str | uuid.UUID) -> str:
    """Create a long-lived JWT refresh token stored in an HttpOnly cookie."""
    now = _utc_now()
    expire = now + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": str(subject),
        "type": REFRESH_TOKEN_TYPE,
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode_token(token: str, expected_type: str) -> dict:
    """Decode and validate a JWT, raising HTTP 401 on any failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "INVALID_TOKEN", "message": "Could not validate credentials", "status": 401}},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise credentials_exception

    token_type: str | None = payload.get("type")
    if token_type != expected_type:
        raise credentials_exception

    sub: str | None = payload.get("sub")
    if not sub:
        raise credentials_exception

    return payload


def verify_access_token(token: str) -> dict:
    return _decode_token(token, ACCESS_TOKEN_TYPE)


def verify_refresh_token(token: str) -> dict:
    return _decode_token(token, REFRESH_TOKEN_TYPE)


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> uuid.UUID:
    """FastAPI dependency — extracts and validates Bearer token, returns user UUID."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "MISSING_TOKEN", "message": "Authentication required", "status": 401}},
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_access_token(credentials.credentials)
    try:
        return uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Malformed token subject", "status": 401}},
        )


# Typed annotation for router signatures
CurrentUserID = Annotated[uuid.UUID, Depends(get_current_user_id)]
