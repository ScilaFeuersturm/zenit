from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str


class ContactMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: Optional[str]
    message: str
    is_read: bool
    created_at: datetime
