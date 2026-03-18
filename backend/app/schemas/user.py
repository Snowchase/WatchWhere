from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    region: str = Field("US", min_length=2, max_length=2)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    region: str
    subscriptions: list[str]
    notify_email: bool
    notify_push: bool
    created_at: datetime


class UserUpdate(BaseModel):
    region: str | None = Field(None, min_length=2, max_length=2)
    subscriptions: list[str] | None = None
    notify_email: bool | None = None
    notify_push: bool | None = None
    password: str | None = Field(None, min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
