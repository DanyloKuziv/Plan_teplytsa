import uuid
from datetime import datetime
from sqlalchemy import Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    greenhouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False, index=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity_air: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity_soil: Mapped[float | None] = mapped_column(Float, nullable=True)
    co2_ppm: Mapped[float | None] = mapped_column(Float, nullable=True)
    o2_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    light_lux: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    greenhouse: Mapped["Greenhouse"] = relationship("Greenhouse", back_populates="sensor_logs")
