from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TitleType = Literal["movie", "tv_show", "anime", "sport"]


class TitleBase(BaseModel):
    title: str = Field(..., max_length=512)
    type: TitleType
    tmdb_id: int | None = None
    mal_id: int | None = None
    year: int | None = Field(None, ge=1888, le=2100)
    genres: list[str] = Field(default_factory=list)
    description: str | None = None
    poster_url: str | None = None
    imdb_id: str | None = Field(None, max_length=20)


class TitleCreate(TitleBase):
    pass


class TitleRead(TitleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TitleSummary(BaseModel):
    """Lightweight title representation used in search results."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    type: TitleType
    year: int | None = None
    poster_url: str | None = None
    genres: list[str] = Field(default_factory=list)


class TitleUpdate(BaseModel):
    title: str | None = Field(None, max_length=512)
    type: TitleType | None = None
    tmdb_id: int | None = None
    mal_id: int | None = None
    year: int | None = Field(None, ge=1888, le=2100)
    genres: list[str] | None = None
    description: str | None = None
    poster_url: str | None = None
    imdb_id: str | None = Field(None, max_length=20)
