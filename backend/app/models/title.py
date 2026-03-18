import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    SMALLINT,
    TEXT,
    VARCHAR,
    DateTime,
    Enum,
    Index,
    Integer,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Title(Base):
    __tablename__ = "titles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(VARCHAR(512), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("movie", "tv_show", "anime", "sport", name="title_type_enum"),
        nullable=False,
    )
    tmdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    mal_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    year: Mapped[int | None] = mapped_column(SMALLINT, nullable=True)
    genres: Mapped[list[str]] = mapped_column(ARRAY(TEXT), nullable=False, server_default="{}")
    description: Mapped[str | None] = mapped_column(TEXT, nullable=True)
    poster_url: Mapped[str | None] = mapped_column(TEXT, nullable=True)
    imdb_id: Mapped[str | None] = mapped_column(VARCHAR(20), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=datetime.utcnow,
    )

    # Relationships
    availability: Mapped[list["Availability"]] = relationship(
        "Availability", back_populates="title", cascade="all, delete-orphan"
    )
    watchlist_entries: Mapped[list["Watchlist"]] = relationship(
        "Watchlist", back_populates="title", cascade="all, delete-orphan"
    )
    sports_events: Mapped[list["SportsEvent"]] = relationship(
        "SportsEvent", back_populates="title", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # GIN index for full-text search on title column
        Index(
            "ix_titles_title_gin",
            text("to_tsvector('english', title)"),
            postgresql_using="gin",
        ),
        # B-tree index on type
        Index("ix_titles_type", "type"),
    )

    def __repr__(self) -> str:
        return f"<Title id={self.id} title={self.title!r} type={self.type}>"
