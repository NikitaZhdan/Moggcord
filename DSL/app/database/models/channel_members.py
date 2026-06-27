import uuid

from sqlalchemy import DateTime, ForeignKey, UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base



class ChannelMember(Base):
    __tablename__ = "channel_members"

    channel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("channels.id"), primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  
        default=lambda: datetime.now(timezone.utc)
    )

    channel: Mapped["Channel"] = relationship(back_populates="channel_members")
