import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Watchlist(Base):
    __tablename__ = "watchlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("titles.id", ondelete="CASCADE"),
        nullable=False,
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    alert_on_add: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    alert_on_remove: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="watchlist")
    title: Mapped["Title"] = relationship("Title", back_populates="watchlist_entries")

    __table_args__ = (
        Index("ix_watchlist_user_id", "user_id"),
        Index("uq_watchlist_user_title", "user_id", "title_id", unique=True),
    )

    def __repr__(self) -> str:
        return f"<Watchlist id={self.id} user_id={self.user_id} title_id={self.title_id}>"
