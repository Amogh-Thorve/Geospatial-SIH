"""Bhuvan LULC Statistics / AOI provider tests (mocked HTTP)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.geoai.providers.bhuvan_lulc import (
    BhuvanLulcConfig,
    aoi_polygon_wkt,
    build_aoi_params,
    build_point_params,
    query_lulc_aoi,
    query_lulc_statistics,
)


@pytest.fixture
def lulc_cfg() -> BhuvanLulcConfig:
    return BhuvanLulcConfig(
        enabled=True,
        access_token="test-token",
        api_base="https://bhuvan-app1.nrsc.gov.in/api",
        year="2015_16",
        timeout_seconds=5.0,
        aoi_delta_deg=0.01,
    )


def test_build_point_and_aoi_params(lulc_cfg: BhuvanLulcConfig) -> None:
    point = build_point_params(13.2172, 79.1003, lulc_cfg)
    assert point["lat"] == "13.217200"
    assert point["lon"] == "79.100300"
    assert point["year"] == "2015_16"
    assert point["option"] == "json"
    assert point["token"] == "test-token"

    aoi = build_aoi_params(13.2172, 79.1003, lulc_cfg)
    assert aoi["polygon"].startswith("POLYGON((")
    assert aoi["year"] == "2015_16"


def test_aoi_polygon_wkt_order() -> None:
    poly = aoi_polygon_wkt(13.0, 79.0, 0.1)
    assert poly.startswith("POLYGON((78.9 12.9")


def test_disabled_returns_unavailable(lulc_cfg: BhuvanLulcConfig) -> None:
    disabled = lulc_cfg.__class__(**{**lulc_cfg.__dict__, "enabled": False})
    result = query_lulc_statistics(13.2, 79.1, config=disabled)
    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_LULC_DISABLED"


def test_missing_token_not_configured(lulc_cfg: BhuvanLulcConfig) -> None:
    no_token = lulc_cfg.__class__(**{**lulc_cfg.__dict__, "access_token": ""})
    result = query_lulc_statistics(13.2, 79.1, config=no_token)
    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_LULC_NOT_CONFIGURED"


def test_invalid_token_response(lulc_cfg: BhuvanLulcConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = (
        '{"error":"invalid_token","error_description":"The access token provided is invalid"}'
    )
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "text/html"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2172, 79.1003, config=lulc_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_INVALID_TOKEN"
    assert "confidence" not in result
    assert result["statistics"] == {}


def test_successful_point_statistics(lulc_cfg: BhuvanLulcConfig) -> None:
    payload = [
        {"Year": "2015_16", "LULC Description": "Agriculture", "Area in Sq. Km": 1.2},
        {"Year": "2015_16", "LULC Description": "Built-up", "Area in Sq. Km": 0.4},
    ]
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = str(payload).replace("'", '"')
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "application/json"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2172, 79.1003, config=lulc_cfg)

    assert result["status"] == "AVAILABLE"
    assert result["provider_type"] == "LULC Statistics"
    assert result["lulc"] == "Agriculture"
    assert result["statistics"]["Built-up"] == 0.4
    assert "ndvi" not in result


def test_successful_aoi_statistics(lulc_cfg: BhuvanLulcConfig) -> None:
    payload = [{"Year": "2015_16", "LULC Description": "Water Bodies", "Area in Sq. Km": 0.2}]
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = str(payload).replace("'", '"')
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "application/json"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_aoi(13.2172, 79.1003, config=lulc_cfg)

    assert result["status"] == "AVAILABLE"
    assert result["provider_type"] == "LULC AOI Wise"
    assert result["lulc"] == "Water Bodies"


def test_timeout_unavailable(lulc_cfg: BhuvanLulcConfig) -> None:
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.side_effect = httpx.TimeoutException("timeout")

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2, 79.1, config=lulc_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_LULC_TIMEOUT"


def test_malformed_response_unavailable(lulc_cfg: BhuvanLulcConfig) -> None:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "<html>not json</html>"
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "text/html"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2, 79.1, config=lulc_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_LULC_EMPTY_OR_MALFORMED"


def test_provider_prefers_bhuvan_lulc_over_local_label(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ai import provider as provider_module
    from app.ai.provider import VedGeoAIProvider
    from app.geoai.providers.bhuvan_lulc import BhuvanLulcConfig

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_lulc_config",
        lambda: BhuvanLulcConfig(
            enabled=True,
            access_token="token",
            api_base="https://example.test/api",
            year="2015_16",
            timeout_seconds=5.0,
            aoi_delta_deg=0.01,
        ),
    )
    monkeypatch.setattr(
        provider_module,
        "query_bhuvan_lulc",
        lambda lat, lon, config=None: {
            "provider": "Bhuvan",
            "provider_type": "LULC Statistics",
            "status": "AVAILABLE",
            "dataset": "Bhuvan LULC 250K",
            "year": "2015_16",
            "lulc": "Agriculture",
            "statistics": {"Agriculture": 1.0},
            "metadata": {},
        },
    )
    from app.geoai.providers.bhuvan import BhuvanConfig

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_config",
        lambda: BhuvanConfig(
            enabled=False,
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
    monkeypatch.setattr(provider_module, "query_bhuvan", lambda *a, **k: None)

    result = VedGeoAIProvider().analyze({"lat": 13.2172, "lng": 79.1003})
    assert result["lulc"] == "Agriculture"
    assert result["lulc_source"] == "bhuvan_lulc_250k"
    assert result["ndvi_source"] == "satellite_lookup"
    assert result["confidence"] is None


def test_provider_fallback_labels_local_when_bhuvan_lulc_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ai import provider as provider_module
    from app.ai.provider import VedGeoAIProvider
    from app.geoai.providers.bhuvan_lulc import BhuvanLulcConfig

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_lulc_config",
        lambda: BhuvanLulcConfig(
            enabled=True,
            access_token="token",
            api_base="https://example.test/api",
            year="2015_16",
            timeout_seconds=5.0,
            aoi_delta_deg=0.01,
        ),
    )
    monkeypatch.setattr(
        provider_module,
        "query_bhuvan_lulc",
        lambda lat, lon, config=None: {
            "status": "UNAVAILABLE",
            "reason": "BHUVAN_INVALID_TOKEN",
        },
    )
    from app.geoai.providers.bhuvan import BhuvanConfig

    monkeypatch.setattr(
        provider_module,
        "get_bhuvan_config",
        lambda: BhuvanConfig(
            enabled=False,
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
    monkeypatch.setattr(provider_module, "query_bhuvan", lambda *a, **k: None)

    result = VedGeoAIProvider().analyze({"lat": 13.2172, "lng": 79.1003})
    assert result["lulc_source"] == "local_satellite_grid"
    assert result["lulc"] == "Barren"
    assert "local satellite grid" in result["change_detection"] or "Bhuvan" in result["change_detection"]


def test_http_failure_unavailable(lulc_cfg: BhuvanLulcConfig) -> None:
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.side_effect = httpx.HTTPError("connection refused")

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2, 79.1, config=lulc_cfg)

    assert result["status"] == "UNAVAILABLE"
    assert result["reason"] == "BHUVAN_LULC_HTTP_ERROR"


def test_query_bhuvan_lulc_falls_back_to_aoi(lulc_cfg: BhuvanLulcConfig) -> None:
    point_unavailable = {
        "status": "UNAVAILABLE",
        "reason": "BHUVAN_LULC_EMPTY_OR_MALFORMED",
        "provider_type": "LULC Statistics",
    }
    aoi_payload = [{"Year": "2015_16", "LULC Description": "Forest", "Area in Sq. Km": 0.8}]
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = str(aoi_payload).replace("'", '"')
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "application/json"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with (
        patch(
            "app.geoai.providers.bhuvan_lulc.query_lulc_statistics",
            return_value=point_unavailable,
        ),
        patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client),
    ):
        from app.geoai.providers.bhuvan_lulc import query_bhuvan_lulc

        result = query_bhuvan_lulc(13.2172, 79.1003, config=lulc_cfg)

    assert result["status"] == "AVAILABLE"
    assert result["provider_type"] == "LULC AOI Wise"
    assert result["lulc"] == "Forest"


def test_xai_persists_bhuvan_lulc_metadata() -> None:
    from app.services.xai import build_xai

    analysis = {
        "lulc": "Agriculture",
        "classification": "Agriculture",
        "ndvi": 0.42,
        "ndwi": -0.1,
        "lulc_source": "bhuvan_lulc_250k",
        "bhuvan_lulc": {
            "provider": "Bhuvan",
            "status": "AVAILABLE",
            "dataset": "Bhuvan LULC 250K",
            "year": "2015_16",
            "lulc": "Agriculture",
            "statistics": {"Agriculture": 1.2},
        },
        "change_detection": "Bhuvan LULC 250K (2015_16) class: Agriculture.",
    }
    xai = build_xai(analysis)
    assert xai["lulc_source"] == "bhuvan_lulc_250k"
    assert xai["bhuvan_lulc"]["dataset"] == "Bhuvan LULC 250K"
    assert xai["confidence"] is None
    assert "Bhuvan LULC 250K class: Agriculture" in " ".join(xai["explanation"])


def test_successful_point_description_field(lulc_cfg: BhuvanLulcConfig) -> None:
    """Live Bhuvan point API returns Description (not LULC Description)."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = (
        '[{"Year":"2015_16","Description":"Built-up                                                                                            "}]'
    )
    mock_response.content = mock_response.text.encode()
    mock_response.headers = {"content-type": "text/html; charset=UTF-8"}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = mock_response

    with patch("app.geoai.providers.bhuvan_lulc.httpx.Client", return_value=mock_client):
        result = query_lulc_statistics(13.2172, 79.1003, config=lulc_cfg)

    assert result["status"] == "AVAILABLE"
    assert result["lulc"] == "Built-up"
    assert result["year"] == "2015_16"
    assert "Built-up" in result["statistics"]


def test_default_timeout_is_sixty_seconds() -> None:
    from app.config import BhuvanSettings

    settings = BhuvanSettings()
    assert settings.timeout_seconds == 60.0
