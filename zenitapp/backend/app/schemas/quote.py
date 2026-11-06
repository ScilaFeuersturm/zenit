from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.quote import QuoteRequestStatus
from app.schemas.service import ServiceOut


class QuoteItemCreate(BaseModel):
    service_id: int
    quantity: int = 1


class QuoteItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    quantity: int
    unit_price: float
    service: Optional[ServiceOut] = None

    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price


class QuoteRequestCreate(BaseModel):
    desired_date: datetime
    guests_count: Optional[int] = None
    message: Optional[str] = None
    items: list[QuoteItemCreate]


class QuoteRequestUpdateStatus(BaseModel):
    status: QuoteRequestStatus
    admin_notes: Optional[str] = None


class QuoteRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    status: QuoteRequestStatus
    desired_date: Optional[datetime]
    guests_count: Optional[int]
    message: Optional[str]
    admin_notes: Optional[str]
    estimated_total: float
    created_at: datetime
    items: list[QuoteItemOut] = []
