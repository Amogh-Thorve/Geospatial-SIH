"""
app/integrations/planetary_computer_provider.py
PlanetaryComputerProvider — alternative SatelliteProvider using the
Microsoft Planetary Computer (MPC) STAC API.

Why MPC as secondary/fallback:
  - Open access public STAC API — no credentials for search
  - Very high availability (Azure-hosted, global CDN)
  - Mirrors the full Sentinel-2 L2A archive
  - Good Python ecosystem (used in research workflows)

Why MPC is secondary (not primary):
  - Microsoft-managed mirror, not official ESA source
  - Assets (pixel data) require signed SAS tokens
  - Less stable field names across versions vs. official CDSE

STAC endpoint: https://planetarycomputer.microsoft.com/api/stac/v1/search

Same confidence formula and evidence derivation as CDSE provider.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.integrations.satellite_provider import (
    NoSatelliteDataError,
    SatelliteProvider,
    SatelliteUnavailableError,
    SatelliteVerificationResult,
)
from app.integrations.cdse_satellite_provider import (
    _build_bbox,
    _build_evidence,
    _compute_confidence,
    _parse_item_datetime,
    BBOX_HALF_DEG,
    CLOUD_COVER_MAX_PCT,
    LOOKBACK_DAYS,
)

logger = logging.getLogger("jal_saheli.integrations.mpc_satellite")

PROVIDER_NAME = "planetary_computer_stac"
STAC_ENDPOINT = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
COLLECTION = "sentinel-2-l2a"


class PlanetaryComputerProvider(SatelliteProvider):
    """
    Satellite provider backed by the Microsoft Planetary Computer STAC API.

    Open access — no credentials required for metadata discovery.
    """

    def __init__(self) -> None:
        self._provider_name = PROVIDER_NAME

    def is_configured(self) -> bool:
        """MPC metadata search is open access — always configured."""
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
        Search MPC STAC API for the most recent clear Sentinel-2 L2A scene.

        Raises:
            SatelliteUnavailableError – HTTP error or timeout.
            NoSatelliteDataError      – No scenes found.
        """
        settings = get_settings()
        timeout = settings.satellite.timeout_seconds

        bbox = _build_bbox(latitude, longitude)
        end = capture_time.astimezone(timezone.utc)
        start = end - timedelta(days=LOOKBACK_DAYS)
        dt_window = (
            f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/"
            f"{end.strftime('%Y-%m-%dT%H:%M:%SZ')}"
        )

        # MPC uses a slightly different filter format (CQL2 or query extension)
        payload: dict[str, Any] = {
            "collections": [COLLECTION],
            "bbox": bbox,
            "datetime": dt_window,
            "query": {"eo:cloud_cover": {"lte": CLOUD_COVER_MAX_PCT}},
            "limit": 5,
            "sortby": [{"field": "properties.datetime", "direction": "desc"}],
        }

        logger.info(
            "Querying Planetary Computer STAC for Sentinel-2 scenes",
            extra={
                "submission_id": submission_id,
                "bbox": bbox,
                "datetime_window": dt_window,
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
                f"Planetary Computer STAC timed out after {timeout}s: {exc}"
            ) from exc
        except httpx.RequestError as exc:
            raise SatelliteUnavailableError(
                f"Planetary Computer STAC network error: {exc}"
            ) from exc

        if resp.status_code != 200:
            raise SatelliteUnavailableError(
                f"Planetary Computer STAC returned HTTP {resp.status_code}: {resp.text[:500]}"
            )

        try:
            data: dict[str, Any] = resp.json()
        except Exception as exc:
            raise SatelliteUnavailableError(
                f"Planetary Computer STAC returned non-JSON response: {resp.text[:300]}"
            ) from exc

        features: list[dict] = data.get("features", [])
        number_matched: int = data.get("numberMatched", len(features))

        if not features:
            raise NoSatelliteDataError(
                f"No Sentinel-2 L2A scenes found via Planetary Computer "
                f"within {LOOKBACK_DAYS} days at ({latitude:.4f}, {longitude:.4f})."
            )

        best = features[0]
        item_id: str = best.get("id", "UNKNOWN")
        props: dict[str, Any] = best.get("properties", {})

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
            "Planetary Computer satellite verification complete",
            extra={
                "submission_id": submission_id,
                "scene_id": item_id,
                "cloud_cover_pct": cloud_cover_pct,
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
