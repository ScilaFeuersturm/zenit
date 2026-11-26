from typing import Optional

from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CLIENTE


class ClientCreate(UserCreate):
    full_name: str = Field(min_length=1, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=30)
    password: str = Field(min_length=8)

    @field_validator("full_name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def validate_password_size(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña debe ocupar hasta 72 bytes")
        return value


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
