import uuid
import asyncio
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    """Tracks active WebSocket connections per greenhouse_id."""

    def __init__(self):
        # greenhouse_id (str) → set of WebSocket
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, greenhouse_id: uuid.UUID, ws: WebSocket):
        await ws.accept()
        self._rooms[str(greenhouse_id)].add(ws)

    def disconnect(self, greenhouse_id: uuid.UUID, ws: WebSocket):
        room = self._rooms.get(str(greenhouse_id))
        if room:
            room.discard(ws)

    async def broadcast(self, greenhouse_id: uuid.UUID, message: dict):
        room = list(self._rooms.get(str(greenhouse_id), []))
        dead: list[WebSocket] = []
        for ws in room:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(greenhouse_id, ws)


manager = ConnectionManager()
