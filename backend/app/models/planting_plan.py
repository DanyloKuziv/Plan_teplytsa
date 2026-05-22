import uuid
from datetime import date
from sqlalchemy import ForeignKey, Float, Date, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class PlantingPlan(Base):
    __tablename__ = "planting_plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    greenhouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    farmer_plant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmer_plants.id", ondelete="CASCADE"), nullable=False, index=True)
    substrate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("substrates.id"), nullable=False, index=True)
    area: Mapped[float] = mapped_column(Float, nullable=False)
    planted_at: Mapped[date] = mapped_column(Date, nullable=False)
    expected_harvest_at: Mapped[date] = mapped_column(Date, nullable=False)
    # "pending" → tasks queued, "ready" → schedules generated, "error" → task failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ready", server_default="ready")
    harvest_notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    irrigation_coverage: Mapped[float] = mapped_column(Float, nullable=False, default=100.0, server_default="100")
    heating_coverage: Mapped[float] = mapped_column(Float, nullable=False, default=100.0, server_default="100")

    greenhouse: Mapped["Greenhouse"] = relationship("Greenhouse", back_populates="planting_plans")
    zone: Mapped["Zone"] = relationship("Zone", back_populates="planting_plans")
    farmer_plant: Mapped["FarmerPlant"] = relationship("FarmerPlant", back_populates="planting_plans")
    substrate: Mapped["Substrate"] = relationship("Substrate", back_populates="planting_plans")
    irrigation_schedules: Mapped[list["IrrigationSchedule"]] = relationship("IrrigationSchedule", back_populates="plan", cascade="all, delete-orphan")
    fertilizer_schedules: Mapped[list["FertilizerSchedule"]] = relationship("FertilizerSchedule", back_populates="plan", cascade="all, delete-orphan")
    harvest_records: Mapped[list["HarvestRecord"]] = relationship("HarvestRecord", back_populates="plan", cascade="all, delete-orphan")
