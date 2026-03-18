from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PlatformType = Literal["streaming", "cable", "broadcast", "sports"]


class PlatformBase(BaseModel):
    name: str = Field(..., max_length=256)
    slug: str = Field(..., max_length=128, pattern=r"^[a-z0-9-]+$")
    logo_url: str | None = None
    base_url: str | None = None
    type: PlatformType
    is_free: bool = False


class PlatformCreate(PlatformBase):
    pass


class PlatformRead(PlatformBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class PlatformUpdate(BaseModel):
    name: str | None = Field(None, max_length=256)
    slug: str | None = Field(None, max_length=128, pattern=r"^[a-z0-9-]+$")
    logo_url: str | None = None
    base_url: str | None = None
    type: PlatformType | None = None
    is_free: bool | None = None
