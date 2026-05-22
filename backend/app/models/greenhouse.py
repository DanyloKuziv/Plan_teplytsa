import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class HeatingType(str, enum.Enum):
    gas = "gas"
    wood = "wood"
    electric = "electric"
    heat_pump = "heat_pump"


class InsulationType(str, enum.Enum):
    none = "none"
    basic = "basic"
    good = "good"


class Greenhouse(Base):
    __tablename__ = "greenhouses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_area: Mapped[float] = mapped_column(Float, nullable=False)
    heating_type: Mapped[HeatingType] = mapped_column(SAEnum(HeatingType), nullable=False)
    heating_power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_cost_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    insulation_type: Mapped[InsulationType] = mapped_column(SAEnum(InsulationType), nullable=False, default=InsulationType.basic)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_health_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_health_updated: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="greenhouses")
    zones: Mapped[list["Zone"]] = relationship("Zone", back_populates="greenhouse", cascade="all, delete-orphan")
    planting_plans: Mapped[list["PlantingPlan"]] = relationship("PlantingPlan", back_populates="greenhouse")
    sensor_logs: Mapped[list["SensorLog"]] = relationship("SensorLog", back_populates="greenhouse", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="greenhouse", cascade="all, delete-orphan")
    floor_plan: Mapped["GreenhouseFloorPlan | None"] = relationship("GreenhouseFloorPlan", back_populates="greenhouse", uselist=False, cascade="all, delete-orphan")
