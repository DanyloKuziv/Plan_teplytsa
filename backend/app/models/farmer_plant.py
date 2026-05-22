import uuid
from sqlalchemy import ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class FarmerPlant(Base):
    __tablename__ = "farmer_plants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    yield_per_m2: Mapped[float] = mapped_column(Float, nullable=False)
    water_seedling: Mapped[float] = mapped_column(Float, nullable=False, comment="L/m²/day")
    water_growth: Mapped[float] = mapped_column(Float, nullable=False, comment="L/m²/day")
    water_flowering: Mapped[float] = mapped_column(Float, nullable=False, comment="L/m²/day")
    water_ripening: Mapped[float] = mapped_column(Float, nullable=False, comment="L/m²/day")
    sell_price: Mapped[float] = mapped_column(Float, nullable=False, comment="UAH/kg")
    seed_price: Mapped[float] = mapped_column(Float, nullable=False, default=2.0, comment="UAH/plant")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="farmer_plants")
    plant: Mapped["Plant"] = relationship("Plant", back_populates="farmer_plants")
    planting_plans: Mapped[list["PlantingPlan"]] = relationship("PlantingPlan", back_populates="farmer_plant")
