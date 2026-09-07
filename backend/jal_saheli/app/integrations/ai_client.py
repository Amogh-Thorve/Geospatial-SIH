"""
app/integrations/ai_client.py
Module-level factory for the configured AI provider + legacy shim.

Provides:
  - get_ai_provider()          → returns the active AIProvider singleton
  - analyze_observation(...)   → legacy shim used by ai_service.py

The provider is currently GenericHTTPAIProvider but can be swapped by
calling set_ai_provider(my_provider) — used in tests or for A/B switching.
"""
from __future__ import annotations

import logging
from typing import Any

from app.integrations.ai_provider import AIProvider
from app.integrations.ai_http_provider import GenericHTTPAIProvider

logger = logging.getLogger("jal_saheli.integrations.ai_client")

# ── Provider singleton ────────────────────────────────────────────────────────
_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    """Return (or lazily create) the global AI provider singleton."""
    global _provider
    if _provider is None:
        _provider = GenericHTTPAIProvider()
    return _provider


def set_ai_provider(provider: AIProvider) -> None:
    """
    Override the global AI provider.
    Use in tests to inject mocks or alternative providers.
    """
    global _provider
    _provider = provider


def reset_ai_provider() -> None:
    """Reset to the default GenericHTTPAIProvider (used in tests)."""
    global _provider
    _provider = None


# ── Legacy shim ───────────────────────────────────────────────────────────────

async def analyze_observation(
    observation_type: str,
    photo_path: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    description: str | None = None,
    submission_id: str = "unknown",
) -> dict[str, Any]:
    """
    Legacy thin shim used by code written before Phase 6.

    Delegates to the active AIProvider.
    Returns a flat dict compatible with the pre-Phase-6 callers:
      {
        "classification": str,
        "confidence":     float,
        "confidence_display": str,
        "features":       list[str],
        "model":          str,
      }

    On AI_NOT_CONFIGURED or AI_UNAVAILABLE, returns a fallback dict
    so the verification pipeline can still make a decision (confidence=0).
    """
    from app.services.ai_analysis_service import AIAnalysisService

    class _SubmissionProxy:
        """Minimal duck-typed Submission for the service call."""
        id = submission_id
        observation_type = observation_type
        photo_url = photo_path
        latitude = latitude
        longitude = longitude
        description = description
        ai_confidence: float | None = None

    proxy = _SubmissionProxy()
    service = AIAnalysisService(provider=get_ai_provider())

    # The service handles all errors internally and always returns a dict
    # We need a throw-away db session for shim compatibility
    # In shim mode we skip DB persistence (caller's ai_service.py does it)
    result = await _call_provider_direct(
        submission_id=submission_id,
        observation_type=observation_type,
        photo_url=photo_path,
        latitude=latitude,
        longitude=longitude,
        description=description,
    )

    return {
        "classification": result.get("result", "Observation Analyzed"),
        "confidence": result.get("confidence", 0.0),
        "confidence_display": result.get("confidence_display", "0%"),
        "features": result.get("detected_features", []),
        "model": result.get("model", "none"),
        "status": result.get("status", "AI_NOT_CONFIGURED"),
    }


async def _call_provider_direct(
    submission_id: str,
    observation_type: str,
    photo_url: str | None,
    latitude: float | None,
    longitude: float | None,
    description: str | None,
) -> dict[str, Any]:
    """Call the provider directly without DB persistence (for the legacy shim)."""
    from app.integrations.ai_provider import (
        AINotConfiguredError,
        AIUnavailableError,
        AIResponseError,
    )

    provider = get_ai_provider()
    if not provider.is_configured():
        return {
            "result": "AI_NOT_CONFIGURED",
            "confidence": 0.0,
            "confidence_display": "0%",
            "detected_features": [],
            "observations": [],
            "model": "none",
            "status": "AI_NOT_CONFIGURED",
        }

    try:
        result = await provider.analyze(
            submission_id=submission_id,
            observation_type=observation_type,
            photo_url=photo_url,
            latitude=latitude,
            longitude=longitude,
            description=description,
        )
        return {**result.to_dict(), "status": "AI_OK"}
    except AINotConfiguredError:
        return {
            "result": "AI_NOT_CONFIGURED",
            "confidence": 0.0,
            "confidence_display": "0%",
            "detected_features": [],
            "observations": [],
            "model": "none",
            "status": "AI_NOT_CONFIGURED",
        }
    except (AIUnavailableError, AIResponseError) as exc:
        code = "AI_UNAVAILABLE" if isinstance(exc, AIUnavailableError) else "AI_RESPONSE_INVALID"
        return {
            "result": code,
            "confidence": 0.0,
            "confidence_display": "0%",
            "detected_features": [],
            "observations": [],
            "model": "none",
            "status": code,
        }
