from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.crud.notifications import notify_all_admins, notify_user
from app.models.event import Event, EventService, EventStatus
from app.models.notification import NotificationType
from app.models.quote import QuoteItem, QuoteRequest, QuoteRequestStatus
from app.models.service import Service
from app.models.user import User, UserRole
from app.schemas.quote import QuoteRequestCreate, QuoteRequestOut, QuoteRequestUpdateStatus

router = APIRouter(prefix="/api/quotes", tags=["Presupuestos"])


@router.post("", response_model=QuoteRequestOut, status_code=201)
async def create_quote_request(
    payload: QuoteRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Elegí al menos un servicio")

    service_ids = [item.service_id for item in payload.items]
    services = {s.id: s for s in db.query(Service).filter(Service.id.in_(service_ids)).all()}
    missing = set(service_ids) - services.keys()
    if missing:
        raise HTTPException(status_code=404, detail=f"Servicios inexistentes: {missing}")

    quote = QuoteRequest(
        client_id=current_user.id,
        desired_date=payload.desired_date,
        guests_count=payload.guests_count,
        message=payload.message,
    )
    total = 0.0
    for item in payload.items:
        service = services[item.service_id]
        quote.items.append(
            QuoteItem(service_id=service.id, quantity=item.quantity, unit_price=service.unit_price)
        )
        total += service.unit_price * item.quantity
    quote.estimated_total = total

    db.add(quote)
    db.commit()
    db.refresh(quote)

    await notify_all_admins(
        db,
        NotificationType.NUEVA_SOLICITUD,
        title="Nueva solicitud de presupuesto",
        body=f"{current_user.full_name} solicitó un presupuesto de ${total:,.0f}",
        related_id=quote.id,
    )

    return quote


@router.get("/mine", response_model=list[QuoteRequestOut])
def my_quote_requests(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(QuoteRequest)
        .options(joinedload(QuoteRequest.items).joinedload(QuoteItem.service))
        .filter(QuoteRequest.client_id == current_user.id)
        .order_by(QuoteRequest.created_at.desc())
        .all()
    )


@router.get("", response_model=list[QuoteRequestOut])
def list_quote_requests(
    status_filter: Optional[QuoteRequestStatus] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(QuoteRequest).options(
        joinedload(QuoteRequest.items).joinedload(QuoteItem.service)
    )
    if status_filter:
        query = query.filter(QuoteRequest.status == status_filter)
    return query.order_by(QuoteRequest.created_at.desc()).all()


@router.patch("/{quote_id}/status", response_model=QuoteRequestOut)
async def update_quote_status(
    quote_id: int,
    payload: QuoteRequestUpdateStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    quote = (
        db.query(QuoteRequest)
        .options(joinedload(QuoteRequest.items))
        .filter(QuoteRequest.id == quote_id)
        .first()
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    quote.status = payload.status
    if payload.admin_notes is not None:
        quote.admin_notes = payload.admin_notes

    if payload.status == QuoteRequestStatus.APROBADA:
        event = Event(
            client_id=quote.client_id,
            quote_request_id=quote.id,
            title=f"Evento de {quote.client.full_name}",
            event_date=quote.desired_date,
            guests_count=quote.guests_count,
            status=EventStatus.CONFIRMADO,
            total_amount=quote.estimated_total,
        )
        for item in quote.items:
            event.services.append(
                EventService(
                    service_id=item.service_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                )
            )
        db.add(event)

    db.commit()
    db.refresh(quote)

    title = {
        QuoteRequestStatus.APROBADA: "¡Tu presupuesto fue aprobado!",
        QuoteRequestStatus.RECHAZADA: "Tu solicitud fue rechazada",
        QuoteRequestStatus.MODIFICADA: "Tu presupuesto fue modificado",
    }.get(payload.status)
    if title:
        await notify_user(
            db,
            quote.client_id,
            NotificationType.EVENTO_ACTUALIZADO,
            title=title,
            body=payload.admin_notes,
            related_id=quote.id,
        )

    return quote
