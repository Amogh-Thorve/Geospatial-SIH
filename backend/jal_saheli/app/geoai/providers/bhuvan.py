"""ISRO Bhuvan OGC WMS provider.

Official WMS endpoint (Bhuvan wiki):
  https://bhuvan.nrsc.gov.in/wiki/index.php/How_to_use_WMS_services

  URL:     https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms
  Version: 1.1.1
  CRS:     EPSG:4326 (SRS parameter for WMS 1.1.1)
  Format:  image/png
  Example layer: lulc:BR_LULC50K_1112 (regional LULC 1:50k thematic map)

WMS GetMap returns map imagery only. This module does NOT infer LULC, NDVI,
NDWI, confidence, or change detection from a rendered image.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import get_settings

logger = logging.getLogger("geowise.bhuvan")

DEFAULT_WMS_URL = "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
DEFAULT_LAYER = "lulc:BR_LULC50K_1112"
DEFAULT_VERSION = "1.1.1"
DEFAULT_CRS = "EPSG:4326"
DEFAULT_FORMAT = "image/png"
IMAGE_CONTENT_PREFIXES = ("image/",)


@dataclass(frozen=True)
class BhuvanConfig:
    enabled: bool
    wms_url: str
    layer: str
    version: str
    crs: str
    format: str
    timeout_seconds: float
    bbox_delta_deg: float
    map_width: int
    map_height: int

    @property
    def configured(self) -> bool:
        return bool(self.enabled and self.wms_url.strip() and self.layer.strip())


def get_bhuvan_config() -> BhuvanConfig:
    settings = get_settings().bhuvan
    return BhuvanConfig(
        enabled=settings.enabled,
        wms_url=settings.wms_url.strip() or DEFAULT_WMS_URL,
        layer=settings.layer.strip() or DEFAULT_LAYER,
        version=settings.version.strip() or DEFAULT_VERSION,
        crs=settings.crs.strip() or DEFAULT_CRS,
        format=settings.format.strip() or DEFAULT_FORMAT,
        timeout_seconds=float(settings.timeout_seconds),
        bbox_delta_deg=float(settings.bbox_delta_deg),
        map_width=int(settings.map_width),
        map_height=int(settings.map_height),
    )


def validate_wgs84_coordinates(latitude: float, longitude: float) -> None:
    if latitude < -90 or latitude > 90:
        raise ValueError(f"latitude must be between -90 and 90, got {latitude}")
    if longitude < -180 or longitude > 180:
        raise ValueError(f"longitude must be between -180 and 180, got {longitude}")


def bbox_around_point(
    latitude: float,
    longitude: float,
    delta_deg: float,
) -> tuple[float, float, float, float]:
    """WMS 1.1.1 EPSG:4326 axis order: minx, miny, maxx, maxy (lon, lat)."""
    return (
        longitude - delta_deg,
        latitude - delta_deg,
        longitude + delta_deg,
        latitude + delta_deg,
    )


def build_getcapabilities_params(config: BhuvanConfig) -> dict[str, str]:
    return {
        "SERVICE": "WMS",
        "REQUEST": "GetCapabilities",
        "VERSION": config.version,
    }


def build_getmap_params(
    config: BhuvanConfig,
    latitude: float,
    longitude: float,
    bbox: tuple[float, float, float, float] | None = None,
) -> dict[str, str]:
    validate_wgs84_coordinates(latitude, longitude)
    bounds = bbox or bbox_around_point(latitude, longitude, config.bbox_delta_deg)
    return {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": config.version,
        "LAYERS": config.layer,
        "SRS": config.crs,
        "BBOX": ",".join(f"{value:.6f}" for value in bounds),
        "WIDTH": str(config.map_width),
        "HEIGHT": str(config.map_height),
        "FORMAT": config.format,
        "STYLES": "",
    }


def _build_url(base_url: str, params: dict[str, str]) -> str:
    return f"{base_url.rstrip('?')}?{urlencode(params)}"


def _is_image_response(content_type: str | None, body: bytes) -> bool:
    if not body:
        return False
    if content_type:
        lowered = content_type.lower()
        if any(lowered.startswith(prefix) for prefix in IMAGE_CONTENT_PREFIXES):
            return True
    # Some WMS servers omit content-type; PNG magic bytes are a safe signal.
    return body.startswith(b"\x89PNG\r\n\x1a\n")


def _is_service_exception(body: bytes) -> bool:
    lowered = body[:512].lower()
    return b"serviceexception" in lowered or b"<ogc:serviceexception" in lowered


def _unavailable_result(
    config: BhuvanConfig,
    reason: str,
    *,
    latitude: float | None = None,
    longitude: float | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "provider": "Bhuvan",
        "provider_type": "WMS",
        "status": "UNAVAILABLE",
        "source": config.layer,
        "service_url": config.wms_url,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "metadata": metadata or {},
        "reason": reason,
    }


def _available_result(
    config: BhuvanConfig,
    latitude: float,
    longitude: float,
    *,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    return {
        "provider": "Bhuvan",
        "provider_type": "WMS",
        "status": "AVAILABLE",
        "source": config.layer,
        "service_url": config.wms_url,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "metadata": metadata,
    }


def check_bhuvan_reachability(config: BhuvanConfig | None = None) -> dict[str, Any]:
    """Connectivity probe via WMS GetCapabilities, with GetMap fallback."""
    cfg = config or get_bhuvan_config()
    base = {
        "enabled": cfg.enabled,
        "configured": cfg.configured,
        "reachable": False,
        "service_url": cfg.wms_url,
        "layer": cfg.layer,
        "crs": cfg.crs,
        "version": cfg.version,
        "format": cfg.format,
        "provider_type": "WMS",
    }
    if not cfg.enabled:
        return {**base, "status": "UNAVAILABLE", "reason": "BHUVAN_DISABLED"}
    if not cfg.configured:
        return {**base, "status": "UNAVAILABLE", "reason": "BHUVAN_NOT_CONFIGURED"}

    caps_url = _build_url(cfg.wms_url, build_getcapabilities_params(cfg))
    try:
        with httpx.Client(timeout=cfg.timeout_seconds, follow_redirects=True) as client:
            response = client.get(caps_url)
    except httpx.TimeoutException:
        response = None
    except httpx.HTTPError as exc:
        logger.warning("Bhuvan GetCapabilities failed: %s", exc)
        response = None

    if response is not None and response.status_code == 200 and response.content:
        body_lower = response.content[:256].lower()
        if b"wms_capabilities" in body_lower or b"ogc:wms_capabilities" in body_lower:
            metadata = {
                "http_status": response.status_code,
                "content_type": response.headers.get("content-type"),
                "response_bytes": len(response.content),
                "request": "GetCapabilities",
            }
            return {
                **base,
                "reachable": True,
                "status": "AVAILABLE",
                "metadata": metadata,
            }

    # Fallback: lightweight GetMap at a coordinate inside the default layer extent.
    probe_lat, probe_lon = 25.9, 85.81
    probe = query_bhuvan(probe_lat, probe_lon, config=cfg)
    if probe.get("status") == "AVAILABLE":
        return {
            **base,
            "reachable": True,
            "status": "AVAILABLE",
            "metadata": {
                **(probe.get("metadata") or {}),
                "request": "GetMap",
                "probe_coordinates": {"latitude": probe_lat, "longitude": probe_lon},
                "capabilities_probe": "failed_or_invalid",
            },
        }

    reason = probe.get("reason", "BHUVAN_UNREACHABLE")
    return {
        **base,
        "status": "UNAVAILABLE",
        "reason": reason,
        "metadata": probe.get("metadata"),
    }


def bhuvan_health_status() -> dict[str, Any]:
    return check_bhuvan_reachability()


def query_bhuvan(
    latitude: float,
    longitude: float,
    bbox: tuple[float, float, float, float] | None = None,
    config: BhuvanConfig | None = None,
) -> dict[str, Any]:
    """Issue a WMS GetMap for the coordinate and return structured metadata only."""
    cfg = config or get_bhuvan_config()
    if not cfg.enabled:
        return _unavailable_result(cfg, "BHUVAN_DISABLED", latitude=latitude, longitude=longitude)
    if not cfg.configured:
        return _unavailable_result(cfg, "BHUVAN_NOT_CONFIGURED", latitude=latitude, longitude=longitude)

    try:
        validate_wgs84_coordinates(latitude, longitude)
    except ValueError as exc:
        return _unavailable_result(
            cfg,
            "INVALID_COORDINATES",
            latitude=latitude,
            longitude=longitude,
            metadata={"error": str(exc)},
        )

    params = build_getmap_params(cfg, latitude, longitude, bbox=bbox)
    url = _build_url(cfg.wms_url, params)
    try:
        with httpx.Client(timeout=cfg.timeout_seconds, follow_redirects=True) as client:
            response = client.get(url)
    except httpx.TimeoutException:
        return _unavailable_result(
            cfg,
            "BHUVAN_TIMEOUT",
            latitude=latitude,
            longitude=longitude,
            metadata={"request": "GetMap"},
        )
    except httpx.HTTPError as exc:
        logger.warning("Bhuvan GetMap failed: %s", exc)
        return _unavailable_result(
            cfg,
            "BHUVAN_HTTP_ERROR",
            latitude=latitude,
            longitude=longitude,
            metadata={"request": "GetMap", "error": str(exc)},
        )

    content_type = response.headers.get("content-type")
    body = response.content or b""
    metadata: dict[str, Any] = {
        "http_status": response.status_code,
        "content_type": content_type,
        "response_bytes": len(body),
        "request": "GetMap",
        "bbox": params["BBOX"],
        "width": cfg.map_width,
        "height": cfg.map_height,
        "format": cfg.format,
    }
    if response.status_code != 200:
        return _unavailable_result(
            cfg,
            "BHUVAN_BAD_HTTP_STATUS",
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )
    if _is_service_exception(body):
        metadata["service_exception"] = body[:500].decode("utf-8", errors="replace")
        return _unavailable_result(
            cfg,
            "BHUVAN_SERVICE_EXCEPTION",
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )
    if not _is_image_response(content_type, body):
        metadata["preview"] = body[:200].decode("utf-8", errors="replace")
        return _unavailable_result(
            cfg,
            "BHUVAN_NON_IMAGE_RESPONSE",
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )

    return _available_result(cfg, latitude, longitude, metadata=metadata)
