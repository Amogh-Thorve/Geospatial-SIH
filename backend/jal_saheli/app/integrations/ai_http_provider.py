"""
app/integrations/ai_http_provider.py
GenericHTTPAIProvider — concrete AIProvider that calls any HTTP REST endpoint.

Supports:
  - Bearer token authentication (AI_SERVICE_API_KEY)
  - Configurable timeout
  - Response schema validation
  - Structured error mapping

Request format (POST):
  {
    "submission_id": "GW-XXXXXX",
    "observation_type": "check_dam",
    "photo_url": "/uploads/...",
    "latitude": 19.876,
    "longitude": 75.343,
    "description": "Masonry dam near village"
  }

Expected response format:
  {
    "result": "CHECK_DAM_DETECTED",          # required string
    "confidence": 93.5,                       # required float 0-100
    "model": "geobrain-v3",                   # required string
    "detected_features": ["...", "..."],       # optional list[str]
    "observations": ["..."]                   # optional list[str]
  }

If the provider returns any other shape, AIResponseError is raised.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.integrations.ai_provider import (
    AIAnalysisResult,
    AINotConfiguredError,
    AIProvider,
    AIResponseError,
    AIUnavailableError,
)

logger = logging.getLogger("jal_saheli.integrations.ai_http_provider")

PROVIDER_NAME = "generic_http"


def _validate_response(data: dict[str, Any], submission_id: str, provider: str) -> AIAnalysisResult:
    """
    Validate HTTP response dict and return a typed AIAnalysisResult.
    Raises AIResponseError if required fields are missing or malformed.
    """
    missing = [f for f in ("result", "confidence", "model") if f not in data]
    if missing:
        raise AIResponseError(
            f"AI provider response missing required fields: {missing}. "
            f"Got keys: {list(data.keys())}"
        )

    try:
        confidence = float(data["confidence"])
    except (TypeError, ValueError) as exc:
        raise AIResponseError(
            f"AI provider 'confidence' is not numeric: {data['confidence']!r}"
        ) from exc

    if not (0.0 <= confidence <= 100.0):
        raise AIResponseError(
            f"AI provider 'confidence' out of range [0, 100]: {confidence}"
        )

    result_str = str(data.get("result", "")).strip()
    if not result_str:
        raise AIResponseError("AI provider 'result' field is empty.")

    model_str = str(data.get("model", provider)).strip() or provider

    return AIAnalysisResult(
        submission_id=submission_id,
        provider=provider,
        model=model_str,
        result=result_str,
        confidence=confidence,
        detected_features=list(data.get("detected_features") or []),
        observations=list(data.get("observations") or []),
        raw_response=data,
    )


class GenericHTTPAIProvider(AIProvider):
    """
    Concrete AIProvider that calls any HTTP REST endpoint.

    Credentials are read fresh from settings on each call so that
    test-patched settings take effect without restarting the process.
    """

    def __init__(self, provider_name: str = PROVIDER_NAME) -> None:
        self._provider_name = provider_name

    def is_configured(self) -> bool:
        settings = get_settings()
        return bool(
            settings.ai.service_url and settings.ai.service_url.strip()
        )

    async def analyze(
        self,
        submission_id: str,
        observation_type: str,
        photo_url: str | None,
        latitude: float | None,
        longitude: float | None,
        description: str | None,
        photo_bytes: bytes | None = None,
    ) -> AIAnalysisResult:
        """
        POST the observation payload to the configured AI endpoint.

        Raises:
            AINotConfiguredError  – AI_SERVICE_URL is empty.
            AIUnavailableError    – HTTP error or connection timeout.
            AIResponseError       – response schema validation failure.
        """
        settings = get_settings()

        if not self.is_configured():
            raise AINotConfiguredError(
                "AI_SERVICE_URL is not configured. "
                "Set AI_SERVICE_URL and optionally AI_SERVICE_API_KEY in environment."
            )

        base_url = settings.ai.service_url.rstrip("/")
        endpoint = f"{base_url}/predict"
        timeout = settings.ai.timeout_seconds

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if settings.ai.api_key:
            headers["Authorization"] = f"Bearer {settings.ai.api_key}"

        payload: dict[str, Any] = {
            "submission_id": submission_id,
            "observation_type": observation_type,
            "photo_url": photo_url,
            "latitude": latitude,
            "longitude": longitude,
            "description": description,
        }

        logger.info(
            "Calling AI provider",
            extra={
                "submission_id": submission_id,
                "provider": self._provider_name,
                "endpoint": endpoint,
                "observation_type": observation_type,
            },
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise AIUnavailableError(
                f"AI provider timed out after {timeout}s: {exc}"
            ) from exc
        except httpx.RequestError as exc:
            raise AIUnavailableError(
                f"AI provider network error: {exc}"
            ) from exc

        if resp.status_code != 200:
            raise AIUnavailableError(
                f"AI provider returned HTTP {resp.status_code}: {resp.text[:500]}"
            )

        try:
            data: dict[str, Any] = resp.json()
        except Exception as exc:
            raise AIResponseError(
                f"AI provider response is not valid JSON: {resp.text[:500]}"
            ) from exc

        result = _validate_response(data, submission_id, self._provider_name)

        logger.info(
            "AI provider analysis complete",
            extra={
                "submission_id": submission_id,
                "provider": self._provider_name,
                "model": result.model,
                "confidence": result.confidence,
                "result": result.result,
            },
        )
        return result
