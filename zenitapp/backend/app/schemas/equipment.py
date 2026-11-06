from typing import Optional

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.equipment import EquipmentCondition


class EquipmentChecklistCreate(BaseModel):
    service_id: int
    condition_before: EquipmentCondition
    notes_before: Optional[str] = None


class EquipmentChecklistReturn(BaseModel):
    condition_after: EquipmentCondition
    notes_after: Optional[str] = None


class EquipmentChecklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    service_id: int
    checked_by_id: int
    condition_before: Optional[EquipmentCondition]
    notes_before: Optional[str]
    checked_out_at: Optional[datetime]
    condition_after: Optional[EquipmentCondition]
    notes_after: Optional[str]
    checked_in_at: Optional[datetime]
    created_at: datetime
