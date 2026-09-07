"""
app/integrations/satellite_client.py
Module-level factory for the configured satellite provider + legacy shim.

Provides:
  - get_satellite_provider()   → returns the active SatelliteProvider singleton
  - set_satellite_provider()   → override (used in tests or A/B switching)
  - reset_satellite_provider() → reset to default CDSESatelliteProvider
  - cross_check_location(...)  → legacy shim (backward compat)

Default provider: CDSESatelliteProvider (CDSE STAC, open access, no credentials needed)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.integrations.satellite_provider import SatelliteProvider
from app.integrations.cdse_satellite_provider import CDSESatelliteProvider

logger = logging.getLogger("jal_saheli.integrations.satellite_client")

# ── Provider singleton ────────────────────────────────────────────────────────
_provider: SatelliteProvider | None = None


def get_satellite_provider() -> SatelliteProvider:
    """Return (or lazily create) the global satellite provider singleton."""
    global _provider
    if _provider is None:
        _provider = CDSESatelliteProvider()
    return _provider


def set_satellite_provider(provider: SatelliteProvider) -> None:
    """
    Override the global satellite provider.
    Use in tests to inject mocks or alternative providers.
    """
    global _provider
    _provider = provider


def reset_satellite_provider() -> None:
    """Reset to the default CDSESatelliteProvider."""
    global _provider
    _provider = None


# ── Legacy shim (backward compat with code written before Phase 7) ────────────

async def cross_check_location(
    latitude: float | None,
    longitude: float | None,
    observation_type: str,
    capture_time: datetime | None = None,
    submission_id: str = "unknown",
) -> dict[str, Any]:
    """
    Legacy thin shim used by code written before Phase 7.

    Delegates to the active SatelliteProvider via a direct call (without DB persistence).
    Returns a dict compatible with the pre-Phase-7 callers:
      {
        "satellite_confidence": float,
        "satellite_confidence_display": str,
        "ndwi_delta": str,
        "spectral_index": str,
        "sensor": str,
        "tile_id": str,
        "cloud_cover_pct": float | None,
        "result": str,
        "status": str,
      }

    On errors, returns appropriate error dict.
    """
    from app.integrations.satellite_provider import (
        NoSatelliteDataError,
        SatelliteNotConfiguredError,
        SatelliteUnavailableError,
    )

    if latitude is None or longitude is None:
        return {
            "satellite_confidence": 0.0,
            "satellite_confidence_display": "0%",
            "ndwi_delta": "N/A",
            "spectral_index": "N/A",
            "sensor": "Sentinel-2 MSI",
            "tile_id": "N/A",
            "cloud_cover_pct": None,
            "result": "SATELLITE_UNAVAILABLE",
            "status": "SATELLITE_UNAVAILABLE",
            "error_message": "No coordinates provided",
        }

    provider = get_satellite_provider()
    effective_capture = capture_time or datetime.now(timezone.utc)

    try:
        result = await provider.query(
            submission_id=submission_id,
            latitude=latitude,
            longitude=longitude,
            capture_time=effective_capture,
            observation_type=observation_type,
        )
        d = result.to_dict()
        d["status"] = "SATELLITE_OK"
        return d
    except SatelliteNotConfiguredError as exc:
        return {
            "satellite_confidence": 0.0,
            "satellite_confidence_display": "0%",
            "ndwi_delta": "N/A",
            "spectral_index": "N/A",
            "sensor": "Sentinel-2 MSI",
            "tile_id": "N/A",
            "cloud_cover_pct": None,
            "result": "SATELLITE_NOT_CONFIGURED",
            "status": "SATELLITE_NOT_CONFIGURED",
            "error_message": str(exc),
        }
    except NoSatelliteDataError as exc:
        return {
            "satellite_confidence": 0.0,
            "satellite_confidence_display": "0%",
            "ndwi_delta": "N/A",
            "spectral_index": "N/A",
            "sensor": "Sentinel-2 MSI",
            "tile_id": "N/A",
            "cloud_cover_pct": None,
            "result": "NO_SATELLITE_DATA",
            "status": "NO_SATELLITE_DATA",
            "error_message": str(exc),
        }
    except SatelliteUnavailableError as exc:
        return {
            "satellite_confidence": 0.0,
            "satellite_confidence_display": "0%",
            "ndwi_delta": "N/A",
            "spectral_index": "N/A",
            "sensor": "Sentinel-2 MSI",
            "tile_id": "N/A",
            "cloud_cover_pct": None,
            "result": "SATELLITE_UNAVAILABLE",
            "status": "SATELLITE_UNAVAILABLE",
            "error_message": str(exc),
        }
