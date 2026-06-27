from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChannelCreate(BaseModel):
    channel_name: str


class ChannelResponse(BaseModel):
    id: UUID
    channel_name: str
    created_at: datetime
