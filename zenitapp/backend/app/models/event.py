from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, Enum, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    CONFIRMADO = "confirmado"
    EN_CURSO = "en_curso"
    FINALIZADO = "finalizado"
    CANCELADO = "cancelado"


class Event(Base):
    """Un evento contratado. Nace a partir de una QuoteRequest aprobada."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    quote_request_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("quote_requests.id"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=True)  # boda, cumpleaños, corporativo...
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(300), nullable=True)
    guests_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus), default=EventStatus.PENDIENTE, nullable=False
    )
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client: Mapped["User"] = relationship("User", back_populates="events", foreign_keys=[client_id])
    quote_request: Mapped[Optional["QuoteRequest"]] = relationship(
        "QuoteRequest", back_populates="event"
    )
    services: Mapped[list["EventService"]] = relationship(
        "EventService", back_populates="event", cascade="all, delete-orphan"
    )
    staff_assignments: Mapped[list["EventStaffAssignment"]] = relationship(
        "EventStaffAssignment", back_populates="event", cascade="all, delete-orphan"
    )
    equipment_checks: Mapped[list["EquipmentChecklist"]] = relationship(
        "EquipmentChecklist", back_populates="event", cascade="all, delete-orphan"
    )
    review: Mapped[Optional["Review"]] = relationship(
        "Review", back_populates="event", uselist=False
    )


class EventService(Base):
    """Servicios efectivamente contratados/asignados a un evento (para logística y facturación)."""

    __tablename__ = "event_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    was_delivered: Mapped[bool] = mapped_column(default=False)  # servicio efectivamente prestado

    event: Mapped["Event"] = relationship("Event", back_populates="services")
    service: Mapped["Service"] = relationship("Service", back_populates="event_services")
