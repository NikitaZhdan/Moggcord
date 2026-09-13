from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException

from app.database.models import Call, CallParticipant, CallStatus, CallType
from app.repositories import CallRepository
from app.services import ChannelService


class CallService:
    def __init__(self, call_repo: CallRepository, channel_service: ChannelService):
        self.repo = call_repo
        self.channel_service = channel_service

    async def invite(
        self, channel_id: UUID, initiator_id: UUID, call_type: CallType
    ) -> Call:
        await self.channel_service.assert_member(channel_id, initiator_id)

        existing = await self.repo.get_active_call_for_channel(channel_id)
        if existing:
            raise HTTPException(409, "Call already in progress in this channel")

        now = datetime.now(timezone.utc)
        call = Call(
            channel_id=channel_id,
            initiator_id=initiator_id,
            call_type=call_type,
            status=CallStatus.RINGING,
        )
        await self.repo.save(call)

        await self.repo.save_participant(
            CallParticipant(
                call_id=call.id, user_id=initiator_id, joined_at=now, invited=False
            )
        )

        member_ids = await self.channel_service.get_member_ids(channel_id)
        for member_id in member_ids:
            if member_id == initiator_id:
                continue
            await self.repo.save_participant(
                CallParticipant(call_id=call.id, user_id=member_id, invited=True)
            )

        return await self._get_or_404(call.id)

    async def accept(self, call_id: UUID, user_id: UUID) -> Call:
        call = await self._get_or_404(call_id)
        await self.channel_service.assert_member(call.channel_id, user_id)

        if call.status not in (CallStatus.RINGING, CallStatus.ACTIVE):
            raise HTTPException(409, f"Call is not joinable (status={call.status})")

        participant = self.repo.get_participant(call, user_id)
        if participant is None:
            participant = CallParticipant(call_id=call.id, user_id=user_id, invited=True)

        participant.joined_at = datetime.now(timezone.utc)
        participant.left_at = None
        await self.repo.save_participant(participant)

        call.status = CallStatus.ACTIVE
        await self.repo.save(call)

        return call

    async def leave(self, call_id: UUID, user_id: UUID) -> Call:
        call = await self._get_or_404(call_id)

        participant = self.repo.get_participant(call, user_id)
        now = datetime.now(timezone.utc)

        was_active_participant = bool(participant and participant.joined_at)

        if participant:
            participant.left_at = now
            await self.repo.save_participant(participant)

        if user_id == call.initiator_id and call.status == CallStatus.RINGING:
            call.status = CallStatus.MISSED
            call.ended_at = now
            await self.repo.save(call)
            return call

        pending = [
            p for p in call.participants
            if p.invited and p.joined_at is None and p.left_at is None
        ]
        active = [p for p in call.participants if p.joined_at and not p.left_at]

        if pending or len(active) > 1:
            return call

        if call.status == CallStatus.RINGING:
            call.status = (
                CallStatus.MISSED if was_active_participant else CallStatus.DECLINED
            )
        else:
            call.status = CallStatus.ENDED

        call.ended_at = now
        await self.repo.save(call)

        return call

    async def get_history(self, channel_id: UUID, user_id: UUID, limit: int = 50) -> list[Call]:
        await self.channel_service.assert_member(channel_id, user_id)
        return await self.repo.get_channel_history(channel_id, limit=min(limit, 100))

    async def _get_or_404(self, call_id: UUID) -> Call:
        call = await self.repo.get_by_id(call_id)
        if not call:
            raise HTTPException(404, "Call not found")
        return call
