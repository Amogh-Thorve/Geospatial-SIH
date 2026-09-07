"""Geo AI provider boundary. Replace MockGeoAIProvider without changing the API."""

from __future__ import annotations

from typing import Any, Protocol

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


class MockGeoAIProvider:
    """Deterministic demo classifier. This is not a trained ML model."""

    name = "MockGeoAIProvider"

    def analyze(self, payload: dict[str, Any]) -> dict[str, Any]:
        classification = payload.get("classification") or payload.get("title") or "Farm Pond"
        title = (payload.get("title") or "").lower()
        notes = (payload.get("notes") or "").lower()
        blob = f"{title} {notes} {classification.lower()}"

        if "check dam" in blob:
            classification = "Check Dam"
            confidence = 0.61
            lulc = "Built-up / water harvesting structure"
            ndvi, ndwi = 0.28, 0.12
            match = "MISMATCH"
            change = "Limited post-construction water signature versus claimed completion."
            anomaly = True
        elif "farm pond" in blob:
            classification = "Farm Pond"
            confidence = 0.87
            lulc = "Agriculture / excavated pond"
            ndvi, ndwi = 0.41, 0.33
            match = "MATCH"
            change = "Seasonal surface-water extent increased in demo series."
            anomaly = False
        elif "trench" in blob:
            classification = "Contour Trench"
            confidence = 0.42
            lulc = "Degraded / treated slope"
            ndvi, ndwi = 0.18, 0.05
            match = "UNCERTAIN"
            change = "Weak soil-disturbance signature in demo change layer."
            anomaly = True
        elif "percolation" in blob:
            classification = "Percolation Tank"
            confidence = 0.84
            lulc = "Waterbody / recharge structure"
            ndvi, ndwi = 0.36, 0.38
            match = "MATCH"
            change = "Demo NDWI peak consistent with a recharge tank."
            anomaly = False
        else:
            classification = classification or "Water Harvesting Structure"
            confidence = 0.73
            lulc = "Mixed rural land cover"
            ndvi, ndwi = 0.31, 0.22
            match = "PARTIAL"
            change = "Moderate land-cover change in demo temporal stack."
            anomaly = confidence < 0.75

        fused = fuse_record(
            LocalDrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            LocalSrishtiAdapter().fetch(payload["lat"], payload["lng"]),
            HistoricalRecordsAdapter().fetch(payload["lat"], payload["lng"]),
        )

        return {
            "provider": self.name,
            "classification": classification,
            "confidence": confidence,
            "satellite_match": match,
            "ndvi": ndvi,
            "ndwi": ndwi,
            "ndvi_source": "simulated",
            "ndwi_source": "simulated",
            "lulc": lulc,
            "change_detection": change,
            "anomaly": anomaly,
            "fused_record": fused,
        }


class RealGeoAIProvider:
    """Reserved for a future trained pipeline (Ved / production Geo AI)."""

    name = "RealGeoAIProvider"

    def analyze(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "RealGeoAIProvider is a boundary only. Configure MockGeoAIProvider for the MVP."
        )


def get_geo_ai_provider() -> GeoAIProvider:
    return MockGeoAIProvider()
