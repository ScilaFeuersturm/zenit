from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Float, Integer, Boolean, DateTime, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ServiceCategory(str, enum.Enum):
    CATERING = "catering"
    SONIDO = "sonido"
    ILUMINACION = "iluminacion"
    DECORACION = "decoracion"
    PERSONAL = "personal"
    MOBILIARIO = "mobiliario"
    OTRO = "otro"


class Service(Base):
    """Catálogo de servicios/recursos ofrecidos por Zenit (también funciona como inventario)."""

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[ServiceCategory] = mapped_column(Enum(ServiceCategory), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    price_unit: Mapped[str] = mapped_column(String(50), default="por_evento")  # por_evento, por_hora, por_persona, por_unidad
    stock_total: Mapped[int] = mapped_column(Integer, default=1)  # unidades/equipos disponibles (inventario)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    quote_items: Mapped[list["QuoteItem"]] = relationship("QuoteItem", back_populates="service")
    event_services: Mapped[list["EventService"]] = relationship(
        "EventService", back_populates="service"
    )
