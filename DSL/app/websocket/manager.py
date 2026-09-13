from fastapi import WebSocket
from uuid import UUID
from collections import defaultdict


class ConnectionManager:

    def __init__(self):
        self._connections: dict[UUID, dict[UUID, WebSocket]] = defaultdict(dict)

    async def connect(self, websocket: WebSocket, channel_id: UUID, user_id: UUID) -> None:
        await websocket.accept()
        self._connections[channel_id][user_id] = websocket

    def disconnect(self, websocket: WebSocket, channel_id: UUID, user_id: UUID) -> None:
        connections = self._connections.get(channel_id)
        if connections and connections.get(user_id) is websocket:
            del connections[user_id]

        if connections is not None and not connections:
            self._connections.pop(channel_id, None)

    async def broadcast(
        self, channel_id: UUID, payload: dict, exclude: WebSocket | None = None
    ) -> None:
        dead: list[UUID] = []

        for user_id, ws in list(self._connections.get(channel_id, {}).items()):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(user_id)

        for user_id in dead:
            ws = self._connections.get(channel_id, {}).get(user_id)
            if ws:
                self.disconnect(ws, channel_id, user_id)

    async def send_to_user(self, channel_id: UUID, user_id: UUID, payload: dict) -> bool:
        ws = self._connections.get(channel_id, {}).get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json(payload)
            return True
        except Exception:
            self.disconnect(ws, channel_id, user_id)
            return False

    def is_online(self, channel_id: UUID, user_id: UUID) -> bool:
        return user_id in self._connections.get(channel_id, {})


manager = ConnectionManager()
