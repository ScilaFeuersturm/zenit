from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    content: str
    is_read: bool
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    created_at: datetime
    messages: list[ChatMessageOut] = []


class ConversationSummary(BaseModel):
    """Usado en el panel de admin: lista de conversaciones con último mensaje y no leídos."""

    id: int
    client_id: int
    client_name: str
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int
