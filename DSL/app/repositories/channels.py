from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID

from app.database.models import Channel, ChannelMember


class ChannelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, channel_id: UUID) -> Channel | None:
        result = await self.session.execute(
            select(Channel).where(Channel.id == channel_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Channel | None:
        result = await self.session.execute(
            select(Channel).where(Channel.channel_name == name)
        )
        return result.scalar_one_or_none()

    async def get_user_channels(self, user_id: UUID) -> list[Channel]:
        result = await self.session.execute(
            select(Channel)
            .join(ChannelMember, ChannelMember.channel_id == Channel.id)
            .where(ChannelMember.user_id == user_id)
            .order_by(Channel.created_at.desc())
        )
        return result.scalars().all()

    async def save(self, channel: Channel) -> Channel:
        self.session.add(channel)
        await self.session.flush()
        await self.session.refresh(channel)
        return channel

    async def get_member(self, channel_id: UUID, user_id: UUID) -> ChannelMember | None:
        result = await self.session.execute(
            select(ChannelMember).where(
                and_(
                    ChannelMember.channel_id == channel_id,
                    ChannelMember.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def save_member(self, member: ChannelMember) -> None:
        self.session.add(member)
        await self.session.flush()

    async def delete_member(self, member: ChannelMember) -> None:
        await self.session.delete(member)
        await self.session.flush()
