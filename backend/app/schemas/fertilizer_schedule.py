import uuid
from datetime import date
from pydantic import BaseModel
from app.models.fertilizer import GrowthPhase


class FertilizerScheduleOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    fertilizer_id: uuid.UUID
    scheduled_date: date
    dose_grams: float
    growth_phase: GrowthPhase

    model_config = {"from_attributes": True}
