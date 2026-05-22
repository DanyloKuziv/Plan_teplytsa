import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HarvestRecord(Base):
    __tablename__ = "harvest_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("planting_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    actual_yield_kg: Mapped[float] = mapped_column(Float, nullable=False)
    revenue: Mapped[float] = mapped_column(Float, nullable=False)
    costs: Mapped[float] = mapped_column(Float, nullable=False)
    harvested_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    plan: Mapped["PlantingPlan"] = relationship("PlantingPlan", back_populates="harvest_records")
