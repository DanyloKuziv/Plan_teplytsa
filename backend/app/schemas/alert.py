import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.alert import AlertType


class AlertOut(BaseModel):
    id: uuid.UUID
    greenhouse_id: uuid.UUID
    type: AlertType
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
