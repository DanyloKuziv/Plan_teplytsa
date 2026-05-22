import uuid
from pydantic import BaseModel
from app.schemas.plant import PlantOut


class FarmerPlantCreate(BaseModel):
    plant_id: uuid.UUID
    yield_per_m2: float
    water_seedling: float
    water_growth: float
    water_flowering: float
    water_ripening: float
    sell_price: float
    seed_price: float = 2.0
    notes: str | None = None


class FarmerPlantUpdate(BaseModel):
    yield_per_m2: float | None = None
    water_seedling: float | None = None
    water_growth: float | None = None
    water_flowering: float | None = None
    water_ripening: float | None = None
    sell_price: float | None = None
    seed_price: float | None = None
    notes: str | None = None


class FarmerPlantOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plant_id: uuid.UUID
    yield_per_m2: float
    water_seedling: float
    water_growth: float
    water_flowering: float
    water_ripening: float
    sell_price: float
    seed_price: float = 2.0
    notes: str | None
    plant: PlantOut | None = None

    model_config = {"from_attributes": True}
