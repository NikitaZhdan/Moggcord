from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: UUID
    channel_id: UUID
    author_id: UUID
    content: str
    created_at: datetime
    edited_at: datetime | None
