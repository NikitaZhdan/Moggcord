from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import Call, CallParticipant, CallStatus


class CallRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, call_id: UUID) -> Call | None:
        result = await self.session.execute(
            select(Call)
            .options(selectinload(Call.participants))
            .where(Call.id == call_id)
        )
        return result.scalar_one_or_none()

    async def get_active_call_for_channel(self, channel_id: UUID) -> Call | None:
        result = await self.session.execute(
            select(Call)
            .options(selectinload(Call.participants))
            .where(
                and_(
                    Call.channel_id == channel_id,
                    Call.status.in_([CallStatus.RINGING, CallStatus.ACTIVE]),
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_channel_history(self, channel_id: UUID, limit: int = 50) -> list[Call]:
        result = await self.session.execute(
            select(Call)
            .options(selectinload(Call.participants))
            .where(Call.channel_id == channel_id)
            .order_by(Call.started_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def save(self, call: Call) -> Call:
        self.session.add(call)
        await self.session.flush()
        await self.session.refresh(call)
        return call

    def get_participant(self, call: Call, user_id: UUID) -> CallParticipant | None:
        return next((p for p in call.participants if p.user_id == user_id), None)

    async def save_participant(self, participant: CallParticipant) -> None:
        self.session.add(participant)
        await self.session.flush()
