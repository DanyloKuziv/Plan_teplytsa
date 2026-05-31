import uuid
from sqlalchemy import String, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    greenhouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area: Mapped[float] = mapped_column(Float, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    farmer_plant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("farmer_plants.id", ondelete="SET NULL"), nullable=True)

    greenhouse: Mapped["Greenhouse"] = relationship("Greenhouse", back_populates="zones")
    planting_plans: Mapped[list["PlantingPlan"]] = relationship("PlantingPlan", back_populates="zone")
