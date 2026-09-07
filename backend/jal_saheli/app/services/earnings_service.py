"""
app/services/earnings_service.py
Earnings ledger reads — returns real DB records only.
Empty results when no verified submissions exist.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.earnings import EarningsLedger, EarningsStatus
from app.models.profile import CadreProfile
from app.models.submission import Submission
from app.schemas.earnings import (
    EarningsLedgerItem,
    EarningsSummary,
    ByTypeBreakdown,
)
from app.services.earnings_policy import EarningsPolicy, StandardEarningsPolicy
from app.utils.id_generator import generate_transaction_id

logger = logging.getLogger("jal_saheli.services.earnings")


def _fmt(amount: int) -> str:
    return f"₹{amount:,}"


class EarningsService:
    """
    Service coordinating earnings policies, eligibility verification,
    and ledger transactions with idempotency guarantees.
    """

    def __init__(self, policy: EarningsPolicy | None = None) -> None:
        self.policy: EarningsPolicy = policy or StandardEarningsPolicy()

    async def process_submission_earnings(
        self,
        submission: Submission,
        db: AsyncSession,
    ) -> tuple[EarningsLedger | None, bool]:
        """
        Evaluate earnings for a submission and record in the ledger if eligible.

        Returns:
            (ledger_entry, is_newly_created)

        Guarantees:
            - Never creates duplicate earnings for the same submission_id.
            - Only verified observations are rewarded.
            - Real DB records only (no fabricated balances or demo entries).
        """
        # Idempotency guard: check if already exists
        exist_q = await db.execute(
            select(EarningsLedger).where(EarningsLedger.submission_id == submission.id)
        )
        existing = exist_q.scalar_one_or_none()
        if existing is not None:
            logger.info(
                "Earnings already recorded for submission (idempotent)",
                extra={"submission_id": submission.id, "txn_id": existing.id, "amount": existing.amount},
            )
            return existing, False

        # Evaluate eligibility and amount using configured policy
        eligibility = self.policy.evaluate(submission)
        if not eligibility.is_eligible or eligibility.amount <= 0:
            logger.info(
                "Submission not eligible for earnings",
                extra={"submission_id": submission.id, "reason": eligibility.reason},
            )
            return None, False

        # Create new ledger entry
        ledger_entry = EarningsLedger(
            id=generate_transaction_id(),
            submission_id=submission.id,
            cadre_id=submission.cadre_id,
            observation_type=submission.observation_type,
            type_label=submission.type_label,
            amount=eligibility.amount,
            status=EarningsStatus.CREDITED,
            method="UPI / Jan Dhan",
            note=f"Cadre incentive: {eligibility.reason}",
        )
        db.add(ledger_entry)
        await db.flush()

        logger.info(
            "Earnings credited to cadre ledger",
            extra={
                "submission_id": submission.id,
                "txn_id": ledger_entry.id,
                "amount": ledger_entry.amount,
                "cadre_id": submission.cadre_id,
            },
        )
        return ledger_entry, True


_earnings_service_instance: EarningsService | None = None


def get_earnings_service() -> EarningsService:
    global _earnings_service_instance
    if _earnings_service_instance is None:
        _earnings_service_instance = EarningsService()
    return _earnings_service_instance


def set_earnings_service(service: EarningsService) -> None:
    global _earnings_service_instance
    _earnings_service_instance = service


def reset_earnings_service() -> None:
    global _earnings_service_instance
    _earnings_service_instance = None


async def process_submission_earnings(
    submission: Submission,
    db: AsyncSession,
) -> tuple[EarningsLedger | None, bool]:
    """Module-level convenience delegating to the singleton EarningsService."""
    return await get_earnings_service().process_submission_earnings(submission, db)


async def list_earnings(
    cadre: CadreProfile,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[EarningsLedgerItem], int]:
    """
    Return paginated earnings ledger items for a cadre.
    Returns empty list when no earnings exist (not an error).
    """
    q = select(EarningsLedger).where(EarningsLedger.cadre_id == cadre.id)
    count_q = select(func.count()).select_from(q.subquery())
    total: int = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    q = q.order_by(EarningsLedger.created_at.desc()).offset(offset).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    items = [
        EarningsLedgerItem(
            id=row.id,
            submission_id=row.submission_id,
            observation_type=row.observation_type or "",
            type_label=row.type_label,
            amount=row.amount,
            amount_display=_fmt(row.amount),
            status=row.status,
            method=row.method,
            note=row.note,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return items, total


async def get_earnings_summary(
    cadre: CadreProfile,
    db: AsyncSession,
) -> EarningsSummary:
    """
    Compute aggregated earnings stats from real DB records.
    All values are 0 if no earnings exist.
    """
    cadre_id = cadre.id
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total credited
    total_q = await db.execute(
        select(func.coalesce(func.sum(EarningsLedger.amount), 0)).where(
            EarningsLedger.cadre_id == cadre_id,
            EarningsLedger.status == EarningsStatus.CREDITED,
        )
    )
    total_credited: int = total_q.scalar_one()

    # This month credited
    month_q = await db.execute(
        select(func.coalesce(func.sum(EarningsLedger.amount), 0)).where(
            EarningsLedger.cadre_id == cadre_id,
            EarningsLedger.status == EarningsStatus.CREDITED,
            EarningsLedger.created_at >= month_start,
        )
    )
    this_month: int = month_q.scalar_one()

    # Pending
    pending_q = await db.execute(
        select(func.coalesce(func.sum(EarningsLedger.amount), 0)).where(
            EarningsLedger.cadre_id == cadre_id,
            EarningsLedger.status == EarningsStatus.PENDING,
        )
    )
    pending: int = pending_q.scalar_one()

    # Transaction count
    count_q = await db.execute(
        select(func.count(EarningsLedger.id)).where(EarningsLedger.cadre_id == cadre_id)
    )
    txn_count: int = count_q.scalar_one()

    # By-type breakdown
    breakdown_q = await db.execute(
        select(
            EarningsLedger.observation_type,
            EarningsLedger.type_label,
            func.count(EarningsLedger.id).label("cnt"),
            func.sum(EarningsLedger.amount).label("total"),
        )
        .where(
            EarningsLedger.cadre_id == cadre_id,
            EarningsLedger.status == EarningsStatus.CREDITED,
        )
        .group_by(EarningsLedger.observation_type, EarningsLedger.type_label)
        .order_by(func.sum(EarningsLedger.amount).desc())
    )
    by_type = [
        ByTypeBreakdown(
            observation_type=row.observation_type or "",
            type_label=row.type_label,
            count=row.cnt,
            total_amount=row.total,
        )
        for row in breakdown_q
    ]

    return EarningsSummary(
        total_credited=total_credited,
        total_credited_display=_fmt(total_credited),
        this_month_credited=this_month,
        this_month_display=_fmt(this_month),
        pending_amount=pending,
        pending_display=_fmt(pending),
        transaction_count=txn_count,
        by_type=by_type,
    )
