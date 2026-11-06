from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.ws.manager import manager


async def notify_user(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    body: Optional[str] = None,
    related_id: Optional[int] = None,
) -> Notification:
    """Guarda la notificación (persistente) y la empuja en vivo si el usuario está conectado."""
    notification = Notification(
        user_id=user_id, type=type, title=title, body=body, related_id=related_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    await manager.send_to_user(
        user_id,
        {
            "event": "notification",
            "data": {
                "id": notification.id,
                "type": notification.type.value,
                "title": notification.title,
                "body": notification.body,
                "related_id": notification.related_id,
                "created_at": notification.created_at.isoformat(),
            },
        },
    )
    return notification


async def notify_all_admins(
    db: Session,
    type: NotificationType,
    title: str,
    body: Optional[str] = None,
    related_id: Optional[int] = None,
) -> None:
    from app.models.user import User, UserRole

    admin_ids = [u.id for u in db.query(User.id).filter(User.role == UserRole.ADMIN).all()]
    for admin_id in admin_ids:
        await notify_user(db, admin_id, type, title, body, related_id)
