"""
app/services/satellite_verification_service.py
SatelliteVerificationService — orchestrates provider selection, bounded retries,
idempotency, DB persistence, and structured error handling.

Architecture:
    SatelliteVerificationService
              ↓
    SatelliteProvider interface (replaceable)
              ↓
    CDSESatelliteProvider (primary, open-access)
    PlanetaryComputerProvider (secondary/fallback)

Idempotency:
    If a successful SATELLITE_OK VerificationEvent already exists for a submission,
    the stored result is returned immediately without re-querying.

Retry policy:
    Up to MAX_RETRIES attempts on transient SatelliteUnavailableError.
    No retry on SatelliteNotConfiguredError or NoSatelliteDataError (non-transient).

Status codes stored in VerificationEvent.result_json["status"]:
    "SATELLITE_OK"              — real scene found, confidence from real data
    "SATELLITE_NOT_CONFIGURED"  — credentials missing (for auth-required providers)
    "SATELLITE_UNAVAILABLE"     — provider failed (retries exhausted)
    "NO_SATELLITE_DATA"         — search returned no matching scenes
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.satellite_provider import (
    NoSatelliteDataError,
    SatelliteNotConfiguredError,
    SatelliteProvider,
    SatelliteProviderError,
    SatelliteUnavailableError,
    SatelliteVerificationResult,
)
from app.models.submission import Submission
from app.models.verification import VerificationEvent

logger = logging.getLogger("jal_saheli.services.satellite_verification")

MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 2.0
ENGINE_NAME = "sentinel_2"


def _error_payload(
    submission_id: str,
    code: str,
    message: str,
    *,
    provider: str = "none",
) -> dict[str, Any]:
    """Build a structured error result dict for DB storage."""
    return {
        "submission_id": submission_id,
        "provider": provider,
        "scene_id": "N/A",
        "imagery_date": None,
        "confidence": 0.0,
        "satellite_confidence": 0.0,
        "satellite_confidence_display": "0%",
        "confidence_display": "0%",
        "result": code,
        "status": code,
        "cloud_cover_pct": None,
        "temporal_gap_days": None,
        "water_percentage": None,
        "vegetation_percentage": None,
        "metadata": {},
        "evidence": [],
        "error_message": message,
        # Legacy compat
        "spectral_index": "N/A",
        "sensor": "Sentinel-2 MSI",
        "tile_id": "N/A",
        "ndwi_delta": "N/A",
    }


class SatelliteVerificationService:
    """
    Coordinates satellite imagery verification for a Submission.

    Usage:
        service = SatelliteVerificationService(provider=CDSESatelliteProvider())
        result = await service.verify(submission, db)
    """

    def __init__(self, provider: SatelliteProvider) -> None:
        self._provider = provider

    # ─────────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────────

    async def verify(
        self,
        submission: Submission,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Run satellite imagery verification on a submission.

        1. Check idempotency — return cached result if already verified.
        2. Check coordinates — cannot proceed without valid lat/lng.
        3. Check provider configuration.
        4. Call provider with bounded retries.
        5. Persist VerificationEvent and update submission.satellite_confidence.
        6. Return result dict.

        Never raises — all errors are captured and returned as structured dicts.
        """
        submission_id = submission.id

        # ── 1. Idempotency check ──────────────────────────────────────────────
        existing = await self._load_existing_result(submission_id, db)
        if existing is not None:
            logger.info(
                "Satellite verification idempotent: returning cached result",
                extra={"submission_id": submission_id},
            )
            return existing

        # ── 2. Coordinate validation ──────────────────────────────────────────
        lat = submission.latitude
        lon = submission.longitude
        if lat is None or lon is None:
            msg = "Submission has no coordinates — satellite verification impossible."
            logger.warning(msg, extra={"submission_id": submission_id})
            payload = _error_payload(submission_id, "SATELLITE_UNAVAILABLE", msg)
            await self._persist_result(payload, submission, db)
            return payload

        # ── 3. Configuration check ────────────────────────────────────────────
        if not self._provider.is_configured():
            logger.warning(
                "Satellite provider not configured",
                extra={"submission_id": submission_id},
            )
            payload = _error_payload(
                submission_id,
                "SATELLITE_NOT_CONFIGURED",
                "Satellite provider requires credentials that are not set.",
                provider=getattr(self._provider, "_provider_name", "unknown"),
            )
            await self._persist_result(payload, submission, db)
            return payload

        # ── 4. Determine capture time ─────────────────────────────────────────
        capture_time: datetime = (
            submission.capture_time
            if submission.capture_time is not None
            else datetime.now(timezone.utc)
        )

        # ── 5. Call provider with bounded retries ─────────────────────────────
        last_error: SatelliteProviderError | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result: SatelliteVerificationResult = await self._provider.query(
                    submission_id=submission_id,
                    latitude=lat,
                    longitude=lon,
                    capture_time=capture_time,
                    observation_type=submission.observation_type,
                )
                payload = {**result.to_dict(), "status": "SATELLITE_OK"}
                await self._persist_result(payload, submission, db)
                return payload

            except SatelliteNotConfiguredError as exc:
                logger.warning(
                    "Satellite provider not configured during call",
                    extra={"submission_id": submission_id, "error": str(exc)},
                )
                payload = _error_payload(
                    submission_id, "SATELLITE_NOT_CONFIGURED", str(exc),
                    provider=getattr(self._provider, "_provider_name", "unknown"),
                )
                await self._persist_result(payload, submission, db)
                return payload

            except NoSatelliteDataError as exc:
                # Non-transient — no imagery means no imagery, retry won't help
                logger.info(
                    "No satellite imagery found for submission",
                    extra={"submission_id": submission_id, "error": str(exc)},
                )
                payload = _error_payload(
                    submission_id, "NO_SATELLITE_DATA", str(exc),
                    provider=getattr(self._provider, "_provider_name", "cdse_stac"),
                )
                await self._persist_result(payload, submission, db)
                return payload

            except SatelliteUnavailableError as exc:
                last_error = exc
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "Satellite provider unavailable — retrying",
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
                        "Satellite provider unavailable — retries exhausted",
                        extra={
                            "submission_id": submission_id,
                            "attempts": MAX_RETRIES,
                            "error": str(exc),
                        },
                    )

        # ── 6. All retries exhausted ──────────────────────────────────────────
        msg = str(last_error) if last_error else "Unknown satellite provider error"
        payload = _error_payload(
            submission_id, "SATELLITE_UNAVAILABLE", msg,
            provider=getattr(self._provider, "_provider_name", "cdse_stac"),
        )
        await self._persist_result(payload, submission, db)
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
        Return the stored result JSON if a successful SATELLITE_OK event exists,
        otherwise None.
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
        if row and row.result_json and row.result_json.get("status") == "SATELLITE_OK":
            return row.result_json
        return None

    async def _persist_result(
        self,
        payload: dict[str, Any],
        submission: Submission,
        db: AsyncSession,
    ) -> None:
        """
        Persist satellite result to VerificationEvent and update
        submission.satellite_confidence.

        Only writes satellite_confidence when status is SATELLITE_OK.
        """
        confidence = (
            payload.get("confidence", 0.0)
            if payload.get("status") == "SATELLITE_OK"
            else None
        )
        if confidence is not None:
            submission.satellite_confidence = confidence

        event = VerificationEvent(
            submission_id=submission.id,
            engine=ENGINE_NAME,
            confidence=confidence,
            result_json=payload,
        )
        db.add(event)
        await db.flush()
