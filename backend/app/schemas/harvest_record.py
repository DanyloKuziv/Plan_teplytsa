import uuid
from datetime import datetime
from pydantic import BaseModel


class HarvestRecordCreate(BaseModel):
    actual_yield_kg: float
    revenue: float
    costs: float
    notes: str | None = None


class HarvestRecordOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    actual_yield_kg: float
    revenue: float
    costs: float
    harvested_at: datetime
    notes: str | None

    model_config = {"from_attributes": True}
