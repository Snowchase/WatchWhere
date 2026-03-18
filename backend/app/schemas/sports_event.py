from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.availability import AvailabilityRead


class SportsEventCreate(BaseModel):
    title_id: uuid.UUID
    league: str = Field(..., max_length=128)
    home_team: str = Field(..., max_length=128)
    away_team: str = Field(..., max_length=128)
    event_time: datetime
    broadcast_ids: list[uuid.UUID] = Field(default_factory=list)
    external_event_id: str | None = Field(None, max_length=128)


class SportsEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title_id: uuid.UUID
    league: str
    home_team: str
    away_team: str
    event_time: datetime
    broadcast_ids: list[uuid.UUID]
    external_event_id: str | None = None
    broadcast_platforms: list[AvailabilityRead] = Field(default_factory=list)
