from typing import Optional

from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventStaffAssignment(Base):
    """Asignación de un empleado a un evento + registro de asistencia real."""

    __tablename__ = "event_staff_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role_in_event: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # ej. "Mozo", "Sonidista"
    attended: Mapped[bool] = mapped_column(Boolean, default=False)
    check_in_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship("Event", back_populates="staff_assignments")
    employee: Mapped["User"] = relationship("User", foreign_keys=[employee_id])
