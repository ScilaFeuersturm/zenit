from collections import defaultdict
from typing import Optional
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin, require_admin_or_staff
from app.core.database import get_db
from app.crud.notifications import notify_user
from app.models.event import Event, EventService, EventStatus
from app.models.notification import NotificationType
from app.models.service import Service
from app.models.staff import EventStaffAssignment
from app.models.user import User, UserRole
from app.schemas.event import (
    EventCreate,
    EventOut,
    EventUpdate,
    EventUpdateStatus,
    StaffAssignmentCreate,
    StaffAssignmentOut,
    StaffAttendanceUpdate,
)

router = APIRouter(prefix="/api/events", tags=["Eventos"])


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    client = db.get(User, payload.client_id)
    if not client or client.role != UserRole.CLIENTE or not client.is_active:
        raise HTTPException(status_code=400, detail="Elegí un cliente activo")

    event = Event(client_id=client.id, status=EventStatus.CONFIRMADO)
    _apply_event_details(db, event, payload)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _apply_event_details(db: Session, event: Event, payload: EventUpdate):
    requested = {item.service_id: item.quantity for item in payload.items}
    if len(requested) != len(payload.items):
        raise HTTPException(status_code=400, detail="Hay insumos repetidos")

    existing = defaultdict(list)
    for item in event.services:
        existing[item.service_id].append(item)
    new_ids = requested.keys() - existing.keys()
    services = {
        service.id: service
        for service in db.query(Service)
        .filter(Service.id.in_(new_ids), Service.is_active.is_(True))
        .all()
    } if new_ids else {}
    if new_ids - services.keys():
        raise HTTPException(status_code=400, detail="Hay insumos que ya no están disponibles en el catálogo")

    removed = existing.keys() - requested.keys()
    if any(item.service_id in removed and item.was_delivered for item in event.services) or any(
        check.service_id in removed for check in event.equipment_checks
    ):
        raise HTTPException(status_code=400, detail="No se pueden quitar insumos con entregas o controles de equipos registrados")

    for field, value in payload.model_dump(exclude={"items", "event_date", "client_id"}).items():
        setattr(event, field, value)
    event.event_date = payload.event_date.astimezone(timezone.utc)

    # Historical budgets can have several lines for a single service.
    # Keep those lines and their prices when the aggregate quantity is unchanged.
    for service_id, quantity in requested.items():
        lines = existing.get(service_id, [])
        if not lines:
            service = services[service_id]
            event.services.append(EventService(service_id=service_id, quantity=quantity, unit_price=service.unit_price))
        elif len(lines) == 1:
            lines[0].quantity = quantity
        elif sum(item.quantity for item in lines) != quantity:
            raise HTTPException(status_code=400, detail="No se puede cambiar la cantidad de un insumo con varias líneas históricas")
    event.services = [item for item in event.services if item.service_id in requested]
    event.total_amount = sum(item.quantity * item.unit_price for item in event.services)


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    event = db.query(Event).filter(Event.id == event_id).with_for_update().first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    _apply_event_details(db, event, payload)
    db.commit()
    db.refresh(event)
    return event


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
