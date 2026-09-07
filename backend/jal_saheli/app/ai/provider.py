"""Geo AI provider boundary. Production path is Ved's RF + satellite lookup."""

from __future__ import annotations

from typing import Any, Protocol

from app.geoai.engine import SatelliteUnavailableError, lookup_location
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


class VedGeoAIProvider:
    """Uses Ved's satellite_lookup.npz LULC/NDVI/NDWI. No mock indices."""

    name = "VedGeoAI-RF-Lookup"

    def analyze(self, payload: dict[str, Any]) -> dict[str, Any]:
        fused = fuse_record(
            LocalDrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            LocalSrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            HistoricalRecordsAdapter().fetch(payload["lat"], payload["lng"]),
        )
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
            }

        return {
            "provider": self.name,
            "available": True,
            "classification": lookup["prediction"],
            "confidence": lookup["confidence"],
            "satellite_match": lookup["satellite_match"],
            "ndvi": lookup["ndvi_val"],
            "ndwi": lookup["ndwi_val"],
            "ndvi_source": "satellite_lookup",
            "ndwi_source": "satellite_lookup",
            "lulc": lookup["prediction"],
            "change_detection": lookup["change_detection"],
            "anomaly": lookup["satellite_match"] == "DISCREPANCY",
            "fused_record": fused,
            "status": "COMPLETED",
            "row": lookup["row"],
            "col": lookup["col"],
            "source": lookup["source"],
            "pixel_size_m": lookup["pixel_size_m"],
        }


def get_geo_ai_provider() -> GeoAIProvider:
    return VedGeoAIProvider()
