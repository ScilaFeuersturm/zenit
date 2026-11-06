from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.service import ServiceCategory


class ServiceBase(BaseModel):
    name: str
    category: ServiceCategory
    description: Optional[str] = None
    unit_price: float
    price_unit: str = "por_evento"
    stock_total: int = 1
    image_url: Optional[str] = None


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ServiceCategory] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    price_unit: Optional[str] = None
    stock_total: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceOut(ServiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
