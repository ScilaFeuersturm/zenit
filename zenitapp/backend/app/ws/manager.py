import json

from fastapi import WebSocket


class ConnectionManager:
    """
    Gestor de conexiones WebSocket en memoria.
    Mantiene un mapa user_id -> lista de sockets (un usuario puede tener
    la app abierta en más de un dispositivo). Sirve tanto para el chat
    como para las notificaciones in-app, evitando depender de FCM.

    Nota de despliegue: al ser estado en memoria del proceso, si se corre
    con más de un worker de Gunicorn los sockets no se comparten entre
    procesos. Para el volumen esperado de Zenit, correr con un solo worker
    (o usar --workers 1 para el proceso que sirve WS) es la opción más
    simple; si more adelante hace falta escalar, se reemplaza por Redis pub/sub.
    """

    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        for connection in list(self.active_connections.get(user_id, [])):
            try:
                await connection.send_json(payload)
            except Exception:
                self.disconnect(user_id, connection)

    async def broadcast_to_users(self, user_ids: list[int], payload: dict) -> None:
        for user_id in user_ids:
            await self.send_to_user(user_id, payload)

    def is_online(self, user_id: int) -> bool:
        return bool(self.active_connections.get(user_id))


manager = ConnectionManager()
