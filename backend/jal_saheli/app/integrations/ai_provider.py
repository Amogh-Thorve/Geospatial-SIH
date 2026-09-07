"""
app/integrations/ai_provider.py
AIProvider — abstract base class for replaceable AI vision providers.

Any provider that implements this interface can be swapped in without
touching the rest of the application.

Concrete implementations live alongside this file:
  - GenericHTTPAIProvider  → calls any HTTP REST endpoint
  - (future) OpenAIProvider, VertexAIProvider, …

Error contract:
  - Raise AINotConfiguredError  if credentials / URL are missing.
  - Raise AIUnavailableError    if the provider request fails (HTTP error, timeout, …).
  - Raise AIResponseError       if the response does not pass schema validation.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any


# ─────────────────────────────────────────────────────────────────────────────
# Structured errors
# ─────────────────────────────────────────────────────────────────────────────

class AIProviderError(Exception):
    """Base class for all AI provider errors."""
    code: str = "AI_ERROR"


class AINotConfiguredError(AIProviderError):
    """Raised when required credentials or URL are missing."""
    code: str = "AI_NOT_CONFIGURED"


class AIUnavailableError(AIProviderError):
    """Raised when the provider request fails (timeout, HTTP error, network)."""
    code: str = "AI_UNAVAILABLE"


class AIResponseError(AIProviderError):
    """Raised when the provider response fails schema validation."""
    code: str = "AI_RESPONSE_INVALID"


# ─────────────────────────────────────────────────────────────────────────────
# Canonical AI analysis result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class AIAnalysisResult:
    """
    Structured result from one AI provider inference pass.

    All numeric scores are in the range [0.0, 100.0].
    """
    submission_id: str
    provider: str
    model: str
    result: str                       # e.g. "WATER_BODY_DETECTED"
    confidence: float                 # 0.0 – 100.0
    detected_features: list[str] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)
    raw_response: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "submission_id": self.submission_id,
            "provider": self.provider,
            "model": self.model,
            "result": self.result,
            "confidence": self.confidence,
            "confidence_display": f"{round(self.confidence)}%",
            "detected_features": self.detected_features,
            "observations": self.observations,
            "raw_response": self.raw_response,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Abstract provider interface
# ─────────────────────────────────────────────────────────────────────────────

class AIProvider(abc.ABC):
    """
    Abstract base class for AI vision providers.

    Sub-classes MUST implement `analyze`.
    They MUST NOT swallow exceptions — raise the appropriate AIProviderError subclass.
    """

    @abc.abstractmethod
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
        Run AI vision analysis for one ground observation.

        Args:
            submission_id:    Unique GW-XXXXXX ID (used for idempotency key).
            observation_type: Observation category string (e.g. "check_dam").
            photo_url:        Relative URL or path to the stored photo.
            latitude:         GPS latitude.
            longitude:        GPS longitude.
            description:      Optional free-text notes from cadre.
            photo_bytes:      Optional raw bytes if available in memory.

        Returns:
            AIAnalysisResult with confidence in [0.0, 100.0].

        Raises:
            AINotConfiguredError  – credentials / URL missing.
            AIUnavailableError    – HTTP error, timeout, or network failure.
            AIResponseError       – provider returned an unreadable / invalid response.
        """

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Return True if this provider has all required credentials/settings."""
