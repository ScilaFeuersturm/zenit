from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.notifications import notify_all_admins
from app.models.event import Event, EventStatus
from app.models.notification import NotificationType
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/events/{event_id}/review", tags=["Reseñas"])


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(
    event_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if event.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="No podés reseñar este evento")
    if event.status != EventStatus.FINALIZADO:
        raise HTTPException(status_code=400, detail="Solo se puede reseñar un evento finalizado")
    if event.review:
        raise HTTPException(status_code=400, detail="Este evento ya tiene una reseña")

    review = Review(
        event_id=event_id,
        client_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    await notify_all_admins(
        db,
        NotificationType.RESEÑA_RECIBIDA,
        title=f"Nueva reseña ({payload.rating}/5) de {current_user.full_name}",
        body=payload.comment,
        related_id=event_id,
    )
    return review


@router.get("", response_model=ReviewOut)
def get_review(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or not event.review:
        raise HTTPException(status_code=404, detail="Este evento no tiene reseña")
    return event.review
