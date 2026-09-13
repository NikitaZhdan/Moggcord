import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CallParticipant(Base):
    __tablename__ = "call_participants"

    call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("calls.id"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    invited: Mapped[bool] = mapped_column(default=True)

    call: Mapped["Call"] = relationship(back_populates="participants")