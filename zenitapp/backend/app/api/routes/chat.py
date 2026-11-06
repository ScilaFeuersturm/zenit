from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.crud.notifications import notify_all_admins, notify_user
from app.models.chat import ChatMessage, Conversation
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.chat import ChatMessageCreate, ChatMessageOut, ConversationOut, ConversationSummary
from app.ws.manager import manager

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _get_or_create_conversation(db: Session, client_id: int) -> Conversation:
    conversation = db.query(Conversation).filter(Conversation.client_id == client_id).first()
    if not conversation:
        conversation = Conversation(client_id=client_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


@router.get("/mine", response_model=ConversationOut)
def my_conversation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conversation = _get_or_create_conversation(db, current_user.id)
    return conversation


@router.post("/mine/messages", response_model=ChatMessageOut, status_code=201)
async def send_message_as_client(
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_or_create_conversation(db, current_user.id)
    return await _create_message(db, conversation, current_user, payload.content)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    conversations = db.query(Conversation).all()
    summaries = []
    for conv in conversations:
        last = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        unread = (
            db.query(func.count(ChatMessage.id))
            .filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_id == conv.client_id,
                ChatMessage.is_read.is_(False),
            )
            .scalar()
        )
        summaries.append(
            ConversationSummary(
                id=conv.id,
                client_id=conv.client_id,
                client_name=conv.client.full_name,
                last_message=last.content if last else None,
                last_message_at=last.created_at if last else None,
                unread_count=unread or 0,
            )
        )
    epoch = datetime.min.replace(tzinfo=timezone.utc)
    return sorted(summaries, key=lambda s: s.last_message_at or epoch, reverse=True)


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    # Marca como leídos los mensajes del cliente al abrir la conversación.
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.sender_id == conversation.client_id,
        ChatMessage.is_read.is_(False),
    ).update({"is_read": True})
    db.commit()
    db.refresh(conversation)
    return conversation


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageOut, status_code=201)
async def send_message_as_admin(
    conversation_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return await _create_message(db, conversation, current_user, payload.content)


async def _create_message(
    db: Session, conversation: Conversation, sender: User, content: str
) -> ChatMessage:
    message = ChatMessage(conversation_id=conversation.id, sender_id=sender.id, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)

    payload = {
        "event": "chat_message",
        "data": {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": message.created_at.isoformat(),
        },
    }

    if sender.role == UserRole.CLIENTE:
        await manager.broadcast_to_users(
            [u.id for u in db.query(User.id).filter(User.role == UserRole.ADMIN).all()], payload
        )
        await notify_all_admins(
            db,
            NotificationType.NUEVO_MENSAJE,
            title=f"Mensaje de {sender.full_name}",
            body=content[:140],
            related_id=conversation.id,
        )
    else:
        await manager.send_to_user(conversation.client_id, payload)
        await notify_user(
            db,
            conversation.client_id,
            NotificationType.NUEVO_MENSAJE,
            title="Nuevo mensaje de Eventos Zenit",
            body=content[:140],
            related_id=conversation.id,
        )

    return message
