"""
app/models/earnings.py
EarningsLedger — one transaction row per verified submission reward.

Created automatically by the verification engine when a submission
reaches VERIFIED status (Phase 8). For Phase 3, this table is
empty until verifications run.
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class EarningsStatus(str, enum.Enum):
    PENDING = "pending"       # Queued for payment
    CREDITED = "credited"     # DBT/UPI credited
    FAILED = "failed"         # Payment failed


class EarningsLedger(Base):
    __tablename__ = "earnings_ledger"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # TXN-XXXXXX
    submission_id: Mapped[str] = mapped_column(
        String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cadre_id: Mapped[str] = mapped_column(
        String, ForeignKey("cadre_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    observation_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    type_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)     # INR integer
    status: Mapped[EarningsStatus] = mapped_column(
        SAEnum(EarningsStatus, name="earnings_status", create_constraint=True),
        default=EarningsStatus.PENDING,
        nullable=False,
    )
    method: Mapped[str] = mapped_column(String(60), default="UPI / Jan Dhan", nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    submission: Mapped["Submission"] = relationship(  # noqa: F821
        "Submission", back_populates="earnings_record"
    )
    cadre: Mapped["CadreProfile"] = relationship(  # noqa: F821
        "CadreProfile", back_populates="earnings"
    )

    def __repr__(self) -> str:
        return f"<EarningsLedger id={self.id!r} amount=₹{self.amount} status={self.status!r}>"
