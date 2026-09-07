"""Bhuvan LULC Statistics / AOI Wise API provider.

Official Bhuvan API portal:
  https://bhuvan-app1.nrsc.gov.in/api/

Verified endpoints (probe 2026-09-07):
  LULC 250K Statistics (point):
    GET https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k_point.php
    params: lat, lon, year, option, token

  LULC 250K AOI Wise:
    GET/POST https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k.php
    params: polygon (WKT POLYGON), year, option, token

Authentication:
  Access token issued from Bhuvan API portal (theme: LULC Statistics / LULC AOI Wise).
  Requests without a valid token return:
    {"error":"invalid_token","error_description":"The access token provided is invalid"}

This module does NOT infer NDVI, NDWI, confidence, or change detection from Bhuvan LULC.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.geoai.providers.bhuvan import validate_wgs84_coordinates

logger = logging.getLogger("geowise.bhuvan.lulc")

LULC250K_POINT_PATH = "lulc250k/curl_lulc250k_point.php"
LULC250K_AOI_PATH = "lulc250k/curl_lulc250k.php"
DATASET_NAME = "Bhuvan LULC 250K"


@dataclass(frozen=True)
class BhuvanLulcConfig:
    enabled: bool
    access_token: str
    api_base: str
    year: str
    timeout_seconds: float
    aoi_delta_deg: float

    @property
    def configured(self) -> bool:
        return bool(self.enabled and self.access_token.strip() and self.api_base.strip())


def get_bhuvan_lulc_config() -> BhuvanLulcConfig:
    settings = get_settings().bhuvan
    return BhuvanLulcConfig(
        enabled=settings.lulc_enabled,
        access_token=settings.access_token.strip(),
        api_base=settings.lulc_api_base.strip().rstrip("/"),
        year=settings.lulc_year.strip() or "2015_16",
        timeout_seconds=float(settings.timeout_seconds),
        aoi_delta_deg=float(settings.lulc_aoi_delta_deg),
    )


def aoi_polygon_wkt(latitude: float, longitude: float, delta_deg: float) -> str:
    validate_wgs84_coordinates(latitude, longitude)
    min_lon = longitude - delta_deg
    max_lon = longitude + delta_deg
    min_lat = latitude - delta_deg
    max_lat = latitude + delta_deg
    return (
        f"POLYGON(({min_lon} {min_lat},{max_lon} {min_lat},"
        f"{max_lon} {max_lat},{min_lon} {max_lat},{min_lon} {min_lat}))"
    )


def build_point_params(
    latitude: float,
    longitude: float,
    config: BhuvanLulcConfig,
    *,
    year: str | None = None,
) -> dict[str, str]:
    validate_wgs84_coordinates(latitude, longitude)
    return {
        "lat": f"{latitude:.6f}",
        "lon": f"{longitude:.6f}",
        "year": year or config.year,
        "option": "json",
        "token": config.access_token,
    }


def build_aoi_params(
    latitude: float,
    longitude: float,
    config: BhuvanLulcConfig,
    *,
    year: str | None = None,
    polygon_wkt: str | None = None,
) -> dict[str, str]:
    polygon = polygon_wkt or aoi_polygon_wkt(latitude, longitude, config.aoi_delta_deg)
    return {
        "polygon": polygon,
        "year": year or config.year,
        "option": "json",
        "token": config.access_token,
    }


def _build_url(base: str, path: str, params: dict[str, str]) -> str:
    return f"{base.rstrip('/')}/{path}?{urlencode(params)}"


def _extract_json_payload(body: str) -> Any | None:
    stripped = body.strip()
    if not stripped:
        return None
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass
    match = re.search(r"(\{.*\}|\[.*\])", body, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def _parse_statistics_records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        if payload.get("error"):
            return []
        for key in ("data", "records", "statistics", "result"):
            if isinstance(payload.get(key), list):
                return [row for row in payload[key] if isinstance(row, dict)]
        return []
    if not isinstance(payload, list):
        return []
    return [row for row in payload if isinstance(row, dict)]


def _record_lulc_label(row: dict[str, Any]) -> str | None:
    """Extract LULC class label from known Bhuvan response field names.

    Live point API returns ``Description``; AOI/docs may return ``LULC Description``.
    """
    for key in (
        "LULC Description",
        "Description",
        "description",
        "lulc",
        "class",
    ):
        value = row.get(key)
        if value is None:
            continue
        label = str(value).strip()
        if label:
            return label
    return None


def _record_year(row: dict[str, Any]) -> str | None:
    for key in ("Year", "year"):
        value = row.get(key)
        if value is None:
            continue
        year = str(value).strip()
        if year:
            return year
    return None


def _dominant_lulc_class(records: list[dict[str, Any]]) -> str | None:
    if not records:
        return None
    best_label = None
    best_area = -1.0
    for row in records:
        label = _record_lulc_label(row)
        if not label:
            continue
        area_raw = row.get("Area in Sq. Km") or row.get("area_sq_km") or row.get("area")
        try:
            area = float(area_raw)
        except (TypeError, ValueError):
            area = 0.0
        if area > best_area:
            best_area = area
            best_label = label
    if best_label:
        return best_label
    return _record_lulc_label(records[0])


def _statistics_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, float] = {}
    for row in records:
        label = _record_lulc_label(row)
        if not label:
            continue
        area_raw = row.get("Area in Sq. Km") or row.get("area_sq_km") or row.get("area")
        try:
            area = float(area_raw)
        except (TypeError, ValueError):
            # Point API often returns Description without area; still record the class.
            summary.setdefault(label, 0.0)
            continue
        summary[label] = summary.get(label, 0.0) + area
    return summary


def _unavailable(
    config: BhuvanLulcConfig,
    reason: str,
    *,
    provider_type: str,
    latitude: float | None = None,
    longitude: float | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "provider": "Bhuvan",
        "provider_type": provider_type,
        "status": "UNAVAILABLE",
        "dataset": DATASET_NAME,
        "year": config.year,
        "lulc": None,
        "statistics": {},
        "source": f"{config.api_base}/{provider_type}",
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "metadata": metadata or {},
        "reason": reason,
    }


def _available(
    config: BhuvanLulcConfig,
    *,
    provider_type: str,
    latitude: float,
    longitude: float,
    records: list[dict[str, Any]],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    dominant = _dominant_lulc_class(records)
    year = config.year
    for row in records:
        extracted = _record_year(row)
        if extracted:
            year = extracted
            break
    return {
        "provider": "Bhuvan",
        "provider_type": provider_type,
        "status": "AVAILABLE",
        "dataset": DATASET_NAME,
        "year": year,
        "lulc": dominant,
        "statistics": _statistics_summary(records),
        "source": metadata.get("request_url"),
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "metadata": metadata,
        "records": records,
    }


def _request_lulc(
    config: BhuvanLulcConfig,
    path: str,
    params: dict[str, str],
    provider_type: str,
    latitude: float,
    longitude: float,
) -> dict[str, Any]:
    url = _build_url(config.api_base, path, params)
    metadata: dict[str, Any] = {
        "request_url": url.split("token=")[0] + "token=<redacted>",
        "http_method": "GET",
        "path": path,
    }
    try:
        with httpx.Client(timeout=config.timeout_seconds, follow_redirects=True) as client:
            response = client.get(url)
    except httpx.TimeoutException:
        return _unavailable(
            config,
            "BHUVAN_LULC_TIMEOUT",
            provider_type=provider_type,
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )
    except httpx.HTTPError as exc:
        logger.warning("Bhuvan LULC request failed: %s", exc)
        return _unavailable(
            config,
            "BHUVAN_LULC_HTTP_ERROR",
            provider_type=provider_type,
            latitude=latitude,
            longitude=longitude,
            metadata={**metadata, "error": str(exc)},
        )

    body = response.text or ""
    metadata.update(
        {
            "http_status": response.status_code,
            "content_type": response.headers.get("content-type"),
            "response_bytes": len(response.content or b""),
        }
    )
    payload = _extract_json_payload(body)
    if isinstance(payload, dict) and payload.get("error"):
        reason = str(payload.get("error"))
        if reason == "invalid_token":
            reason = "BHUVAN_INVALID_TOKEN"
        return _unavailable(
            config,
            reason,
            provider_type=provider_type,
            latitude=latitude,
            longitude=longitude,
            metadata={**metadata, "error_description": payload.get("error_description")},
        )
    records = _parse_statistics_records(payload)
    if response.status_code != 200 or not records:
        metadata["preview"] = body[:300]
        return _unavailable(
            config,
            "BHUVAN_LULC_EMPTY_OR_MALFORMED",
            provider_type=provider_type,
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )
    result = _available(
        config,
        provider_type=provider_type,
        latitude=latitude,
        longitude=longitude,
        records=records,
        metadata=metadata,
    )
    if not result.get("lulc"):
        metadata["preview"] = body[:300]
        return _unavailable(
            config,
            "BHUVAN_LULC_EMPTY_OR_MALFORMED",
            provider_type=provider_type,
            latitude=latitude,
            longitude=longitude,
            metadata=metadata,
        )
    return result


def query_lulc_statistics(
    latitude: float,
    longitude: float,
    config: BhuvanLulcConfig | None = None,
) -> dict[str, Any]:
    """Point LULC statistics (LULC 250K Statistics)."""
    cfg = config or get_bhuvan_lulc_config()
    if not cfg.enabled:
        return _unavailable(cfg, "BHUVAN_LULC_DISABLED", provider_type="LULC Statistics")
    if not cfg.configured:
        return _unavailable(cfg, "BHUVAN_LULC_NOT_CONFIGURED", provider_type="LULC Statistics")
    params = build_point_params(latitude, longitude, cfg)
    return _request_lulc(
        cfg,
        LULC250K_POINT_PATH,
        params,
        "LULC Statistics",
        latitude,
        longitude,
    )


def query_lulc_aoi(
    latitude: float,
    longitude: float,
    config: BhuvanLulcConfig | None = None,
    *,
    polygon_wkt: str | None = None,
) -> dict[str, Any]:
    """AOI-wise LULC statistics (LULC 250K AOI Wise)."""
    cfg = config or get_bhuvan_lulc_config()
    if not cfg.enabled:
        return _unavailable(cfg, "BHUVAN_LULC_DISABLED", provider_type="LULC AOI Wise")
    if not cfg.configured:
        return _unavailable(cfg, "BHUVAN_LULC_NOT_CONFIGURED", provider_type="LULC AOI Wise")
    params = build_aoi_params(latitude, longitude, cfg, polygon_wkt=polygon_wkt)
    return _request_lulc(
        cfg,
        LULC250K_AOI_PATH,
        params,
        "LULC AOI Wise",
        latitude,
        longitude,
    )


def query_bhuvan_lulc(
    latitude: float,
    longitude: float,
    config: BhuvanLulcConfig | None = None,
) -> dict[str, Any]:
    """Prefer point statistics; fall back to AOI-wise for the same coordinate."""
    point = query_lulc_statistics(latitude, longitude, config=config)
    if point.get("status") == "AVAILABLE" and point.get("lulc"):
        return point
    aoi = query_lulc_aoi(latitude, longitude, config=config)
    if aoi.get("status") == "AVAILABLE" and aoi.get("lulc"):
        return aoi
    return point if point.get("reason") != "BHUVAN_LULC_NOT_CONFIGURED" else aoi


def bhuvan_lulc_health_status() -> dict[str, Any]:
    cfg = get_bhuvan_lulc_config()
    base = {
        "enabled": cfg.enabled,
        "configured": cfg.configured,
        "dataset": DATASET_NAME,
        "year": cfg.year,
        "api_base": cfg.api_base,
        "point_endpoint": f"{cfg.api_base}/{LULC250K_POINT_PATH}",
        "aoi_endpoint": f"{cfg.api_base}/{LULC250K_AOI_PATH}",
        "authentication": "access_token_required",
    }
    if not cfg.enabled:
        return {**base, "status": "UNAVAILABLE", "reason": "BHUVAN_LULC_DISABLED"}
    if not cfg.configured:
        return {**base, "status": "UNAVAILABLE", "reason": "BHUVAN_ACCESS_TOKEN_MISSING"}
    return {**base, "status": "CONFIGURED_AWAITING_TOKEN_VALIDATION"}
