"""
app/services/ai_analysis_service.py
AIAnalysisService — orchestrates provider selection, bounded retries,
idempotency checking, DB persistence, and structured error handling.

Architecture:
    AIAnalysisService
          ↓
    AIProvider interface (replaceable)
          ↓
    Configured provider (GenericHTTPAIProvider, or future vendors)

Idempotency:
    If a successful AI VerificationEvent already exists for a submission,
    the stored result is returned immediately without re-calling the provider.

Retry policy:
    Up to MAX_RETRIES attempts on transient AIUnavailableError.
    No retry on AINotConfiguredError or AIResponseError (non-transient).

Status codes stored in VerificationEvent.result_json["status"]:
    "AI_OK"                — provider returned valid result
    "AI_NOT_CONFIGURED"    — AI_SERVICE_URL / credentials missing
    "AI_UNAVAILABLE"       — provider failed (retries exhausted)
    "AI_RESPONSE_INVALID"  — provider returned unreadable response
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.ai_provider import (
    AIAnalysisResult,
    AINotConfiguredError,
    AIProvider,
    AIProviderError,
    AIResponseError,
    AIUnavailableError,
)
from app.models.submission import Submission
from app.models.verification import VerificationEvent

logger = logging.getLogger("jal_saheli.services.ai_analysis")

# Retry policy constants
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 1.0   # exponential back-off base
ENGINE_NAME = "geobrain_v3"


def _error_payload(
    submission_id: str,
    code: str,
    message: str,
    *,
    provider: str = "none",
) -> dict[str, Any]:
    """Build a structured error result dict stored in the DB audit trail."""
    return {
        "submission_id": submission_id,
        "provider": provider,
        "model": "none",
        "result": code,
        "confidence": 0.0,
        "confidence_display": "0%",
        "detected_features": [],
        "observations": [],
        "status": code,
        "error_message": message,
    }


class AIAnalysisService:
    """
    Coordinates AI vision analysis for a Submission.

    Usage:
        service = AIAnalysisService(provider=GenericHTTPAIProvider())
        result = await service.analyze(submission, db)
    """

    def __init__(self, provider: AIProvider) -> None:
        self._provider = provider

    # ─────────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────────

    async def analyze(
        self,
        submission: Submission,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Run AI vision analysis on submission.

        1. Check idempotency — return cached result if already analyzed.
        2. Check provider configuration — return AI_NOT_CONFIGURED if missing.
        3. Call provider with bounded retries.
        4. Validate response (provider handles this; re-raise as structured error).
        5. Persist VerificationEvent and update submission.ai_confidence.
        6. Return result dict.

        This method never raises — all errors are captured and returned as
        structured dicts with status != "AI_OK".
        """
        submission_id = submission.id

        # ── 1. Idempotency check ──────────────────────────────────────────────
        existing = await self._load_existing_result(submission_id, db)
        if existing is not None:
            logger.info(
                "AI analysis idempotent: returning cached result",
                extra={"submission_id": submission_id},
            )
            return existing

        # ── 2. Configuration check ────────────────────────────────────────────
        if not self._provider.is_configured():
            logger.warning(
                "AI provider not configured — returning AI_NOT_CONFIGURED",
                extra={"submission_id": submission_id},
            )
            payload = _error_payload(
                submission_id,
                "AI_NOT_CONFIGURED",
                "AI_SERVICE_URL is not configured. Set credentials in environment.",
            )
            await self._persist_result(payload, submission, db, engine=ENGINE_NAME)
            return payload

        # ── 3. Call provider with bounded retries ─────────────────────────────
        last_error: AIProviderError | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result: AIAnalysisResult = await self._provider.analyze(
                    submission_id=submission_id,
                    observation_type=submission.observation_type,
                    photo_url=submission.photo_url,
                    latitude=submission.latitude,
                    longitude=submission.longitude,
                    description=submission.description,
                )
                # ── Success: persist and return ───────────────────────────────
                payload = {**result.to_dict(), "status": "AI_OK"}
                await self._persist_result(payload, submission, db, engine=ENGINE_NAME)
                return payload

            except AINotConfiguredError as exc:
                # Non-transient — do NOT retry
                logger.warning(
                    "AI provider not configured during call",
                    extra={"submission_id": submission_id, "error": str(exc)},
                )
                payload = _error_payload(submission_id, "AI_NOT_CONFIGURED", str(exc))
                await self._persist_result(payload, submission, db, engine=ENGINE_NAME)
                return payload

            except AIResponseError as exc:
                # Non-transient — do NOT retry (malformed response won't heal on retry)
                logger.error(
                    "AI provider returned invalid response",
                    extra={"submission_id": submission_id, "error": str(exc)},
                )
                payload = _error_payload(
                    submission_id, "AI_RESPONSE_INVALID", str(exc),
                    provider=getattr(self._provider, "_provider_name", "http"),
                )
                await self._persist_result(payload, submission, db, engine=ENGINE_NAME)
                return payload

            except AIUnavailableError as exc:
                last_error = exc
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "AI provider unavailable — retrying",
                        extra={
                            "submission_id": submission_id,
                            "attempt": attempt,
                            "max": MAX_RETRIES,
                            "delay_s": delay,
                            "error": str(exc),
                        },
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "AI provider unavailable — retries exhausted",
                        extra={
                            "submission_id": submission_id,
                            "attempts": MAX_RETRIES,
                            "error": str(exc),
                        },
                    )

        # ── 4. All retries exhausted ──────────────────────────────────────────
        msg = str(last_error) if last_error else "Unknown provider error"
        payload = _error_payload(
            submission_id, "AI_UNAVAILABLE", msg,
            provider=getattr(self._provider, "_provider_name", "http"),
        )
        await self._persist_result(payload, submission, db, engine=ENGINE_NAME)
        return payload

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _load_existing_result(
        self,
        submission_id: str,
        db: AsyncSession,
    ) -> dict[str, Any] | None:
        """
        Return the stored result JSON if a successful AI analysis event exists,
        otherwise None.
        Only cached results with status AI_OK are considered idempotent hits.
        """
        stmt = (
            select(VerificationEvent)
            .where(
                VerificationEvent.submission_id == submission_id,
                VerificationEvent.engine == ENGINE_NAME,
            )
            .order_by(VerificationEvent.created_at.desc())
            .limit(1)
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row and row.result_json and row.result_json.get("status") == "AI_OK":
            return row.result_json
        return None

    async def _persist_result(
        self,
        payload: dict[str, Any],
        submission: Submission,
        db: AsyncSession,
        engine: str = ENGINE_NAME,
    ) -> None:
        """
        Persist AI analysis result to VerificationEvent and update
        submission.ai_confidence.

        Only writes ai_confidence when provider returned a real score (AI_OK).
        """
        confidence = payload.get("confidence", 0.0) if payload.get("status") == "AI_OK" else None
        if confidence is not None:
            submission.ai_confidence = confidence

        event = VerificationEvent(
            submission_id=submission.id,
            engine=engine,
            confidence=confidence,
            result_json=payload,
        )
        db.add(event)
        await db.flush()
