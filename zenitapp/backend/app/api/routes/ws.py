from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User
from app.ws.manager import manager

router = APIRouter(tags=["WebSocket"])


def _authenticate(token: str) -> Optional[User]:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    db: Session = SessionLocal()
    try:
        return db.query(User).filter(User.id == int(payload["sub"])).first()
    finally:
        db.close()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    Canal único de WebSocket para chat + notificaciones in-app.
    El cliente se autentica pasando el access token JWT como query param
    (ws://host/ws?token=...) porque los navegadores/RN no permiten headers
    custom al abrir un WebSocket.

    Mensajes salientes tienen forma {"event": "chat_message" | "notification", "data": {...}}.
    El envío de mensajes de chat en sí se hace por REST (POST /api/chat/...) para
    quedar persistido de forma simple y consistente; el socket es solo el canal
    de push en tiempo real hacia el otro lado de la conversación.
    """
    user = _authenticate(token)
    if not user:
        await websocket.close(code=4401)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            # No esperamos comandos del cliente por este socket (push-only),
            # pero hay que leer para detectar la desconexión.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
