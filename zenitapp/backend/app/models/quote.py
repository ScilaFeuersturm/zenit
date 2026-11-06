from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, Enum, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuoteRequestStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"
    MODIFICADA = "modificada"


class QuoteRequest(Base):
    """Solicitud de presupuesto armada por el cliente desde el catálogo."""

    __tablename__ = "quote_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[QuoteRequestStatus] = mapped_column(
        Enum(QuoteRequestStatus), default=QuoteRequestStatus.PENDIENTE, nullable=False
    )
    desired_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    guests_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_total: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client: Mapped["User"] = relationship("User", back_populates="quote_requests")
    items: Mapped[list["QuoteItem"]] = relationship(
        "QuoteItem", back_populates="quote_request", cascade="all, delete-orphan"
    )
    event: Mapped[Optional["Event"]] = relationship("Event", back_populates="quote_request")


class QuoteItem(Base):
    """Cada servicio seleccionado dentro de una solicitud de presupuesto."""

    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_request_id: Mapped[int] = mapped_column(ForeignKey("quote_requests.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    quote_request: Mapped["QuoteRequest"] = relationship("QuoteRequest", back_populates="items")
    service: Mapped["Service"] = relationship("Service", back_populates="quote_items")

    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price
