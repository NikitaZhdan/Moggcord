from typing import List

from sqlalchemy import UUID, DateTime
import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from datetime import datetime, timezone


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    channel_name: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    messages: Mapped[List["Message"]] = relationship(back_populates="channel")
    channel_members: Mapped[List["ChannelMember"]] = relationship(back_populates="channel")
    calls: Mapped[List["Call"]] = relationship(back_populates="channel")
