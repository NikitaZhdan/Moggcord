from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from jose import jwt, JWTError
import base64
from app.core.config import settings
from app.database.database import new_session
from app.database.models import Call, CallType
from app.websocket.manager import manager
from app.repositories import ChannelRepository, MessageRepository, CallRepository
from app.services import ChannelService, MessageService, CallService
from app.schemas.call import CallResponse
from app.dependencies import get_current_user

def _signing_key() -> bytes:
    return base64.b64decode(settings.JWT_SECRET)


def _get_user_id_from_token(token: str) -> UUID:
    try:
        payload = jwt.decode(
            token, _signing_key(), algorithms=["HS512"]
        )
        user_id = payload.get("uid")
        username = payload.get("sub")
        user_data = {"username": username, "user_id": UUID(user_id)}
        if not user_id:
            raise ValueError("No uid in token")
        return user_data
    except (JWTError, ValueError) as e:
        raise ValueError(f"Invalid token: {e}")


def _call_payload(event_type: str, call: Call) -> dict:
    return {"type": event_type, "call": CallResponse.model_validate(call).model_dump(mode="json")}


async def websocket_endpoint(
    websocket: WebSocket,
    channel_id: UUID,
    token: str,
) -> None:

    try:
        user_data = _get_user_id_from_token(token)
        user_id = user_data["user_id"]
        username = user_data["username"]
    except ValueError:
        await websocket.close(code=4001)
        return

    async with new_session() as session:
        channel_repo = ChannelRepository(session)
        message_repo = MessageRepository(session)
        call_repo = CallRepository(session)
        channel_service = ChannelService(channel_repo)
        message_service = MessageService(message_repo, channel_service)
        call_service = CallService(call_repo, channel_service)
        try:
            await channel_service.assert_member(channel_id, user_id)
        except Exception:
            await websocket.close(code=4003)
            return

        await manager.connect(websocket, channel_id, user_id)

        await manager.broadcast(
            channel_id,
            {"type": "user_joined", "user_id": str(user_id)},
            exclude=websocket,
        )

        try:
            while True:
                data = await websocket.receive_json()
                await _handle_message(
                    data=data,
                    websocket=websocket,
                    channel_id=channel_id,
                    username=username,
                    user_id=user_id,
                    message_service=message_service,
                    call_service=call_service,
                    session=session,
                )

        except WebSocketDisconnect:
            manager.disconnect(websocket, channel_id, user_id)

            await manager.broadcast(
                channel_id, {"type": "user_left", "user_id": str(user_id)}
            )
            await _leave_any_active_call(channel_id, user_id, call_service, session)


async def _leave_any_active_call(
    channel_id: UUID, user_id: UUID, call_service: CallService, session: AsyncSession
) -> None:
    try:
        active_call = await call_service.repo.get_active_call_for_channel(channel_id)
        if not active_call:
            return
        participant = call_service.repo.get_participant(active_call, user_id)
        if not participant or participant.left_at:
            return

        call = await call_service.leave(active_call.id, user_id)
        await session.commit()
        await manager.broadcast(channel_id, _call_payload("call.left", call))
    except Exception:
        await session.rollback()


async def _handle_message(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    username: str,
    user_id: UUID,
    message_service: MessageService,
    call_service: CallService,
    session: AsyncSession,
) -> None:

    event_type = data.get("type")

    if event_type == "message.send":
        await _handle_send(
            data, websocket, channel_id, user_id, message_service, session
        )

    elif event_type == "message.edit":
        await _handle_edit(
            data, websocket, channel_id, user_id, message_service, session
        )

    elif event_type == "message.delete":
        await _handle_delete(
            data, websocket, channel_id, user_id, message_service, session
        )
    elif event_type == "typing.start":
        await manager.broadcast(channel_id, {
            "type": "typing",
            "username": username,
            "user_id": str(user_id),
            "is_typing": True
        }, exclude=websocket)

    elif event_type == "typing.stop":
        await manager.broadcast(channel_id, {
            "type": "typing",
            "username": username,
            "user_id": str(user_id),
            "is_typing": False
        }, exclude=websocket)

    elif event_type == "call.invite":
        await _handle_call_invite(data, websocket, channel_id, user_id, call_service, session)

    elif event_type == "call.accept":
        await _handle_call_accept(data, websocket, channel_id, user_id, call_service, session)

    elif event_type in ("call.decline", "call.leave", "call.cancel"):
        await _handle_call_leave(data, websocket, channel_id, user_id, call_service, session)

    elif event_type in ("webrtc.offer", "webrtc.answer", "webrtc.ice-candidate"):
        await _handle_webrtc_relay(event_type, data, websocket, channel_id, user_id)

    else:
        await websocket.send_json(
            {"type": "error", "detail": f"Unknown event type: {event_type}"}
        )


