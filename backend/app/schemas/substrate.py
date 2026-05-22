import uuid
from pydantic import BaseModel


class SubstrateOut(BaseModel):
    id: uuid.UUID
    name: str
    water_coefficient: float
    growth_modifier: float = 1.0
    yield_modifier: float = 1.0

    model_config = {"from_attributes": True}
