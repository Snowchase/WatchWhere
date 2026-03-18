from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.title import TitleSummary


class WatchlistCreate(BaseModel):
    title_id: uuid.UUID
    alert_on_add: bool = True
    alert_on_remove: bool = True


class WatchlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title_id: uuid.UUID
    added_at: datetime
    alert_on_add: bool
    alert_on_remove: bool
    title: TitleSummary | None = None


class WatchlistUpdate(BaseModel):
    alert_on_add: bool | None = None
    alert_on_remove: bool | None = None
