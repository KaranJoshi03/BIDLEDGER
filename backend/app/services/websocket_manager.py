import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        # Map rfq_id -> List of active WebSocket connections
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, rfq_id: str, websocket: WebSocket):
        await websocket.accept()
        if rfq_id not in self.active_rooms:
            self.active_rooms[rfq_id] = []
        self.active_rooms[rfq_id].append(websocket)
        logger.info(f"WebSocket client connected to room {rfq_id}. Total: {len(self.active_rooms[rfq_id])}")

    def disconnect(self, rfq_id: str, websocket: WebSocket):
        if rfq_id in self.active_rooms:
            if websocket in self.active_rooms[rfq_id]:
                self.active_rooms[rfq_id].remove(websocket)
            if not self.active_rooms[rfq_id]:
                del self.active_rooms[rfq_id]
        logger.info(f"WebSocket client disconnected from room {rfq_id}.")

    async def broadcast_to_room(self, rfq_id: str, message: dict):
        if rfq_id in self.active_rooms:
            dead_sockets = []
            for connection in self.active_rooms[rfq_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"Failed to send to client in {rfq_id}: {e}")
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.disconnect(rfq_id, dead)

ws_manager = WebSocketManager()
