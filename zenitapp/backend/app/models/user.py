from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    CLIENTE = "cliente"
    ADMIN = "admin"
    EMPLEADO = "empleado"


class User(Base):
    """
    El rol vive como enum en el propio usuario en vez de una tabla Roles
    aparte: con 3 roles fijos (cliente/admin/empleado) una tabla de permisos
    dinámica sería sobre-ingeniería para el alcance actual de Zenit.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CLIENTE, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    events: Mapped[list["Event"]] = relationship(
        "Event", back_populates="client", foreign_keys="Event.client_id"
    )
    quote_requests: Mapped[list["QuoteRequest"]] = relationship(
        "QuoteRequest", back_populates="client"
    )
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="client")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user"
    )
