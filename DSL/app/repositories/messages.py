from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from app.database.models import Message


class MessageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, message_id: UUID) -> Message | None:
        result = await self.session.execute(
            select(Message).where(Message.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_channel_messages(
        self, channel_id: UUID, limit: int, before: datetime | None
    ) -> list[Message]:
        query = select(Message).where(Message.channel_id == channel_id)

        if before:
            query = query.where(Message.created_at < before)

        query = query.order_by(Message.created_at.desc()).limit(limit)

        result = await self.session.execute(query)
        messages = result.scalars().all()
        return list(reversed(messages))

    async def save(self, message: Message) -> Message:
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def delete(self, message: Message) -> None:
        await self.session.delete(message)
        await self.session.flush()