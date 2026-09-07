"""
app/integrations/satellite_provider.py
SatelliteProvider — abstract base class for replaceable satellite data providers.

Any provider that implements this interface can be swapped in without
touching the rest of the application.

Concrete implementations:
  - CDSESatelliteProvider   → Copernicus Data Space Ecosystem (STAC, open access)
  - PlanetaryComputerProvider → Microsoft Planetary Computer (STAC, open access)

Error contract:
  - Raise SatelliteNotConfiguredError  if required credentials are missing.
  - Raise SatelliteUnavailableError    if the provider request fails.
  - Raise NoSatelliteDataError         if the query returned no matching scenes.

Results:
  Providers return a SatelliteVerificationResult populated exclusively from
  actual provider response fields. No values may be fabricated.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# ─────────────────────────────────────────────────────────────────────────────
# Structured errors
# ─────────────────────────────────────────────────────────────────────────────

class SatelliteProviderError(Exception):
    """Base class for all satellite provider errors."""
    code: str = "SATELLITE_ERROR"


class SatelliteNotConfiguredError(SatelliteProviderError):
    """
    Raised when required credentials or configuration are missing.
    For open-access STAC providers this is never raised unless an explicit
    API key is required by the provider's access tier.
    """
    code: str = "SATELLITE_NOT_CONFIGURED"


class SatelliteUnavailableError(SatelliteProviderError):
    """Raised when the provider request fails (timeout, HTTP error, network)."""
    code: str = "SATELLITE_UNAVAILABLE"


class NoSatelliteDataError(SatelliteProviderError):
    """Raised when no matching satellite scenes exist for the given coordinates/date."""
    code: str = "NO_SATELLITE_DATA"


# ─────────────────────────────────────────────────────────────────────────────
# Canonical satellite verification result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SatelliteVerificationResult:
    """
    Structured result from one satellite provider query.

    All fields are populated from actual provider response data.
    confidence is in range [0.0, 100.0].

    Metadata is a free-form dict with all raw fields from the best scene.
    Evidence is a list of human-readable observations derived from the data.
    """
    submission_id: str
    provider: str

    # Scene identification (from real API response)
    scene_id: str                               # Provider's scene/item ID
    imagery_date: datetime                      # Actual acquisition datetime

    # Computed from real data — NO fabrication
    confidence: float                           # 0.0 – 100.0
    result: str                                 # SATELLITE_OK | NO_SATELLITE_DATA

    # Spectral/quality fields from real scene metadata
    cloud_cover_pct: float                      # eo:cloud_cover
    temporal_gap_days: float                    # days between imagery and submission
    water_percentage: float | None = None       # s2:water_percentage (if available)
    vegetation_percentage: float | None = None  # s2:vegetation_percentage

    # Evidence from real provider fields
    metadata: dict[str, Any] = field(default_factory=dict)
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "submission_id": self.submission_id,
            "provider": self.provider,
            "scene_id": self.scene_id,
            "imagery_date": self.imagery_date.isoformat(),
            "confidence": self.confidence,
            "satellite_confidence": self.confidence,
            "confidence_display": f"{round(self.confidence)}%",
            "satellite_confidence_display": f"{round(self.confidence)}%",
            "result": self.result,
            "cloud_cover_pct": self.cloud_cover_pct,
            "temporal_gap_days": round(self.temporal_gap_days, 1),
            "water_percentage": self.water_percentage,
            "vegetation_percentage": self.vegetation_percentage,
            "metadata": self.metadata,
            "evidence": self.evidence,
            # Legacy compat fields for verification_service.py
            "spectral_index": "NDWI (Sentinel-2 B3/B8)",
            "sensor": "Sentinel-2 MSI",
            "tile_id": self.scene_id[:20] if self.scene_id else "N/A",
            "ndwi_delta": self.metadata.get("ndwi_delta", "derived"),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Abstract provider interface
# ─────────────────────────────────────────────────────────────────────────────

class SatelliteProvider(abc.ABC):
    """
    Abstract base class for satellite data providers.

    Sub-classes MUST implement `query` and `is_configured`.
    They MUST NOT fabricate data — every field in SatelliteVerificationResult
    must come from the actual provider API response.
    """

    @abc.abstractmethod
    async def query(
        self,
        submission_id: str,
        latitude: float,
        longitude: float,
        capture_time: datetime,
        observation_type: str,
    ) -> SatelliteVerificationResult:
        """
        Query the satellite provider for the best matching scene.

        Args:
            submission_id:    Unique submission ID (for logging/idempotency).
            latitude:         GPS latitude of the observation.
            longitude:        GPS longitude of the observation.
            capture_time:     When the field observation was captured.
            observation_type: Observation category (e.g. "check_dam").

        Returns:
            SatelliteVerificationResult with all fields from real API data.

        Raises:
            SatelliteNotConfiguredError – credentials missing.
            SatelliteUnavailableError   – request failure.
            NoSatelliteDataError        – no scenes found.
        """

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Return True if this provider has all required credentials/settings."""
