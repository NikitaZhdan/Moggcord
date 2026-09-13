from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.websocket.handler import websocket_endpoint

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Список разрешенных источников
    allow_credentials=True,          # Разрешить куки/авторизацию
    allow_methods=["*"],             # Разрешить все HTTP методы
    allow_headers=["*"],             # Разрешить все заголовки
)


app.include_router(api_router)
app.add_api_websocket_route("/ws/channels/{channel_id}", websocket_endpoint)
