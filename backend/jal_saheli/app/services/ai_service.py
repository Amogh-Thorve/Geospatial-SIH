"""
app/services/ai_service.py
AI Vision observation analysis service — Phase 6 implementation.

This module is the single entry point for AI analysis called from
the verification pipeline (verification_service.py) and API endpoints.

Architecture:
    analyze_submission()
          ↓
    AIAnalysisService (orchestration, retries, idempotency)
          ↓
    AIProvider interface (replaceable)
          ↓
    GenericHTTPAIProvider (or test mock)

The legacy analyze_observation() shim in ai_client.py is preserved
for backward compatibility with any code that still calls it directly.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.ai_client import get_ai_provider
from app.models.submission import Submission
from app.services.ai_analysis_service import AIAnalysisService

logger = logging.getLogger("jal_saheli.services.ai")


async def analyze_submission(
    submission: Submission,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Run AI vision analysis on a submission.

    Delegates to AIAnalysisService which handles:
      - Idempotency (returns cached result if already analyzed)
      - Provider selection (replaceable via set_ai_provider())
      - Bounded retries (up to 3 attempts on transient failures)
      - Response validation
      - DB persistence (writes VerificationEvent + updates ai_confidence)
      - Structured error results (AI_NOT_CONFIGURED, AI_UNAVAILABLE, etc.)

    Returns:
        dict with at minimum:
          submission_id, provider, model, result, confidence,
          confidence_display, detected_features, observations, status

    Never raises — all errors produce structured result dicts.
    """
    service = AIAnalysisService(provider=get_ai_provider())
    result = await service.analyze(submission, db)

    logger.info(
        "AI analysis returned",
        extra={
            "submission_id": submission.id,
            "status": result.get("status"),
            "confidence": result.get("confidence"),
            "model": result.get("model"),
        },
    )
    return result
