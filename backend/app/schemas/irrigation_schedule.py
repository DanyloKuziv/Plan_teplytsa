import uuid
from datetime import date
from pydantic import BaseModel
from app.models.fertilizer import GrowthPhase


class IrrigationScheduleOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    scheduled_date: date
    volume_liters: float
    growth_phase: GrowthPhase

    model_config = {"from_attributes": True}
