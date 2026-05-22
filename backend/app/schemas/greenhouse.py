import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.greenhouse import HeatingType, InsulationType


class GreenhouseCreate(BaseModel):
    name: str
    total_area: float
    heating_type: HeatingType
    heating_power_kw: float
    fuel_cost_per_unit: float
    insulation_type: InsulationType = InsulationType.basic


class GreenhouseUpdate(BaseModel):
    name: str | None = None
    total_area: float | None = None
    heating_type: HeatingType | None = None
    heating_power_kw: float | None = None
    fuel_cost_per_unit: float | None = None
    insulation_type: InsulationType | None = None
    last_health_score: float | None = None
    last_health_updated: datetime | None = None


class GreenhouseOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    total_area: float
    heating_type: HeatingType
    heating_power_kw: float
    fuel_cost_per_unit: float
    insulation_type: InsulationType
    created_at: datetime
    last_health_score: Optional[float] = None
    last_health_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}
