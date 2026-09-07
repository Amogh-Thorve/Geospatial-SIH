"""
app/services/profile_service.py
Cadre profile reads with live aggregated stats from the database.
No hardcoded values — everything computed from real records.
"""
from __future__ import annotations

import logging
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import CadreProfile
from app.models.submission import Submission, SubmissionStatus
from app.models.earnings import EarningsLedger, EarningsStatus
from app.schemas.profile import ProfileResponse, ProfileStats

logger = logging.getLogger("jal_saheli.services.profile")


async def get_profile(cadre: CadreProfile, db: AsyncSession) -> ProfileResponse:
    """
    Build a ProfileResponse with live stats aggregated from the database.
    Returns real counts — 0 if no records exist.
    """
    cadre_id = cadre.id

    # ── Submission counts ────────────────────────────────────────────────────
    counts_q = await db.execute(
        select(
            Submission.status,
            func.count(Submission.id).label("cnt"),
        )
        .where(Submission.cadre_id == cadre_id)
        .group_by(Submission.status)
    )
    counts: dict[str, int] = {row.status: row.cnt for row in counts_q}

    total = sum(counts.values())
    verified = counts.get(SubmissionStatus.VERIFIED, 0)
    rejected = counts.get(SubmissionStatus.REJECTED, 0)
    pending = counts.get(SubmissionStatus.PENDING, 0) + counts.get(SubmissionStatus.PROCESSING, 0)
    resolved = verified + rejected

    accuracy_rate: float | None = None
    if resolved > 0:
        accuracy_rate = round((verified / resolved) * 100, 1)

    # ── Total credited earnings ───────────────────────────────────────────────
    earnings_q = await db.execute(
        select(func.coalesce(func.sum(EarningsLedger.amount), 0))
        .where(
            EarningsLedger.cadre_id == cadre_id,
            EarningsLedger.status == EarningsStatus.CREDITED,
        )
    )
    total_earnings: int = earnings_q.scalar_one()

    stats = ProfileStats(
        total_submissions=total,
        verified_count=verified,
        pending_count=pending,
        rejected_count=rejected,
        accuracy_rate=accuracy_rate,
        total_earnings_raw=total_earnings,
        total_earnings_display=f"₹{total_earnings:,}",
    )

    return ProfileResponse(
        id=cadre.id,
        name=cadre.name,
        phone=cadre.phone,
        village=cadre.village,
        telegram_handle=cadre.telegram_handle,
        member_since=cadre.created_at.date().isoformat(),
        stats=stats,
    )
