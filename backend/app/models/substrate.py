import uuid
from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Substrate(Base):
    __tablename__ = "substrates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    water_coefficient: Mapped[float] = mapped_column(Float, nullable=False)
    growth_modifier:   Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    yield_modifier:    Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    planting_plans: Mapped[list["PlantingPlan"]] = relationship("PlantingPlan", back_populates="substrate")
