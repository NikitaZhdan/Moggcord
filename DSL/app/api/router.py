from fastapi import APIRouter
from app.api.v1.channels import router as channels_router
from app.api.v1.messages import router as messages_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(channels_router)
api_router.include_router(messages_router)
