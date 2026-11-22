from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/auctions/{rfq_id}")
async def auction_websocket_endpoint(websocket: WebSocket, rfq_id: str):
    await ws_manager.connect(rfq_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeat ping/pong or client query
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(rfq_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error on room {rfq_id}: {e}")
        ws_manager.disconnect(rfq_id, websocket)
