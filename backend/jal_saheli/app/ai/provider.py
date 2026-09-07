"""Geo AI provider boundary. Production path is Ved RF + local lookup with optional Bhuvan WMS."""

from __future__ import annotations

from typing import Any, Protocol

from app.geoai.engine import SatelliteUnavailableError, lookup_location
from app.geoai.providers.bhuvan import get_bhuvan_config, query_bhuvan
from app.geoai.providers.bhuvan_lulc import get_bhuvan_lulc_config, query_bhuvan_lulc
from app.geospatial.adapters import (
    HistoricalRecordsAdapter,
    LocalDrishtiAdapter,
    LocalSrishtiAdapter,
    fuse_record,
)


class GeoAIProvider(Protocol):
    name: str

    def analyze(self, payload: dict[str, Any]) -> dict[str, Any]:
        ...


def _local_change_detection(
    bhuvan_result: dict[str, Any] | None,
    bhuvan_lulc_result: dict[str, Any] | None,
) -> str:
    base = "Single-date lookup only; temporal change detection is not implemented."
    if bhuvan_lulc_result and bhuvan_lulc_result.get("status") == "AVAILABLE":
        year = bhuvan_lulc_result.get("year") or "unknown"
        return (
            f"Bhuvan LULC 250K classification from {year} dataset. "
            f"NDVI/NDWI remain from local satellite grid lookup. {base}"
        )
    if bhuvan_result and bhuvan_result.get("status") == "AVAILABLE":
        return (
            "Bhuvan WMS imagery retrieved; LULC/NDVI/NDWI indices remain from local "
            f"satellite grid lookup. {base}"
        )
    if get_bhuvan_config().enabled or get_bhuvan_lulc_config().enabled:
        reason = (bhuvan_lulc_result or bhuvan_result or {}).get("reason", "BHUVAN_UNAVAILABLE")
        return f"Bhuvan unavailable ({reason}) — using local satellite grid. {base}"
    return base


class VedGeoAIProvider:
    """Local RF + satellite_lookup.npz with optional Bhuvan WMS imagery probe."""

    name = "VedGeoAI-RF-Lookup"

    def analyze(self, payload: dict[str, Any]) -> dict[str, Any]:
        fused = fuse_record(
            LocalDrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            LocalSrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            HistoricalRecordsAdapter().fetch(payload["lat"], payload["lng"]),
        )

        bhuvan_result: dict[str, Any] | None = None
        bhuvan_lulc_result: dict[str, Any] | None = None
        satellite_imagery_provider = "local_satellite_grid"
        satellite_imagery_type = "NPZ"
        lulc_source = "local_satellite_grid"

        lulc_cfg = get_bhuvan_lulc_config()
        if lulc_cfg.enabled:
            bhuvan_lulc_result = query_bhuvan_lulc(float(payload["lat"]), float(payload["lng"]), config=lulc_cfg)
            if bhuvan_lulc_result.get("status") == "AVAILABLE" and bhuvan_lulc_result.get("lulc"):
                lulc_source = "bhuvan_lulc_250k"

        cfg = get_bhuvan_config()
        if cfg.enabled:
            bhuvan_result = query_bhuvan(float(payload["lat"]), float(payload["lng"]), config=cfg)
            if bhuvan_result.get("status") == "AVAILABLE":
                satellite_imagery_provider = "Bhuvan"
                satellite_imagery_type = "WMS"

        try:
            lookup = lookup_location(float(payload["lat"]), float(payload["lng"]))
        except SatelliteUnavailableError as exc:
            return {
                "provider": self.name,
                "available": False,
                "code": exc.code,
                "classification": "",
                "confidence": None,
                "satellite_match": "UNAVAILABLE",
                "ndvi": None,
                "ndwi": None,
                "ndvi_source": "unavailable",
                "ndwi_source": "unavailable",
                "lulc": "",
                "change_detection": exc.message,
                "anomaly": True,
                "fused_record": fused,
                "status": "UNAVAILABLE",
                "extra": exc.extra,
                "satellite_imagery_provider": satellite_imagery_provider,
                "satellite_imagery_type": satellite_imagery_type,
                "bhuvan": bhuvan_result,
                "bhuvan_lulc": bhuvan_lulc_result,
                "lulc_source": lulc_source,
            }

        lulc_label = lookup["prediction"]
        classification_label = lookup["prediction"]
        if lulc_source == "bhuvan_lulc_250k" and bhuvan_lulc_result:
            lulc_label = str(bhuvan_lulc_result.get("lulc") or lulc_label)
            classification_label = lulc_label

        return {
            "provider": self.name,
            "available": True,
            "classification": classification_label,
            "confidence": lookup["confidence"],
            "satellite_match": lookup["satellite_match"],
            "ndvi": lookup["ndvi_val"],
            "ndwi": lookup["ndwi_val"],
            "ndvi_source": "satellite_lookup",
            "ndwi_source": "satellite_lookup",
            "lulc": lulc_label,
            "change_detection": _local_change_detection(bhuvan_result, bhuvan_lulc_result),
            "anomaly": lookup["satellite_match"] == "DISCREPANCY",
            "fused_record": fused,
            "status": "COMPLETED",
            "row": lookup["row"],
            "col": lookup["col"],
            "source": lookup["source"],
            "pixel_size_m": lookup["pixel_size_m"],
            "satellite_imagery_provider": satellite_imagery_provider,
            "satellite_imagery_type": satellite_imagery_type,
            "bhuvan": bhuvan_result,
            "bhuvan_lulc": bhuvan_lulc_result,
            "lulc_source": lulc_source,
        }


def get_geo_ai_provider() -> GeoAIProvider:
    return VedGeoAIProvider()
