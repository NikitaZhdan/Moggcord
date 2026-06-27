from fastapi import APIRouter, Depends
from uuid import UUID
from datetime import datetime

from app.schemas.channel import ChannelCreate, ChannelResponse
from app.schemas.message import MessageResponse
from app.services import ChannelService, MessageService

from app.dependencies import get_channel_service, get_message_service, get_current_user

router = APIRouter(prefix="/channels", tags=["channels"])


@router.post("/", response_model=ChannelResponse, status_code=201)
async def create_channel(
    data: ChannelCreate,
    service: ChannelService = Depends(get_channel_service),
    user_id: UUID = Depends(get_current_user),
):
    return await service.create(channel_name=data.channel_name, created_by=user_id)


@router.get("/", response_model=list[ChannelResponse])
async def list_my_channels(
    service: ChannelService = Depends(get_channel_service),
    user_id: UUID = Depends(get_current_user),
):
    return await service.get_user_channels(user_id)


@router.post("/{channel_id}/join", status_code=204)
async def join_channel(
    channel_id: UUID,
    service: ChannelService = Depends(get_channel_service),
    user_id: UUID = Depends(get_current_user),
):
    await service.join(channel_id=channel_id, user_id=user_id)


@router.post("/{channel_id}/leave", status_code=204)
async def leave_channel(
    channel_id: UUID,
    service: ChannelService = Depends(get_channel_service),
    user_id: UUID = Depends(get_current_user),
):
    await service.leave(channel_id=channel_id, user_id=user_id)


@router.get("/{channel_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    channel_id: UUID,
    limit: int = 50,
    before: datetime | None = None,
    service: MessageService = Depends(get_message_service),
    user_id: UUID = Depends(get_current_user),
):
    return await service.get_history(
        channel_id=channel_id, user_id=user_id, limit=limit, before=before
    )
