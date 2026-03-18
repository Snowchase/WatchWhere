import uuid

from sqlalchemy import TEXT, VARCHAR, Boolean, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(VARCHAR(256), nullable=False)
    slug: Mapped[str] = mapped_column(VARCHAR(128), nullable=False, unique=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(TEXT, nullable=True)
    base_url: Mapped[str | None] = mapped_column(TEXT, nullable=True)
    type: Mapped[str] = mapped_column(
        Enum("streaming", "cable", "broadcast", "sports", name="platform_type_enum"),
        nullable=False,
    )
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # Relationships
    availability: Mapped[list["Availability"]] = relationship(
        "Availability", back_populates="platform", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Platform id={self.id} slug={self.slug!r}>"
