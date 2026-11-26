from typing import Optional

from datetime import datetime, timezone

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.models.event import EventStatus
from app.schemas.service import ServiceOut
from app.schemas.user import UserOut


class EventServiceCreate(BaseModel):
    service_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=2_147_483_647)


class EventUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    event_date: AwareDatetime
    event_type: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=300)
    guests_count: Optional[int] = Field(default=None, ge=1, le=2_147_483_647)
    notes: Optional[str] = None
    items: list[EventServiceCreate] = Field(min_length=1)


class EventCreate(EventUpdate):
    client_id: int = Field(gt=0)


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

    @field_validator("event_date")
    @classmethod
    def restore_event_timezone(cls, value: datetime) -> datetime:
        # SQLite returns stored UTC timestamps without timezone information.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
