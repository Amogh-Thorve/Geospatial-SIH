"""
app/models/profile.py
CadreProfile — one row per registered Jal Saheli field worker.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class CadreProfile(Base):
    __tablename__ = "cadre_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    village: Mapped[str | None] = mapped_column(String(120), nullable=True)
    telegram_handle: Mapped[str | None] = mapped_column(String(80), nullable=True)
    telegram_user_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, nullable=True, index=True
    )
    preferred_language: Mapped[str] = mapped_column(
        String(10), default="en", server_default="en", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        "Submission", back_populates="cadre", lazy="select"
    )
    earnings: Mapped[list["EarningsLedger"]] = relationship(  # noqa: F821
        "EarningsLedger", back_populates="cadre", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<CadreProfile id={self.id!r} phone={self.phone!r} name={self.name!r}>"

