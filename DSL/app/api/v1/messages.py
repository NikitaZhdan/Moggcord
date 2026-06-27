from fastapi import APIRouter, Depends
from uuid import UUID

from app.schemas.message import MessageUpdate, MessageResponse
from app.services import MessageService
from app.dependencies import get_message_service, get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


@router.patch("/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: UUID,
    data: MessageUpdate,
    service: MessageService = Depends(get_message_service),
    user_id: UUID = Depends(get_current_user),
):
    return await service.edit(
        message_id=message_id, user_id=user_id, new_content=data.content
    )


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id: UUID,
    service: MessageService = Depends(get_message_service),
    user_id: UUID = Depends(get_current_user),
):
    await service.delete(message_id=message_id, user_id=user_id)
