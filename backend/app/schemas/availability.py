from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.platform import PlatformRead


StreamType = Literal["subscription", "rent", "buy", "free", "broadcast"]


class AvailabilityBase(BaseModel):
    title_id: uuid.UUID
    platform_id: uuid.UUID
    region: str = Field(..., min_length=2, max_length=2)
    content_url: str = ""
    stream_type: StreamType
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    available_from: date | None = None
    available_until: date | None = None
    source: str = Field(..., max_length=64)


class AvailabilityCreate(AvailabilityBase):
    pass


class AvailabilityRead(AvailabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    last_verified: datetime
    platform: PlatformRead | None = None


class AvailabilityUpdate(BaseModel):
    content_url: str | None = None
    stream_type: StreamType | None = None
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    available_from: date | None = None
    available_until: date | None = None
    source: str | None = Field(None, max_length=64)
