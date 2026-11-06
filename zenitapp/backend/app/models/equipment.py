from typing import Optional

import enum
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EquipmentCondition(str, enum.Enum):
    BUENO = "bueno"
    DAÑADO = "dañado"
    FALTANTE = "faltante"
    EN_MANTENIMIENTO = "en_mantenimiento"


class EquipmentChecklist(Base):
    """
    Checklist de salida/retorno de equipos para un evento.
    Se crea un registro por equipo (service) revisado, con estado antes de salir
    y estado al volver, para detectar roturas o faltantes.
    """

    __tablename__ = "equipment_checklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    checked_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    condition_before: Mapped[Optional[EquipmentCondition]] = mapped_column(
        Enum(EquipmentCondition), nullable=True
    )
    notes_before: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    condition_after: Mapped[Optional[EquipmentCondition]] = mapped_column(
        Enum(EquipmentCondition), nullable=True
    )
    notes_after: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship("Event", back_populates="equipment_checks")
    service: Mapped["Service"] = relationship("Service")
    checked_by: Mapped["User"] = relationship("User", foreign_keys=[checked_by_id])
