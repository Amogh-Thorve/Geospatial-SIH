"""Bhuvan WMS provider tests (HTTP mocked — no live Bhuvan dependency)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.geoai.providers.bhuvan import (
    BhuvanConfig,
    bbox_around_point,
    build_getcapabilities_params,
    build_getmap_params,
    check_bhuvan_reachability,
    get_bhuvan_config,
    query_bhuvan,
    validate_wgs84_coordinates,
)


def _png_bytes() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _capabilities_xml() -> bytes:
    return b'<?xml version="1.0"?><WMS_Capabilities version="1.1.1"></WMS_Capabilities>'


@pytest.fixture
def bhuvan_cfg() -> BhuvanConfig:
    return BhuvanConfig(
        enabled=True,
        wms_url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
        layer="lulc:BR_LULC50K_1112",
        version="1.1.1",
        crs="EPSG:4326",
        format="image/png",
        timeout_seconds=5.0,
        bbox_delta_deg=0.05,
        map_width=256,
        map_height=256,
    )


def test_validate_wgs84_coordinates() -> None:
    validate_wgs84_coordinates(13.2, 79.1)
    with pytest.raises(ValueError):
        validate_wgs84_coordinates(91, 0)
    with pytest.raises(ValueError):
        validate_wgs84_coordinates(0, 181)


def test_bbox_around_point_order() -> None:
    bbox = bbox_around_point(13.0, 79.0, 0.1)
    assert bbox == (78.9, 12.9, 79.1, 13.1)


def test_build_getmap_params() -> None:
    cfg = BhuvanConfig(
        enabled=True,
        wms_url="https://example.test/wms",
        layer="lulc:test",
        version="1.1.1",
        crs="EPSG:4326",
        format="image/png",
        timeout_seconds=5.0,
        bbox_delta_deg=0.05,
        map_width=128,
        map_height=128,
    )
    params = build_getmap_params(cfg, 13.2172, 79.1003)
    assert params["SERVICE"] == "WMS"
    assert params["REQUEST"] == "GetMap"
    assert params["LAYERS"] == "lulc:test"
    assert params["SRS"] == "EPSG:4326"
    assert params["FORMAT"] == "image/png"
    assert "79.050300" in params["BBOX"]


def test_build_getcapabilities_params() -> None:
    cfg = get_bhuvan_config()
    params = build_getcapabilities_params(cfg)
    assert params == {"SERVICE": "WMS", "REQUEST": "GetCapabilities", "VERSION": "1.1.1"}


def test_disabled_configuration_returns_unavailable(bhuvan_cfg: BhuvanConfig) -> None:
    disabled = bhuvan_cfg.__class__(**{**bhuvan_cfg.__dict__, "enabled": False})
    health = check_bhuvan_reachability(disabled)
    assert health["enabled"] is False
    assert health["reachable"] is False
    assert health["status"] == "UNAVAILABLE"

    result = query_bhuvan(13.2, 79.1, config=disabled)
    assert result["status"] == "UNAVAILABLE"
    assert result["provider"] == "Bhuvan"
    assert "confidence" not in result


def test_successful_getcapabilities_reachability(bhuvan_cfg: BhuvanConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = _capabilities_xml()
    mock_response.headers = {"content-type": "text/xml"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        health = check_bhuvan_reachability(bhuvan_cfg)

    assert health["reachable"] is True
    assert health["status"] == "AVAILABLE"
    assert health["provider_type"] == "WMS"


def test_http_failure_unreachable(bhuvan_cfg: BhuvanConfig) -> None:
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.side_effect = httpx.ConnectError("connection refused")

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        health = check_bhuvan_reachability(bhuvan_cfg)

    assert health["reachable"] is False
    assert health["status"] == "UNAVAILABLE"


def test_timeout_unreachable(bhuvan_cfg: BhuvanConfig) -> None:
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.side_effect = httpx.TimeoutException("timed out")

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        result = query_bhuvan(13.2, 79.1, config=bhuvan_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_TIMEOUT"


def test_malformed_capabilities_response(bhuvan_cfg: BhuvanConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"<html>not wms</html>"
    mock_response.headers = {"content-type": "text/html"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        health = check_bhuvan_reachability(bhuvan_cfg)

    assert health["reachable"] is False
    assert health["status"] == "UNAVAILABLE"


def test_successful_getmap_query(bhuvan_cfg: BhuvanConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = _png_bytes()
    mock_response.headers = {"content-type": "image/png"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        result = query_bhuvan(13.2172, 79.1003, config=bhuvan_cfg)

    assert result["status"] == "AVAILABLE"
    assert result["provider_type"] == "WMS"
    assert result["metadata"]["response_bytes"] > 0
    assert "confidence" not in result


def test_service_exception_response(bhuvan_cfg: BhuvanConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"<ServiceException>Layer not found</ServiceException>"
    mock_response.headers = {"content-type": "text/xml"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan.httpx.Client", return_value=mock_client):
        result = query_bhuvan(13.2, 79.1, config=bhuvan_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_SERVICE_EXCEPTION"


def test_provider_fallback_labels_local_grid(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ai import provider as provider_module
    from app.ai.provider import VedGeoAIProvider

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_config",
        lambda: BhuvanConfig(
            enabled=True,
            wms_url="https://example.test/wms",
            layer="lulc:test",
            version="1.1.1",
            crs="EPSG:4326",
            format="image/png",
            timeout_seconds=5.0,
            bbox_delta_deg=0.05,
            map_width=256,
            map_height=256,
        ),
    )
    monkeypatch.setattr(
        provider_module,
        "query_bhuvan",
        lambda lat, lon, bbox=None, config=None: {
            "provider": "Bhuvan",
            "provider_type": "WMS",
            "status": "UNAVAILABLE",
            "reason": "BHUVAN_TIMEOUT",
            "source": "lulc:test",
        },
    )

    result = VedGeoAIProvider().analyze({"lat": 13.2172, "lng": 79.1003})
    assert result["satellite_imagery_provider"] == "local_satellite_grid"
    assert result["satellite_imagery_type"] == "NPZ"
    assert result["provider"] == "VedGeoAI-RF-Lookup"
    assert "local satellite grid" in result["change_detection"]
    assert result["confidence"] is None


def test_provider_uses_bhuvan_when_available(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ai import provider as provider_module
    from app.ai.provider import VedGeoAIProvider

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_config",
        lambda: BhuvanConfig(
            enabled=True,
            wms_url="https://example.test/wms",
            layer="lulc:test",
            version="1.1.1",
            crs="EPSG:4326",
            format="image/png",
            timeout_seconds=5.0,
            bbox_delta_deg=0.05,
            map_width=256,
            map_height=256,
        ),
    )
    monkeypatch.setattr(
        provider_module,
        "query_bhuvan",
        lambda lat, lon, bbox=None, config=None: {
            "provider": "Bhuvan",
            "provider_type": "WMS",
            "status": "AVAILABLE",
            "source": "lulc:test",
            "metadata": {"response_bytes": 128},
        },
    )

    result = VedGeoAIProvider().analyze({"lat": 13.2172, "lng": 79.1003})
    assert result["satellite_imagery_provider"] == "Bhuvan"
    assert result["satellite_imagery_type"] == "WMS"
    assert result["ndvi_source"] == "satellite_lookup"
    assert result["confidence"] is None
