import uuid
from datetime import datetime
from pydantic import BaseModel


class FloorPlanSave(BaseModel):
    grid_data: dict[str, str] = {}          # { "col,row": "wall" }
    equipment: list[dict] = []
    zones_on_grid: dict[str, list[str]] = {}  # { "zone_id": ["col,row", ...] }


class FloorPlanOut(BaseModel):
    id: uuid.UUID
    greenhouse_id: uuid.UUID
    grid_data: dict[str, str]
    equipment: list[dict]
    zones_on_grid: dict[str, list[str]]
    updated_at: datetime

    model_config = {"from_attributes": True}
