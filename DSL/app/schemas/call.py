from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.database.models import CallStatus, CallType


class CallParticipantResponse(BaseModel):
    user_id: UUID
    joined_at: datetime | None
    left_at: datetime | None
    invited: bool

    model_config = {"from_attributes": True}


class CallResponse(BaseModel):
    id: UUID
    channel_id: UUID
    initiator_id: UUID
    call_type: CallType
    status: CallStatus
    started_at: datetime
    ended_at: datetime | None
    participants: list[CallParticipantResponse]

    model_config = {"from_attributes": True}
