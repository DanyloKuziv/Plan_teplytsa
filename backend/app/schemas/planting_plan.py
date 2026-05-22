import uuid
from datetime import date
from pydantic import BaseModel


class PlantingPlanCreate(BaseModel):
    greenhouse_id: uuid.UUID
    zone_id: uuid.UUID
    farmer_plant_id: uuid.UUID
    substrate_id: uuid.UUID
    area: float
    planted_at: date
    irrigation_coverage_pct: float = 100.0
    heating_coverage_pct: float = 100.0


class PlantingPlanOut(BaseModel):
    id: uuid.UUID
    greenhouse_id: uuid.UUID
    zone_id: uuid.UUID
    farmer_plant_id: uuid.UUID
    substrate_id: uuid.UUID
    area: float
    planted_at: date
    expected_harvest_at: date
    status: str
    irrigation_coverage: float = 100.0
    heating_coverage: float = 100.0

    model_config = {"from_attributes": True}


class PlantingPlanAccepted(BaseModel):
    """Returned as 202 when schedules are queued for async generation."""
    plan_id: uuid.UUID
    status: str
    expected_harvest_at: date
    message: str = "Schedules are being generated in background"


class PlanProgressOut(BaseModel):
    plan_id: uuid.UUID
    status: str
    progress: dict  # {"irrigation_schedules": int, "fertilizer_schedules": int}
