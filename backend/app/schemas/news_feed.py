import uuid
from datetime import datetime
from pydantic import BaseModel


class NewsFeedOut(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    source: str
    published_at: datetime
    category: str | None
    summary: str | None = None
    price_impact_pct: float | None = None
    affected_plant_name: str | None = None

    model_config = {"from_attributes": True}


class NewsFeedCreate(BaseModel):
    title: str
    url: str
    source: str
    published_at: datetime
    category: str | None = None
    summary: str | None = None
    price_impact_pct: float | None = None
    affected_plant_name: str | None = None


class NewsFeedUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    price_impact_pct: float | None = None
    affected_plant_name: str | None = None
    category: str | None = None
