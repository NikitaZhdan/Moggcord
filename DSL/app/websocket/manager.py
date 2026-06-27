from fastapi import WebSocket
from uuid import UUID
from collections import defaultdict


class ConnectionManager:
    def __init__(self):
        self._connections: dict[UUID, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel_id: UUID) -> None:
        await websocket.accept()
        self._connections[channel_id].append(websocket)

    def disconnect(self, websocket: WebSocket, channel_id: UUID) -> None:
        connections = self._connections.get(channel_id, [])

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self._connections.pop(channel_id, None)

    async def broadcast(
        self, channel_id: UUID, payload: dict, exclude: WebSocket | None = None
    ) -> None:
        dead = []

        for ws in self._connections.get(channel_id, []):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws, channel_id)


manager = ConnectionManager()
