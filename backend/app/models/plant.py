import uuid
from sqlalchemy import String, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Plant(Base):
    __tablename__ = "plants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    grow_days: Mapped[int] = mapped_column(Integer, nullable=False)
    plants_per_m2: Mapped[float] = mapped_column(Float, nullable=False)
    seed_weight_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.01)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    farmer_plants: Mapped[list["FarmerPlant"]] = relationship("FarmerPlant", back_populates="plant")
    market_prices: Mapped[list["MarketPrice"]] = relationship("MarketPrice", back_populates="plant")
