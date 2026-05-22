import uuid
import enum
from sqlalchemy import String, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class GrowthPhase(str, enum.Enum):
    seedling = "seedling"
    growth = "growth"
    flowering = "flowering"
    ripening = "ripening"


class Fertilizer(Base):
    __tablename__ = "fertilizers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    npk_formula: Mapped[str] = mapped_column(String(50), nullable=False)
    phase: Mapped[GrowthPhase] = mapped_column(SAEnum(GrowthPhase), nullable=False)
    dose_per_m2: Mapped[float] = mapped_column(Float, nullable=False, comment="g/m²")
    price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)

    fertilizer_schedules: Mapped[list["FertilizerSchedule"]] = relationship("FertilizerSchedule", back_populates="fertilizer")
