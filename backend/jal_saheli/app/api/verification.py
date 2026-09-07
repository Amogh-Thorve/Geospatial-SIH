"""
app/api/verification.py
Verification pipeline endpoints:
  - GET  /verification-history
  - GET  /submissions/{id}/ai-result
  - GET  /submissions/{id}/satellite-result
  - GET  /submissions/{id}/verification
  - POST /submissions/{id}/verify
"""
from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.models.profile import CadreProfile
from app.models.submission import Submission
from app.schemas.submission import VerificationHistoryItem
from app.services import ai_service, satellite_service, submission_service, verification_service
from app.utils.auth import get_current_cadre

logger = logging.getLogger("jal_saheli.api.verification")

router = APIRouter(tags=["Verification"])


async def _get_cadre_submission(
    submission_id: str,
    cadre: CadreProfile,
    db: AsyncSession,
) -> Submission:
    """Helper to load submission and ensure cadre ownership."""
    res = await db.execute(
        select(Submission).where(
            Submission.id == submission_id,
            Submission.cadre_id == cadre.id,
        )
    )
    sub = res.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": f"Submission {submission_id} not found"},
        )
    return sub


@router.get(
    "/verification-history",
    response_model=list[VerificationHistoryItem],
    summary="List verified and rejected submissions history",
)
async def get_verification_history(
    response: Response,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> list[VerificationHistoryItem]:
    """
    Return paginated history of observations that have reached a terminal
    status (VERIFIED or REJECTED) with AI and satellite confidence scores.
    Returns real database records only.
    """
    items, total = await submission_service.list_verification_history(
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
    "/submissions/{submission_id}/ai-result",
    summary="Get AI vision analysis result for a submission",
)
async def get_ai_result(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """
    Fetch AI vision classification (GeoBrain-v3) for an observation.
    Runs analysis if not yet performed.
    """
    sub = await _get_cadre_submission(submission_id, cadre, db)
    return await ai_service.analyze_submission(sub, db)


@router.get(
    "/submissions/{submission_id}/satellite-result",
    summary="Get Sentinel-2 satellite cross-check result for a submission",
)
async def get_satellite_result(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """
    Fetch satellite cross-check (Sentinel-2 MSI) spectral audit for an observation.
    Runs satellite check if not yet performed.
    """
    sub = await _get_cadre_submission(submission_id, cadre, db)
    return await satellite_service.verify_submission(sub, db)


@router.get(
    "/submissions/{submission_id}/verification",
    summary="Get final dual-engine consensus decision",
)
async def get_final_verification(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """
    Fetch final verification consensus decision.
    Runs dual-engine pipeline if not yet completed.
    """
    sub = await _get_cadre_submission(submission_id, cadre, db)
    return await verification_service.get_latest_verification_result(sub, db)


@router.post(
    "/submissions/{submission_id}/verify",
    summary="Trigger dual-engine verification pipeline",
)
async def trigger_verification(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """
    Explicitly trigger the full dual-engine verification pipeline:
    AI Vision + Sentinel-2 Satellite → Weighted consensus → Incentive credit.
    """
    sub = await _get_cadre_submission(submission_id, cadre, db)
    return await verification_service.run_full_verification(sub, db)
