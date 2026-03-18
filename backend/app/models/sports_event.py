import uuid
from datetime import datetime

from sqlalchemy import ARRAY, VARCHAR, DateTime, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SportsEvent(Base):
    __tablename__ = "sports_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("titles.id", ondelete="CASCADE"),
        nullable=False,
    )
    league: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    home_team: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    away_team: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    broadcast_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, server_default="{}"
    )
    external_event_id: Mapped[str | None] = mapped_column(
        VARCHAR(128), nullable=True, index=True
    )

    # Relationships
    title: Mapped["Title"] = relationship("Title", back_populates="sports_events")

    __table_args__ = (
        Index("ix_sports_events_event_time", "event_time"),
        Index("ix_sports_events_title_id", "title_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<SportsEvent id={self.id} league={self.league!r} "
            f"home={self.home_team!r} away={self.away_team!r}>"
        )
