import uuid
from pydantic import BaseModel


class ZoneCreate(BaseModel):
    greenhouse_id: uuid.UUID
    name: str
    area: float
    row_count: int = 1
    notes: str | None = None


class ZoneUpdate(BaseModel):
    name: str | None = None
    area: float | None = None
    row_count: int | None = None
    notes: str | None = None
    farmer_plant_id: uuid.UUID | None = None


class ZoneOut(BaseModel):
    id: uuid.UUID
    greenhouse_id: uuid.UUID
    name: str
    area: float
    row_count: int
    notes: str | None
    farmer_plant_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}
