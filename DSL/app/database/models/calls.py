import enum
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import DateTime, Enum, ForeignKey, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CallType(str, enum.Enum):
    AUDIO = "audio"
    VIDEO = "video"


class CallStatus(str, enum.Enum):
    RINGING = "ringing"
    ACTIVE = "active"
    ENDED = "ended"
    DECLINED = "declined"
    MISSED = "missed"


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    channel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("channels.id"), nullable=False, index=True
    )
    initiator_id: Mapped[uuid.UUID] = mapped_column(nullable=False)  # из JWT, не FK

    call_type: Mapped[CallType] = mapped_column(
        Enum(CallType, name="call_type", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=CallType.AUDIO,
    )
    status: Mapped[CallStatus] = mapped_column(
        Enum(CallStatus, name="call_status", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=CallStatus.RINGING,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    channel: Mapped["Channel"] = relationship(back_populates="calls")
    participants: Mapped[List["CallParticipant"]] = relationship(
        back_populates="call", cascade="all, delete-orphan"
    )