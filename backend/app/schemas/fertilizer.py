import uuid
from pydantic import BaseModel
from app.models.fertilizer import GrowthPhase


class FertilizerOut(BaseModel):
    id: uuid.UUID
    name: str
    npk_formula: str
    phase: GrowthPhase
    dose_per_m2: float
    price_per_kg: float

    model_config = {"from_attributes": True}
