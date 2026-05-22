import uuid
from datetime import datetime
from pydantic import BaseModel


class SensorLogCreate(BaseModel):
    temperature: float | None = None
    humidity_air: float | None = None
    humidity_soil: float | None = None
    co2_ppm: float | None = None
    o2_pct: float | None = None
    light_lux: float | None = None


class SensorLogOut(BaseModel):
    id: uuid.UUID
    greenhouse_id: uuid.UUID
    temperature: float | None
    humidity_air: float | None
    humidity_soil: float | None
    co2_ppm: float | None
    o2_pct: float | None = None
    light_lux: float | None = None
    recorded_at: datetime

    model_config = {"from_attributes": True}
