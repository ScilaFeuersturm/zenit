from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.crud.notifications import notify_all_admins
from app.models.contact import ContactMessage
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.contact import ContactMessageCreate, ContactMessageOut

router = APIRouter(prefix="/api/contact", tags=["Contacto"])


@router.post("", response_model=ContactMessageOut, status_code=201)
async def send_contact_message(payload: ContactMessageCreate, db: Session = Depends(get_db)):
    """Endpoint público (sin login) para el formulario de contacto de la landing."""
    contact = ContactMessage(**payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)

    await notify_all_admins(
        db,
        NotificationType.NUEVO_CONTACTO,
        title=f"Nuevo mensaje de contacto de {contact.name}",
        body=contact.message[:140],
        related_id=contact.id,
    )
    return contact


@router.get("", response_model=list[ContactMessageOut])
def list_contact_messages(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@router.patch("/{contact_id}/read", status_code=204)
def mark_contact_read(
    contact_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    db.query(ContactMessage).filter(ContactMessage.id == contact_id).update({"is_read": True})
    db.commit()
