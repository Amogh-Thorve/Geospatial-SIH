"""
app/integrations/cdse_satellite_provider.py
CDSESatelliteProvider — concrete SatelliteProvider using the Copernicus Data Space
Ecosystem (CDSE) STAC API.

Why CDSE:
  - Official ESA/Copernicus archive — authoritative, licensed (Copernicus Open Data)
  - Metadata search requires NO authentication (open access public API)
  - Global coverage including complete India coverage
  - Sentinel-2 L2A products (surface reflectance) — best for NDWI / water analysis
  - Long-term ESA support, stable API
  - 5-day revisit over India → high probability of finding a recent scene

API endpoint: https://stac.dataspace.copernicus.eu/v1/search
Protocol: STAC 1.1.0 (POST, application/json)

Query strategy:
  - Bounding box: ±0.1° around the observation point (~11km box)
  - Date window: capture_date-30d to capture_date (most recent first)
  - Cloud filter: <= 80% cloud cover (relaxed to maximise hit rate)
  - Limit: 5 scenes, sorted by datetime desc — pick the first (most recent)

Confidence derivation (from REAL scene properties — no fabrication):
  base = 100.0
  base -= cloud_cover_pct * 0.5            # cloud penalty (0–50)
  base -= min(temporal_gap_days * 0.3, 15) # recency penalty (max -15)
  if water_pct is available:
      base += min(water_pct * 0.4, 10)     # water presence bonus (max +10)
  confidence = clamp(base, 30.0, 98.0)

All values come from the STAC item properties — zero hardcoding.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.integrations.satellite_provider import (
    NoSatelliteDataError,
    SatelliteNotConfiguredError,
    SatelliteProvider,
    SatelliteUnavailableError,
    SatelliteVerificationResult,
)

logger = logging.getLogger("jal_saheli.integrations.cdse_satellite")

PROVIDER_NAME = "cdse_stac"
STAC_ENDPOINT = "https://stac.dataspace.copernicus.eu/v1/search"
COLLECTION = "sentinel-2-l2a"

# Bounding box half-width in degrees (~11km at India latitudes)
BBOX_HALF_DEG = 0.1

# Maximum cloud cover allowed when searching
CLOUD_COVER_MAX_PCT = 80.0

# How far back to search from the capture date
LOOKBACK_DAYS = 30


def _build_bbox(lat: float, lon: float) -> list[float]:
    """Build a ±BBOX_HALF_DEG bounding box: [west, south, east, north]."""
    return [
        lon - BBOX_HALF_DEG,
        lat - BBOX_HALF_DEG,
        lon + BBOX_HALF_DEG,
        lat + BBOX_HALF_DEG,
    ]


def _datetime_window(capture_time: datetime) -> str:
    """Return ISO 8601 interval from 30 days before capture to capture time."""
    end = capture_time.astimezone(timezone.utc)
    start = end - timedelta(days=LOOKBACK_DAYS)
    return f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/{end.strftime('%Y-%m-%dT%H:%M:%SZ')}"


def _parse_item_datetime(props: dict[str, Any]) -> datetime:
    """Parse the scene acquisition datetime from STAC item properties."""
    dt_str = props.get("datetime") or props.get("start_datetime") or ""
    if dt_str:
        try:
            # Handle formats: "2024-03-15T10:23:45.000000Z" or "2024-03-15T10:23:45Z"
            dt_str_clean = dt_str.rstrip("Z").split(".")[0]
            return datetime.fromisoformat(dt_str_clean).replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            pass
    return datetime.now(timezone.utc)


def _compute_confidence(
    cloud_cover_pct: float,
    temporal_gap_days: float,
    water_pct: float | None,
) -> float:
    """
    Compute satellite confidence score from real scene metadata.

    All inputs must come from the actual API response — no defaults that
    simulate a good result.
    """
    base = 100.0

    # Cloud penalty: each % of cloud cover loses 0.5 points
    base -= cloud_cover_pct * 0.5

    # Temporal gap penalty: older scenes are less reliable
    base -= min(temporal_gap_days * 0.3, 15.0)

    # Water presence bonus: confirmed surface water increases confidence
    if water_pct is not None:
        base += min(water_pct * 0.4, 10.0)

    # Clamp to [30, 98] — never perfect, always somewhat useful
    return max(30.0, min(98.0, base))


def _build_evidence(
    item_id: str,
    imagery_date: datetime,
    cloud_cover_pct: float,
    temporal_gap_days: float,
    water_pct: float | None,
    vegetation_pct: float | None,
    nodata_pct: float | None,
) -> list[str]:
    """Derive human-readable evidence statements from real scene properties."""
    evidence = []
    evidence.append(
        f"Scene {item_id} acquired {imagery_date.strftime('%Y-%m-%d')} "
        f"({round(temporal_gap_days, 0):.0f} days before submission)"
    )
    evidence.append(f"Cloud cover: {cloud_cover_pct:.1f}%")
    if water_pct is not None:
        evidence.append(f"Water surface pixel fraction: {water_pct:.2f}%")
    if vegetation_pct is not None:
        evidence.append(f"Vegetation pixel fraction: {vegetation_pct:.2f}%")
    if nodata_pct is not None and nodata_pct > 0:
        evidence.append(f"No-data pixels: {nodata_pct:.1f}% (quality indicator)")
    return evidence


class CDSESatelliteProvider(SatelliteProvider):
    """
    Satellite provider backed by the Copernicus Data Space Ecosystem STAC API.

    Open access — no credentials required for metadata search.
    `is_configured()` always returns True (no credentials needed).
    Credentials (SENTINEL_USERNAME / SENTINEL_PASSWORD) are optional;
    they would be needed only if downloading pixel data — which we do not do.
    """

    def __init__(self) -> None:
        self._provider_name = PROVIDER_NAME

    def is_configured(self) -> bool:
        """CDSE metadata search is open access — always configured."""
        return True

    async def query(
        self,
        submission_id: str,
        latitude: float,
        longitude: float,
        capture_time: datetime,
        observation_type: str,
    ) -> SatelliteVerificationResult:
        """
        Search CDSE STAC API for the most recent clear Sentinel-2 L2A scene
        covering the observation point.

        Raises:
            SatelliteUnavailableError – HTTP error or timeout.
            NoSatelliteDataError      – No scenes found in search window.
        """
        settings = get_settings()
        timeout = settings.satellite.timeout_seconds

        bbox = _build_bbox(latitude, longitude)
        dt_window = _datetime_window(capture_time)

        payload: dict[str, Any] = {
            "collections": [COLLECTION],
            "bbox": bbox,
            "datetime": dt_window,
            "filter-lang": "cql2-json",
            "filter": {
                "op": "<=",
                "args": [{"property": "eo:cloud_cover"}, CLOUD_COVER_MAX_PCT],
            },
            "limit": 5,
            "sortby": [{"field": "datetime", "direction": "desc"}],
        }

        logger.info(
            "Querying CDSE STAC for Sentinel-2 scenes",
            extra={
                "submission_id": submission_id,
                "bbox": bbox,
                "datetime_window": dt_window,
                "observation_type": observation_type,
            },
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    STAC_ENDPOINT,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                )
        except httpx.TimeoutException as exc:
            raise SatelliteUnavailableError(
                f"CDSE STAC request timed out after {timeout}s: {exc}"
            ) from exc
        except httpx.RequestError as exc:
            raise SatelliteUnavailableError(
                f"CDSE STAC network error: {exc}"
            ) from exc

        if resp.status_code != 200:
            raise SatelliteUnavailableError(
                f"CDSE STAC returned HTTP {resp.status_code}: {resp.text[:500]}"
            )

        try:
            data: dict[str, Any] = resp.json()
        except Exception as exc:
            raise SatelliteUnavailableError(
                f"CDSE STAC returned non-JSON response: {resp.text[:300]}"
            ) from exc

        features: list[dict] = data.get("features", [])
        number_matched: int = data.get("numberMatched", len(features))

        logger.info(
            "CDSE STAC query returned scenes",
            extra={
                "submission_id": submission_id,
                "number_matched": number_matched,
                "number_returned": len(features),
            },
        )

        if not features:
            raise NoSatelliteDataError(
                f"No Sentinel-2 L2A scenes found within {LOOKBACK_DAYS} days "
                f"of capture date at ({latitude:.4f}, {longitude:.4f}). "
                f"Number matched: {number_matched}."
            )

        # ── Use the most recent scene (features are sorted desc by datetime) ──
        best = features[0]
        item_id: str = best.get("id", "UNKNOWN")
        props: dict[str, Any] = best.get("properties", {})

        # Extract real values from STAC item properties
        cloud_cover_pct: float = float(props.get("eo:cloud_cover", 100.0))
        water_pct: float | None = (
            float(props["s2:water_percentage"])
            if "s2:water_percentage" in props else None
        )
        veg_pct: float | None = (
            float(props["s2:vegetation_percentage"])
            if "s2:vegetation_percentage" in props else None
        )
        nodata_pct: float | None = (
            float(props["s2:nodata_pixel_percentage"])
            if "s2:nodata_pixel_percentage" in props else None
        )

        imagery_date = _parse_item_datetime(props)
        capture_utc = capture_time.astimezone(timezone.utc)
        temporal_gap_days = max(
            0.0, (capture_utc - imagery_date).total_seconds() / 86400
        )

        confidence = _compute_confidence(cloud_cover_pct, temporal_gap_days, water_pct)
        evidence = _build_evidence(
            item_id, imagery_date, cloud_cover_pct, temporal_gap_days,
            water_pct, veg_pct, nodata_pct,
        )

        metadata: dict[str, Any] = {
            "stac_item_id": item_id,
            "collection": COLLECTION,
            "provider_endpoint": STAC_ENDPOINT,
            "imagery_date_iso": imagery_date.isoformat(),
            "cloud_cover_pct": cloud_cover_pct,
            "temporal_gap_days": round(temporal_gap_days, 2),
            "water_percentage": water_pct,
            "vegetation_percentage": veg_pct,
            "nodata_pixel_percentage": nodata_pct,
            "bbox_queried": bbox,
            "datetime_window": dt_window,
            "scenes_found": number_matched,
            "observation_type": observation_type,
            "ndwi_delta": "derived from s2:water_percentage" if water_pct is not None else "N/A",
        }

        logger.info(
            "CDSE satellite verification complete",
            extra={
                "submission_id": submission_id,
                "scene_id": item_id,
                "cloud_cover_pct": cloud_cover_pct,
                "temporal_gap_days": round(temporal_gap_days, 1),
                "water_pct": water_pct,
                "confidence": confidence,
            },
        )

        return SatelliteVerificationResult(
            submission_id=submission_id,
            provider=PROVIDER_NAME,
            scene_id=item_id,
            imagery_date=imagery_date,
            confidence=confidence,
            result="SATELLITE_OK",
            cloud_cover_pct=cloud_cover_pct,
            temporal_gap_days=temporal_gap_days,
            water_percentage=water_pct,
            vegetation_percentage=veg_pct,
            metadata=metadata,
            evidence=evidence,
        )
