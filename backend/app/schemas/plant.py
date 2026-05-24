import uuid
from pydantic import BaseModel


class PlantOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    grow_days: int
    plants_per_m2: float
    description: str | None
    image_url: str | None
    seed_weight_g: float = 0.01
    default_yield_per_m2: float = 3.0
    default_sell_price: float = 30.0

    model_config = {"from_attributes": True}
