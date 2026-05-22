import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="0")
    verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    verification_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    reset_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    reset_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    greenhouses: Mapped[list["Greenhouse"]] = relationship("Greenhouse", back_populates="user", cascade="all, delete-orphan")
    farmer_plants: Mapped[list["FarmerPlant"]] = relationship("FarmerPlant", back_populates="user", cascade="all, delete-orphan")
