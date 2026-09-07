"""
app/models/verification.py
VerificationEvent — audit trail for each engine pass on a submission.

One row per engine run:
  engine = "geobrain_v3"   → AI photo classification result
  engine = "sentinel_2"    → Satellite cross-check result
  engine = "final"         → Combined consensus decision
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class VerificationEvent(Base):
    __tablename__ = "verification_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(
        String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    engine: Mapped[str] = mapped_column(String(40), nullable=False)   # geobrain_v3 | sentinel_2 | final
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    submission: Mapped["Submission"] = relationship(  # noqa: F821
        "Submission", back_populates="verification_events"
    )

    def __repr__(self) -> str:
        return f"<VerificationEvent sub={self.submission_id!r} engine={self.engine!r} conf={self.confidence}>"
