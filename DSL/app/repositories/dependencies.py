from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from uuid import UUID
import base64

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_session
from app.repositories import ChannelRepository, MessageRepository
from app.services import ChannelService, MessageService

bearer_scheme = HTTPBearer()

def _signing_key() -> bytes:
    return base64.b64decode(settings.JWT_SECRET)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UUID:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, _signing_key(), algorithms=["HS512"]
        )
        user_id: str = payload.get("uid")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return UUID(user_id)

    except JWTError as e:
        print("JWT ERROR:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )


def get_channel_repo(session: AsyncSession = Depends(get_session)) -> ChannelRepository:
    return ChannelRepository(session)


def get_channel_service(
    repo: ChannelRepository = Depends(get_channel_repo),
) -> ChannelService:
    return ChannelService(repo)


def get_message_repo(session: AsyncSession = Depends(get_session)) -> MessageRepository:
    return MessageRepository(session)


def get_message_service(
    message_repo: MessageRepository = Depends(get_message_repo),
    channel_service: ChannelService = Depends(get_channel_service),
) -> MessageService:
    return MessageService(message_repo, channel_service)
