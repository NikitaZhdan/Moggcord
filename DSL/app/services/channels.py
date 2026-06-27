from fastapi import HTTPException
from uuid import UUID

from app.repositories import ChannelRepository
from app.database.models import Channel, ChannelMember


class ChannelService:
    def __init__(self, channel_repo: ChannelRepository):
        self.repo = channel_repo

    async def create(self, channel_name: str, created_by: UUID) -> Channel:
        if await self.repo.get_by_name(channel_name):
            raise HTTPException(400, "Channel name already taken")

        channel = Channel(channel_name=channel_name)
        await self.repo.save(channel)

        member = ChannelMember(channel_id=channel.id, user_id=created_by)
        await self.repo.save_member(member)

        return channel

    async def get_user_channels(self, user_id: UUID) -> list[Channel]:
        return await self.repo.get_user_channels(user_id)

    async def join(self, channel_id: UUID, user_id: UUID) -> None:
        await self._get_or_404(channel_id)

        if await self.repo.get_member(channel_id, user_id):
            return

        member = ChannelMember(channel_id=channel_id, user_id=user_id)
        await self.repo.save_member(member)

    async def leave(self, channel_id: UUID, user_id: UUID) -> None:
        await self._get_or_404(channel_id)

        member = await self.repo.get_member(channel_id, user_id)
        if member:
            await self.repo.delete_member(member)

    async def assert_member(self, channel_id: UUID, user_id: UUID) -> None:
        member = await self.repo.get_member(channel_id, user_id)
        if not member:
            raise HTTPException(403, "You are not a member of this channel")

    async def _get_or_404(self, channel_id: UUID) -> Channel:
        channel = await self.repo.get_by_id(channel_id)
        if not channel:
            raise HTTPException(404, "Channel not found")
        return channel
