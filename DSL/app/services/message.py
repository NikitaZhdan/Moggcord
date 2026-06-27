from fastapi import HTTPException
from uuid import UUID
from datetime import datetime, timezone

from app.repositories import MessageRepository
from app.services import ChannelService
from app.database.models import Message


class MessageService:
    def __init__(
        self, message_repo: MessageRepository, channel_service: ChannelService
    ):
        self.repo = message_repo
        self.channel_service = channel_service

    async def create(self, channel_id: UUID, author_id: UUID, content: str) -> Message:
        await self.channel_service.assert_member(channel_id, author_id)

        content = content.strip()
        if not content:
            raise HTTPException(400, "Message cannot be empty")
        if len(content) > 2000:
            raise HTTPException(400, "Message too long")

        message = Message(channel_id=channel_id, author_id=author_id, content=content)
        return await self.repo.save(message)

    async def get_history(
        self,
        channel_id: UUID,
        user_id: UUID,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[Message]:
        await self.channel_service.assert_member(channel_id, user_id)
        limit = min(limit, 100)
        return await self.repo.get_channel_messages(channel_id, limit, before)

    async def edit(self, message_id: UUID, user_id: UUID, new_content: str) -> Message:
        message = await self._get_or_404(message_id)

        if message.author_id != user_id:
            raise HTTPException(403, "You can only edit your own messages")

        new_content = new_content.strip()
        if not new_content or len(new_content) > 2000:
            raise HTTPException(400, "Invalid content")

        message.content = new_content
        message.edited_at = datetime.now(timezone.utc)
        return await self.repo.save(message)

    async def _get_or_404(self, message_id: UUID) -> Message:
        message = await self.repo.get_by_id(message_id)
        if not message:
            raise HTTPException(404, "Message not found")
        return message

    async def delete(self, message_id: UUID, user_id: UUID) -> None:
        message = await self._get_or_404(message_id)

        if message.author_id != user_id:
            raise HTTPException(404,"You can only delete your own messages")

        await self.repo.delete(message)