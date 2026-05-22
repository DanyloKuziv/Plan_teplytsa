import uuid
from datetime import date
from sqlalchemy import ForeignKey, Float, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.fertilizer import GrowthPhase


class IrrigationSchedule(Base):
    __tablename__ = "irrigation_schedules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("planting_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    volume_liters: Mapped[float] = mapped_column(Float, nullable=False)
    growth_phase: Mapped[GrowthPhase] = mapped_column(SAEnum(GrowthPhase), nullable=False)

    plan: Mapped["PlantingPlan"] = relationship("PlantingPlan", back_populates="irrigation_schedules")
