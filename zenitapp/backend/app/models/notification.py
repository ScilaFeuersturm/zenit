from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Text, Boolean, Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NotificationType(str, enum.Enum):
    NUEVA_SOLICITUD = "nueva_solicitud"
    NUEVO_MENSAJE = "nuevo_mensaje"
    EVENTO_ACTUALIZADO = "evento_actualizado"
    ASIGNACION_PERSONAL = "asignacion_personal"
    RESEÑA_RECIBIDA = "reseña_recibida"
    NUEVO_CONTACTO = "nuevo_contacto"


class Notification(Base):
    """
    Notificaciones in-app (sin FCM). Se insertan acá y se empujan por WebSocket
    a quien esté conectado en ese momento; si no está conectado, quedan
    guardadas para mostrarse al abrir la app (polling de 'no leídas').
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    related_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="notifications")
