import uuid
from datetime import date, datetime

from sqlalchemy import (
    CHAR,
    TEXT,
    VARCHAR,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Availability(Base):
    __tablename__ = "availability"

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
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platforms.id", ondelete="CASCADE"),
        nullable=False,
    )
    region: Mapped[str] = mapped_column(CHAR(2), nullable=False)
    content_url: Mapped[str] = mapped_column(TEXT, nullable=False, server_default="")
    stream_type: Mapped[str] = mapped_column(
        Enum(
            "subscription", "rent", "buy", "free", "broadcast",
            name="stream_type_enum",
        ),
        nullable=False,
    )
    price: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    available_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_verified: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    source: Mapped[str] = mapped_column(VARCHAR(64), nullable=False)

    # Relationships
    title: Mapped["Title"] = relationship("Title", back_populates="availability")
    platform: Mapped["Platform"] = relationship("Platform", back_populates="availability")

    __table_args__ = (
        # Composite B-tree on (title_id, region)
        Index("ix_availability_title_region", "title_id", "region"),
        # B-tree on last_verified
        Index("ix_availability_last_verified", "last_verified"),
        # B-tree on available_until (for leaving-soon queries)
        Index("ix_availability_available_until", "available_until"),
    )

    def __repr__(self) -> str:
        return (
            f"<Availability id={self.id} title_id={self.title_id} "
            f"platform_id={self.platform_id} region={self.region}>"
        )
