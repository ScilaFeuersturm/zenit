from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin, require_admin_or_staff
from app.core.database import get_db
from app.crud.notifications import notify_user
from app.models.event import Event, EventStatus
from app.models.notification import NotificationType
from app.models.staff import EventStaffAssignment
from app.models.user import User, UserRole
from app.schemas.event import (
    EventOut,
    EventUpdateStatus,
    StaffAssignmentCreate,
    StaffAssignmentOut,
    StaffAttendanceUpdate,
)

router = APIRouter(prefix="/api/events", tags=["Eventos"])


def _event_query(db: Session):
    return db.query(Event).options(
        joinedload(Event.services), joinedload(Event.staff_assignments), joinedload(Event.client)
    )


@router.get("/mine", response_model=list[EventOut])
def my_events(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        _event_query(db)
        .filter(Event.client_id == current_user.id)
        .order_by(Event.event_date.desc())
        .all()
    )


@router.get("", response_model=list[EventOut])
def list_events(
    status_filter: Optional[EventStatus] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff),
):
    query = _event_query(db)
    if status_filter:
        query = query.filter(Event.status == status_filter)
    return query.order_by(Event.event_date.desc()).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = _event_query(db).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if current_user.role == UserRole.CLIENTE and event.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tenés acceso a este evento")
    return event


@router.patch("/{event_id}/status", response_model=EventOut)
async def update_event_status(
    event_id: int,
    payload: EventUpdateStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    event.status = payload.status
    db.commit()
    db.refresh(event)

    await notify_user(
        db,
        event.client_id,
        NotificationType.EVENTO_ACTUALIZADO,
        title=f"Tu evento cambió de estado: {payload.status.value}",
        related_id=event.id,
    )
    return event


@router.post("/{event_id}/staff", response_model=StaffAssignmentOut, status_code=201)
async def assign_staff(
    event_id: int,
    payload: StaffAssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    employee = db.query(User).filter(User.id == payload.employee_id).first()
    if not employee or employee.role != UserRole.EMPLEADO:
        raise HTTPException(status_code=400, detail="El usuario indicado no es un empleado válido")

    assignment = EventStaffAssignment(
        event_id=event_id, employee_id=payload.employee_id, role_in_event=payload.role_in_event
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    await notify_user(
        db,
        payload.employee_id,
        NotificationType.ASIGNACION_PERSONAL,
        title="Fuiste asignado a un evento",
        body=event.title,
        related_id=event.id,
    )
    return assignment


@router.patch("/{event_id}/staff/{assignment_id}/attendance", response_model=StaffAssignmentOut)
def mark_attendance(
    event_id: int,
    assignment_id: int,
    payload: StaffAttendanceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff),
):
    from datetime import datetime, timezone

    assignment = (
        db.query(EventStaffAssignment)
        .filter(
            EventStaffAssignment.id == assignment_id, EventStaffAssignment.event_id == event_id
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    assignment.attended = payload.attended
    now = datetime.now(timezone.utc)
    if payload.attended and not assignment.check_in_time:
        assignment.check_in_time = now
    if not payload.attended:
        assignment.check_out_time = now

    db.commit()
    db.refresh(assignment)
    return assignment
