import uuid
from datetime import datetime
from pydantic import BaseModel


class MarketPriceOut(BaseModel):
    id: uuid.UUID
    plant_id: uuid.UUID
    plant_name: str
    region: str
    price_per_kg: float
    source_url: str | None
    recorded_at: datetime

    model_config = {"from_attributes": True}
