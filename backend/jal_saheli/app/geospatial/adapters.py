"""Future adapters for Drishti, Srishti, satellite, and historical records."""

from __future__ import annotations

from typing import Any, Protocol


class SourceAdapter(Protocol):
    name: str

    def fetch(self, lat: float, lng: float) -> dict[str, Any]:
        ...


class LocalDrishtiAdapter:
    """Placeholder for geo-tagged field photos (Drishti)."""

    name = "drishti-local"

    def fetch(self, lat: float, lng: float) -> dict[str, Any]:
        return {
            "source": self.name,
            "kind": "geo_tagged_photo",
            "lat": lat,
            "lng": lng,
            "live": False,
        }


class LocalSrishtiAdapter:
    """Placeholder for satellite-derived context (Srishti). No live imagery is fetched."""

    name = "srishti-local"

    def fetch(self, lat: float, lng: float) -> dict[str, Any]:
        return {
            "source": self.name,
            "kind": "satellite_context",
            "lat": lat,
            "lng": lng,
            "live": False,
            "note": "Demo adapter — no satellite granules downloaded.",
        }


class HistoricalRecordsAdapter:
    name = "historical-local"

    def fetch(self, lat: float, lng: float) -> dict[str, Any]:
        return {
            "source": self.name,
            "kind": "historical_watershed",
            "lat": lat,
            "lng": lng,
            "live": False,
            "similar_success_rate": 0.86,
        }


def fuse_record(
    photo: dict[str, Any],
    satellite: dict[str, Any],
    historical: dict[str, Any],
) -> dict[str, Any]:
    """Normalize heterogeneous inputs into one geospatial record."""
    return {
        "lat": photo.get("lat") or satellite.get("lat"),
        "lng": photo.get("lng") or satellite.get("lng"),
        "sources": [photo.get("source"), satellite.get("source"), historical.get("source")],
        "live_integrations": False,
        "historical_success_rate": historical.get("similar_success_rate"),
        "fused": True,
    }
