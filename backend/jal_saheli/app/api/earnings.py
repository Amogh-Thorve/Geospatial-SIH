"""
app/api/earnings.py
Cadre earnings and incentive ledger endpoints.
Reads real transaction records and aggregates live totals from database.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.models.profile import CadreProfile
from app.schemas.earnings import EarningsLedgerItem, EarningsSummary
from app.services import earnings_service
from app.utils.auth import get_current_cadre

logger = logging.getLogger("jal_saheli.api.earnings")

router = APIRouter(tags=["Earnings"])


@router.get(
    "/earnings",
    response_model=list[EarningsLedgerItem],
    summary="List earnings ledger items for authenticated cadre",
)
async def list_cadre_earnings(
    response: Response,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> list[EarningsLedgerItem]:
    """
    Return paginated earnings ledger transactions for the authenticated cadre.
    Returns real database records only (empty array if no transactions exist).
    """
    items, total = await earnings_service.list_earnings(
        cadre=cadre,
        db=db,
        page=page,
        page_size=page_size,
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    return items


@router.get(
    "/earnings/summary",
    response_model=EarningsSummary,
    summary="Get aggregated earnings summary for authenticated cadre",
)
async def get_earnings_summary(
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> EarningsSummary:
    """
    Return aggregated earnings summary (total credited, this month, pending,
    transaction count, and breakdown by observation type).
    All figures calculated live from real database records.
    """
    return await earnings_service.get_earnings_summary(cadre=cadre, db=db)
