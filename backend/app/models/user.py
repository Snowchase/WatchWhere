import uuid
from datetime import datetime

from sqlalchemy import ARRAY, CHAR, TEXT, VARCHAR, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(
        VARCHAR(320), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    region: Mapped[str] = mapped_column(CHAR(2), nullable=False, server_default="US")
    subscriptions: Mapped[list[str]] = mapped_column(
        ARRAY(TEXT), nullable=False, server_default="{}"
    )
    notify_email: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    notify_push: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # Relationships
    watchlist: Mapped[list["Watchlist"]] = relationship(
        "Watchlist", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
