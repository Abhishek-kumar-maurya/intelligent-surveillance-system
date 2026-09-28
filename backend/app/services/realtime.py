import asyncio
import json
from collections import defaultdict
from typing import Any

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, set[Any]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket):
        await websocket.accept()
        async with self._lock:
            self.connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket):
        async with self._lock:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                self.connections.pop(user_id, None)

    async def broadcast(self, payload: dict):
        message = json.dumps(payload, default=str)
        stale = []
        async with self._lock:
            sockets = [ws for group in self.connections.values() for ws in group]
        for ws in sockets:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        if stale:
            async with self._lock:
                for ws in stale:
                    for user_id in list(self.connections):
                        self.connections[user_id].discard(ws)

manager = ConnectionManager()
