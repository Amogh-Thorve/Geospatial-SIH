"""
app/api/profile.py
Cadre profile endpoint.
Reads real profile and real aggregated statistics from database.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.models.profile import CadreProfile
from app.schemas.profile import ProfileResponse
from app.services import profile_service
from app.utils.auth import get_current_cadre

logger = logging.getLogger("jal_saheli.api.profile")

router = APIRouter(tags=["Profile"])


@router.get(
    "/profile",
    response_model=ProfileResponse,
    summary="Get authenticated cadre profile and live stats",
)
async def get_cadre_profile(
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> ProfileResponse:
    """
    Return the authenticated cadre's profile details along with
    live calculated performance statistics from real database records.
    """
    return await profile_service.get_profile(cadre, db)
