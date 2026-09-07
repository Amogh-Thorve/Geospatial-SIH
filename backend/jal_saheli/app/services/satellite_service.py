"""
app/services/satellite_service.py
Satellite cross-check verification service — Phase 7 implementation.

This module is the single entry point for satellite verification called from
the verification pipeline (verification_service.py) and API endpoints.

Architecture:
    verify_submission()
          ↓
    SatelliteVerificationService (orchestration, retries, idempotency)
          ↓
    SatelliteProvider interface (replaceable)
          ↓
    CDSESatelliteProvider (primary, open access)
       or PlanetaryComputerProvider (alternative)
       or test mock

IMPORTANT:
    satellite_confidence in the returned dict is ALWAYS 0.0 when the status is
    not SATELLITE_OK. The verification pipeline must not treat non-OK results
    as valid confidence scores.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.satellite_client import get_satellite_provider
from app.models.submission import Submission
from app.services.satellite_verification_service import SatelliteVerificationService

logger = logging.getLogger("jal_saheli.services.satellite")


async def verify_submission(
    submission: Submission,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Run satellite imagery verification on a submission.

    Delegates to SatelliteVerificationService which handles:
      - Idempotency (returns cached result if already verified)
      - Provider selection (replaceable via set_satellite_provider())
      - Coordinate validation
      - Bounded retries (up to 3 attempts on transient failures)
      - All error codes (SATELLITE_OK, SATELLITE_UNAVAILABLE, etc.)
      - DB persistence (VerificationEvent + satellite_confidence)

    Returns:
        dict containing at minimum:
          submission_id, satellite_confidence, status, result,
          scene_id, imagery_date, cloud_cover_pct, evidence

    Never raises — all errors produce structured result dicts.
    """
    service = SatelliteVerificationService(provider=get_satellite_provider())
    result = await service.verify(submission, db)

    logger.info(
        "Satellite verification returned",
        extra={
            "submission_id": submission.id,
            "status": result.get("status"),
            "satellite_confidence": result.get("satellite_confidence"),
            "scene_id": result.get("scene_id"),
        },
    )
    return result
