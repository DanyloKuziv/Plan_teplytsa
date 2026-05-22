import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class GreenhouseFloorPlan(Base):
    __tablename__ = "greenhouse_floor_plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    greenhouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("greenhouses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    grid_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    equipment: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    greenhouse: Mapped["Greenhouse"] = relationship("Greenhouse", back_populates="floor_plan")
