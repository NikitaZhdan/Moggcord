from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from jose import jwt, JWTError
import base64
from app.core.config import settings
from app.database.database import new_session
from app.websocket.manager import manager
from app.repositories import ChannelRepository, MessageRepository
from app.services import ChannelService, MessageService
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
        channel_service = ChannelService(channel_repo)
        message_service = MessageService(message_repo, channel_service)
        try:
            await channel_service.assert_member(channel_id, user_id)
        except Exception:
            await websocket.close(code=4003)
            return

        await manager.connect(websocket, channel_id)

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
                    session=session,
                )

        except WebSocketDisconnect:
            manager.disconnect(websocket, channel_id)

            await manager.broadcast(
                channel_id, {"type": "user_left", "user_id": str(user_id)}
            )


async def _handle_message(
    data: dict,
    websocket: WebSocket,
    channel_id: UUID,
    username: str,
    user_id: UUID,
    message_service: MessageService,
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

    else:
        await websocket.send_json(
            {"type": "error", "detail": f"Unknown event type: {event_type}"}
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
