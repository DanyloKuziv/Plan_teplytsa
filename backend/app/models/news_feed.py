import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class NewsFeed(Base):
    __tablename__ = "news_feed"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_impact_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    affected_plant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
