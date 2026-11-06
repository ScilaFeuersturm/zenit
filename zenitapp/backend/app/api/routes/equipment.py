from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin_or_staff
from app.core.database import get_db
from app.models.equipment import EquipmentChecklist
from app.models.event import Event
from app.models.user import User
from app.schemas.equipment import (
    EquipmentChecklistCreate,
    EquipmentChecklistOut,
    EquipmentChecklistReturn,
)

router = APIRouter(prefix="/api/events/{event_id}/equipment", tags=["Control de Equipos"])


@router.get("", response_model=list[EquipmentChecklistOut])
def list_checklist(
    event_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin_or_staff)
):
    return db.query(EquipmentChecklist).filter(EquipmentChecklist.event_id == event_id).all()


@router.post("", response_model=EquipmentChecklistOut, status_code=201)
def register_checkout(
    event_id: int,
    payload: EquipmentChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
):
    """Registra el estado de un equipo ANTES de salir al evento."""
    if not db.query(Event).filter(Event.id == event_id).first():
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    checklist = EquipmentChecklist(
        event_id=event_id,
        service_id=payload.service_id,
        checked_by_id=current_user.id,
        condition_before=payload.condition_before,
        notes_before=payload.notes_before,
        checked_out_at=datetime.now(timezone.utc),
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


@router.patch("/{checklist_id}/return", response_model=EquipmentChecklistOut)
def register_checkin(
    event_id: int,
    checklist_id: int,
    payload: EquipmentChecklistReturn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff),
):
    """Registra el estado de un equipo AL RETORNAR del evento (roturas, faltantes, etc.)."""
    checklist = (
        db.query(EquipmentChecklist)
        .filter(EquipmentChecklist.id == checklist_id, EquipmentChecklist.event_id == event_id)
        .first()
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    checklist.condition_after = payload.condition_after
    checklist.notes_after = payload.notes_after
    checklist.checked_in_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(checklist)
    return checklist