async def _handle_call_invite(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    call_service: CallService,
    session: AsyncSession,
) -> None:
    raw_type = data.get("call_type", "audio")
    try:
        call_type = CallType(raw_type)
    except ValueError:
        await websocket.send_json({"type": "error", "detail": f"Invalid call_type: {raw_type}"})
        return

    try:
        call = await call_service.invite(channel_id=channel_id, initiator_id=user_id, call_type=call_type)
        await session.commit()
    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})
        return
    await websocket.send_json(_call_payload("call.created", call))
    await manager.broadcast(channel_id, _call_payload("call.incoming", call), exclude=websocket)


async def _handle_call_accept(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    call_service: CallService,
    session: AsyncSession,
) -> None:
    call_id = data.get("call_id")
    if not call_id:
        await websocket.send_json({"type": "error", "detail": "call_id required"})
        return

    try:
        call = await call_service.accept(call_id=UUID(call_id), user_id=user_id)
        await session.commit()
    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})
        return

    await manager.broadcast(channel_id, _call_payload("call.accepted", call))


async def _handle_call_leave(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    call_service: CallService,
    session: AsyncSession,
) -> None:
    call_id = data.get("call_id")
    if not call_id:
        await websocket.send_json({"type": "error", "detail": "call_id required"})
        return

    try:
        call = await call_service.leave(call_id=UUID(call_id), user_id=user_id)
        await session.commit()
    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})
        return

    event = "call.ended" if call.ended_at else "call.left"
    await manager.broadcast(channel_id, _call_payload(event, call))


async def _handle_webrtc_relay(
    event_type: str,
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
) -> None:
    target_user_id = data.get("target_user_id")
    if not target_user_id:
        await websocket.send_json({"type": "error", "detail": "target_user_id required"})
        return

    payload = {**data, "type": event_type, "from_user_id": str(user_id)}
    delivered = await manager.send_to_user(channel_id, UUID(target_user_id), payload)

    if not delivered:
        await websocket.send_json(
            {"type": "error", "detail": f"User {target_user_id} is not connected"}
        )


async def _handle_send(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    message_service: MessageService,
    session: AsyncSession,
) -> None:
    content = data.get("content", "").strip()

    if not content:
        await websocket.send_json({"type": "error", "detail": "Empty message"})
        return

    try:
        message = await message_service.create(
            channel_id=channel_id, author_id=user_id, content=content
        )
        await session.commit()

        await manager.broadcast(
            channel_id,
            {
                "type": "message.new",
                "id": str(message.id),
                "channel_id": str(channel_id),
                "author_id": str(user_id),
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            },
        )

    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})


async def _handle_edit(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    message_service: MessageService,
    session: AsyncSession,
) -> None:
    message_id = data.get("message_id")
    new_content = data.get("content", "").strip()

    if not message_id or not new_content:
        await websocket.send_json(
            {"type": "error", "detail": "message_id and content required"}
        )
        return

    try:
        message = await message_service.edit(
            message_id=UUID(message_id), user_id=user_id, new_content=new_content
        )
        await session.commit()

        await manager.broadcast(
            channel_id,
            {
                "type": "message.edited",
                "id": str(message.id),
                "content": message.content,
                "edited_at": message.edited_at.isoformat(),
            },
        )

    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})


async def _handle_delete(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    user_id: UUID,
    message_service: MessageService,
    session: AsyncSession,
) -> None:
    message_id = data.get("message_id")

    if not message_id:
        await websocket.send_json({"type": "error", "detail": "message_id required"})
        return

    try:
        await message_service.delete(message_id=UUID(message_id), user_id=user_id)
        await session.commit()

        await manager.broadcast(
            channel_id, {"type": "message.deleted", "id": message_id}
        )

    except Exception as e:
        await session.rollback()
        await websocket.send_json({"type": "error", "detail": str(e)})
