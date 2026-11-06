from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.event import EventStatus
from app.schemas.service import ServiceOut
from app.schemas.user import UserOut


class EventServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    quantity: int
    unit_price: float
    was_delivered: bool
    service: Optional[ServiceOut] = None


class EventUpdateStatus(BaseModel):
    status: EventStatus


class StaffAssignmentCreate(BaseModel):
    employee_id: int
    role_in_event: Optional[str] = None


class StaffAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    employee_id: int
    role_in_event: Optional[str]
    attended: bool
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    employee: Optional[UserOut] = None


class StaffAttendanceUpdate(BaseModel):
    attended: bool


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    title: str
    event_type: Optional[str]
    event_date: datetime
    location: Optional[str]
    guests_count: Optional[int]
    status: EventStatus
    total_amount: float
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    services: list[EventServiceOut] = []
    staff_assignments: list[StaffAssignmentOut] = []
    client: Optional[UserOut] = None
