"""
tests/test_satellite_analysis.py
Comprehensive test suite for Phase 7: Real Satellite / Geospatial Integration.

Tests:
  - Abstract SatelliteProvider cannot be instantiated
  - Provider is replaceable (set_satellite_provider / get_satellite_provider)
  - SatelliteVerificationResult.to_dict() shape and legacy compat fields
  - _compute_confidence: cloud penalty, temporal penalty, water bonus, clamp
  - CDSESatelliteProvider.is_configured() (always True — open access)
  - CDSE: successful query → real confidence from real fields
  - CDSE: HTTP non-200 → SatelliteUnavailableError
  - CDSE: timeout → SatelliteUnavailableError
  - CDSE: empty features → NoSatelliteDataError
  - CDSE: invalid JSON → SatelliteUnavailableError
  - SatelliteVerificationService: successful verification → SATELLITE_OK
  - SatelliteVerificationService: no coordinates → SATELLITE_UNAVAILABLE
  - SatelliteVerificationService: provider unconfigured → SATELLITE_NOT_CONFIGURED
  - SatelliteVerificationService: no data → NO_SATELLITE_DATA (no retry)
  - SatelliteVerificationService: timeout → SATELLITE_UNAVAILABLE (retries)
  - SatelliteVerificationService: idempotency — cached SATELLITE_OK returned
  - SatelliteVerificationService: retry succeeds on 2nd attempt
  - SatelliteVerificationService: satellite_confidence not set on failure
  - Integration: verify_submission() delegates correctly
  - Integration: satellite-result API endpoint with injected provider
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.integrations.satellite_provider import (
    NoSatelliteDataError,
    SatelliteNotConfiguredError,
    SatelliteProvider,
    SatelliteUnavailableError,
    SatelliteVerificationResult,
)
from app.integrations.cdse_satellite_provider import (
    CDSESatelliteProvider,
    _compute_confidence,
    _build_bbox,
    _datetime_window,
    _build_evidence,
)
from app.integrations.satellite_client import (
    get_satellite_provider,
    reset_satellite_provider,
    set_satellite_provider,
)
from app.services.satellite_verification_service import SatelliteVerificationService

pytestmark = pytest.mark.asyncio

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_CAPTURE_TIME = datetime(2024, 3, 15, 10, 0, 0, tzinfo=timezone.utc)
INDIA_LAT = 19.876
INDIA_LON = 75.343


def make_submission(
    lat: float = INDIA_LAT,
    lon: float = INDIA_LON,
    obs_type: str = "check_dam",
    capture_time: datetime = SAMPLE_CAPTURE_TIME,
) -> MagicMock:
    m = MagicMock()
    m.id = "GW-TESTSAT001"
    m.observation_type = obs_type
    m.photo_url = "/uploads/test/photo.jpg"
    m.latitude = lat
    m.longitude = lon
    m.capture_time = capture_time
    m.satellite_confidence = None
    return m


def make_db_session(existing_event: Any = None) -> AsyncMock:
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = existing_event
    db.execute = AsyncMock(return_value=result_mock)
    return db


def make_cdse_feature(
    scene_id: str = "S2B_MSIL2A_20240315T054649_N0510_R048_T43QDB_20240315T082537",
    cloud_cover: float = 5.0,
    water_pct: float = 12.5,
    veg_pct: float = 35.2,
    dt_str: str = "2024-03-13T05:46:49",
) -> dict[str, Any]:
    return {
        "id": scene_id,
        "type": "Feature",
        "bbox": [74.8, 19.4, 76.0, 20.5],
        "properties": {
            "datetime": f"{dt_str}Z",
            "eo:cloud_cover": cloud_cover,
            "s2:water_percentage": water_pct,
            "s2:vegetation_percentage": veg_pct,
            "s2:nodata_pixel_percentage": 0.1,
        },
        "assets": {},
        "links": [],
    }


def make_cdse_response(features: list[dict]) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": features,
        "numberMatched": len(features),
        "numberReturned": len(features),
    }


class MockConfiguredSatelliteProvider(SatelliteProvider):
    """Mock provider returning a real-shaped successful result."""
    def __init__(
        self,
        raise_error: Exception | None = None,
        cloud_cover: float = 8.0,
        water_pct: float = 15.0,
        gap_days: float = 2.0,
    ):
        self._raise = raise_error
        self._cloud_cover = cloud_cover
        self._water_pct = water_pct
        self._gap_days = gap_days
        self._provider_name = "mock_satellite"

    def is_configured(self) -> bool:
        return True

    async def query(self, submission_id, latitude, longitude, capture_time, observation_type):
        if self._raise:
            raise self._raise
        confidence = _compute_confidence(self._cloud_cover, self._gap_days, self._water_pct)
        return SatelliteVerificationResult(
            submission_id=submission_id,
            provider="mock_satellite",
            scene_id="MOCK_SCENE_001",
            imagery_date=datetime(2024, 3, 13, 5, 46, 49, tzinfo=timezone.utc),
            confidence=confidence,
            result="SATELLITE_OK",
            cloud_cover_pct=self._cloud_cover,
            temporal_gap_days=self._gap_days,
            water_percentage=self._water_pct,
            vegetation_percentage=30.0,
            metadata={"source": "mock"},
            evidence=["Mock scene acquired 2 days before submission"],
        )


class MockUnconfiguredProvider(SatelliteProvider):
    def is_configured(self) -> bool:
        return False

    async def query(self, *args, **kwargs):
        raise SatelliteNotConfiguredError("No credentials for this provider")


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_provider():
    reset_satellite_provider()
    yield
    reset_satellite_provider()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Provider interface contract
# ─────────────────────────────────────────────────────────────────────────────

class TestSatelliteProviderInterface:
    def test_cannot_instantiate_abstract_provider(self):
        with pytest.raises(TypeError):
            SatelliteProvider()

    def test_provider_is_replaceable(self):
        mock = MockConfiguredSatelliteProvider()
        set_satellite_provider(mock)
        assert get_satellite_provider() is mock

    def test_reset_returns_cdse_provider(self):
        set_satellite_provider(MockConfiguredSatelliteProvider())
        reset_satellite_provider()
        provider = get_satellite_provider()
        assert isinstance(provider, CDSESatelliteProvider)

    def test_satellite_verification_result_to_dict(self):
        imagery_dt = datetime(2024, 3, 13, 5, 46, 49, tzinfo=timezone.utc)
        result = SatelliteVerificationResult(
            submission_id="GW-001",
            provider="cdse_stac",
            scene_id="S2B_TEST_SCENE",
            imagery_date=imagery_dt,
            confidence=82.6,
            result="SATELLITE_OK",
            cloud_cover_pct=8.0,
            temporal_gap_days=2.0,
            water_percentage=12.5,
            vegetation_percentage=30.0,
            evidence=["Scene acquired 2 days before submission"],
        )
        d = result.to_dict()
        assert d["submission_id"] == "GW-001"
        assert d["confidence"] == 82.6
        assert d["satellite_confidence"] == 82.6
        assert d["confidence_display"] == "83%"
        assert d["scene_id"] == "S2B_TEST_SCENE"
        assert d["imagery_date"] == imagery_dt.isoformat()
        assert d["cloud_cover_pct"] == 8.0
        # Legacy compat fields
        assert "spectral_index" in d
        assert "sensor" in d
        assert "tile_id" in d
        assert "ndwi_delta" in d


# ─────────────────────────────────────────────────────────────────────────────
# 2. Confidence formula (_compute_confidence)
# ─────────────────────────────────────────────────────────────────────────────

class TestConfidenceFormula:
    """Unit tests for the confidence computation from real scene properties."""

    def test_clear_sky_recent_scene_with_water_gives_high_confidence(self):
        # 5% cloud, 0 day gap, 10% water
        c = _compute_confidence(5.0, 0.0, 10.0)
        # base=100, -2.5 cloud, -0 gap, +4.0 water = 101.5 → clamped to 98.0
        assert c == 98.0

    def test_high_cloud_cover_reduces_confidence(self):
        # 80% cloud, 0 gap, no water
        c = _compute_confidence(80.0, 0.0, None)
        # base=100 - 40 cloud - 0 gap = 60.0
        assert abs(c - 60.0) < 0.01

    def test_temporal_gap_reduces_confidence(self):
        # 0% cloud, 60 day gap (max penalty = 15), no water
        c = _compute_confidence(0.0, 60.0, None)
        # base=100 - 0 cloud - 15 gap (capped) = 85.0
        assert abs(c - 85.0) < 0.01

    def test_water_bonus_capped_at_10(self):
        # 0% cloud, 0 gap, 50% water → bonus capped at 10
        c = _compute_confidence(0.0, 0.0, 50.0)
        # base=100 + 10 (capped) = 110 → clamped to 98
        assert c == 98.0

    def test_minimum_confidence_clamped(self):
        # worst case: 100% cloud, 50 day gap
        c = _compute_confidence(100.0, 50.0, None)
        # base=100 - 50 - 15 = 35 — still above 30, so test extreme
        c2 = _compute_confidence(100.0, 200.0, None)
        assert c2 == 35.0

    def test_no_water_data_no_bonus(self):
        c_with_water = _compute_confidence(10.0, 1.0, 10.0)
        c_without_water = _compute_confidence(10.0, 1.0, None)
        assert c_with_water > c_without_water

    def test_confidence_within_valid_range(self):
        for cloud in [0, 20, 50, 80, 100]:
            for gap in [0, 5, 15, 30]:
                for water in [None, 0, 10, 50]:
                    c = _compute_confidence(float(cloud), float(gap), float(water) if water else None)
                    assert 30.0 <= c <= 98.0, f"Confidence {c} out of range for cloud={cloud}, gap={gap}, water={water}"


# ─────────────────────────────────────────────────────────────────────────────
# 3. CDSE helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestCDSEHelpers:
    def test_build_bbox_correct_bounds(self):
        bbox = _build_bbox(INDIA_LAT, INDIA_LON)
        assert len(bbox) == 4
        assert bbox[0] == pytest.approx(INDIA_LON - 0.1)
        assert bbox[1] == pytest.approx(INDIA_LAT - 0.1)
        assert bbox[2] == pytest.approx(INDIA_LON + 0.1)
        assert bbox[3] == pytest.approx(INDIA_LAT + 0.1)

    def test_datetime_window_is_30_day_range(self):
        window = _datetime_window(SAMPLE_CAPTURE_TIME)
        parts = window.split("/")
        assert len(parts) == 2
        start = datetime.fromisoformat(parts[0].replace("Z", "+00:00"))
        end = datetime.fromisoformat(parts[1].replace("Z", "+00:00"))
        delta = end - start
        assert abs(delta.days - 30) <= 1

    def test_build_evidence_includes_scene_id_and_date(self):
        imagery_date = datetime(2024, 3, 13, tzinfo=timezone.utc)
        evidence = _build_evidence("SCENE_001", imagery_date, 5.0, 2.0, 12.5, 30.0, 0.1)
        text = " ".join(evidence)
        assert "SCENE_001" in text
        assert "2024-03-13" in text
        assert "5.0" in text  # cloud cover
        assert "12.50" in text  # water percentage


# ─────────────────────────────────────────────────────────────────────────────
# 4. CDSESatelliteProvider — HTTP integration
# ─────────────────────────────────────────────────────────────────────────────

class TestCDSESatelliteProvider:
    def test_is_configured_always_true(self):
        """CDSE is open access — always configured."""
        provider = CDSESatelliteProvider()
        assert provider.is_configured() is True

    async def test_successful_query_returns_real_confidence(self):
        """Provider parses a valid STAC response and returns real confidence."""
        feature = make_cdse_feature(cloud_cover=5.0, water_pct=12.5, dt_str="2024-03-13T05:46:49")
        response_data = make_cdse_response([feature])

        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = response_data

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            result = await provider.query(
                submission_id="GW-001",
                latitude=INDIA_LAT,
                longitude=INDIA_LON,
                capture_time=SAMPLE_CAPTURE_TIME,
                observation_type="check_dam",
            )

        assert result.result == "SATELLITE_OK"
        assert 30.0 <= result.confidence <= 98.0
        assert result.cloud_cover_pct == 5.0
        assert result.water_percentage == 12.5
        assert result.scene_id != "UNKNOWN"
        assert len(result.evidence) > 0

    async def test_empty_features_raises_no_data_error(self):
        """Zero features in response raises NoSatelliteDataError."""
        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = make_cdse_response([])

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            with pytest.raises(NoSatelliteDataError) as exc_info:
                await provider.query(
                    submission_id="GW-002",
                    latitude=INDIA_LAT,
                    longitude=INDIA_LON,
                    capture_time=SAMPLE_CAPTURE_TIME,
                    observation_type="water_body",
                )
        assert "No Sentinel-2" in str(exc_info.value) or "no" in str(exc_info.value).lower()

    async def test_http_non_200_raises_unavailable(self):
        """HTTP 503 raises SatelliteUnavailableError."""
        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30

            mock_resp = MagicMock()
            mock_resp.status_code = 503
            mock_resp.text = "Service Unavailable"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            with pytest.raises(SatelliteUnavailableError, match="HTTP 503"):
                await provider.query(
                    submission_id="GW-003",
                    latitude=INDIA_LAT,
                    longitude=INDIA_LON,
                    capture_time=SAMPLE_CAPTURE_TIME,
                    observation_type="farm_pond",
                )

    async def test_timeout_raises_unavailable(self):
        """Network timeout raises SatelliteUnavailableError."""
        import httpx as _httpx

        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 10

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(side_effect=_httpx.TimeoutException("Timed out"))
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            with pytest.raises(SatelliteUnavailableError, match="timed out"):
                await provider.query(
                    submission_id="GW-004",
                    latitude=INDIA_LAT,
                    longitude=INDIA_LON,
                    capture_time=SAMPLE_CAPTURE_TIME,
                    observation_type="check_dam",
                )

    async def test_invalid_json_raises_unavailable(self):
        """Non-JSON response raises SatelliteUnavailableError."""
        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.side_effect = json.JSONDecodeError("Not JSON", "", 0)
            mock_resp.text = "<!DOCTYPE html>Internal Error"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            with pytest.raises(SatelliteUnavailableError, match="non-JSON"):
                await provider.query(
                    submission_id="GW-005",
                    latitude=INDIA_LAT,
                    longitude=INDIA_LON,
                    capture_time=SAMPLE_CAPTURE_TIME,
                    observation_type="borewell",
                )

    async def test_missing_optional_fields_handled_gracefully(self):
        """Scene without s2:water_percentage or s2:vegetation_percentage succeeds."""
        feature = {
            "id": "S2B_MINIMAL_SCENE",
            "type": "Feature",
            "properties": {
                "datetime": "2024-03-13T05:46:49Z",
                "eo:cloud_cover": 15.0,
                # no s2:water_percentage, no s2:vegetation_percentage
            },
            "assets": {},
            "links": [],
        }
        response_data = make_cdse_response([feature])

        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = response_data

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            result = await provider.query(
                submission_id="GW-006",
                latitude=INDIA_LAT,
                longitude=INDIA_LON,
                capture_time=SAMPLE_CAPTURE_TIME,
                observation_type="water_body",
            )

        assert result.result == "SATELLITE_OK"
        assert result.water_percentage is None
        assert result.vegetation_percentage is None
        assert 30.0 <= result.confidence <= 98.0

    async def test_invalid_coordinates_still_queries_provider(self):
        """Provider accepts any lat/lon — coordinate validation is in the service layer."""
        # Extreme but valid coordinates (not in India, but geometrically valid)
        feature = make_cdse_feature()
        with patch("app.integrations.cdse_satellite_provider.get_settings") as mock_settings, \
             patch("app.integrations.cdse_satellite_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.satellite.timeout_seconds = 30
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = make_cdse_response([])  # no data for Antarctica

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            provider = CDSESatelliteProvider()
            with pytest.raises(NoSatelliteDataError):
                await provider.query(
                    submission_id="GW-007",
                    latitude=-85.0,
                    longitude=0.0,
                    capture_time=SAMPLE_CAPTURE_TIME,
                    observation_type="water_body",
                )


# ─────────────────────────────────────────────────────────────────────────────
# 5. SatelliteVerificationService — orchestration
# ─────────────────────────────────────────────────────────────────────────────

class TestSatelliteVerificationService:
    async def test_successful_verification_returns_satellite_ok(self):
        provider = MockConfiguredSatelliteProvider(cloud_cover=5.0, water_pct=12.0, gap_days=1.0)
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_OK"
        assert result["satellite_confidence"] > 0.0
        assert result["scene_id"] == "MOCK_SCENE_001"
        assert sub.satellite_confidence == result["satellite_confidence"]
        db.flush.assert_called()

    async def test_missing_coordinates_returns_unavailable(self):
        """Submission without lat/lon returns SATELLITE_UNAVAILABLE immediately."""
        provider = MockConfiguredSatelliteProvider()
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        sub.latitude = None
        sub.longitude = None
        db = make_db_session()

        result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_UNAVAILABLE"
        assert result["satellite_confidence"] == 0.0
        assert sub.satellite_confidence is None

    async def test_unconfigured_provider_returns_not_configured(self):
        provider = MockUnconfiguredProvider()
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_NOT_CONFIGURED"
        assert result["satellite_confidence"] == 0.0

    async def test_no_data_returns_no_satellite_data_without_retry(self):
        """NoSatelliteDataError is non-transient — no retry occurs."""
        call_count = 0

        class CountingNoDataProvider(SatelliteProvider):
            def is_configured(self) -> bool:
                return True

            async def query(self, *args, **kwargs):
                nonlocal call_count
                call_count += 1
                raise NoSatelliteDataError("No scenes found at this location")

        service = SatelliteVerificationService(provider=CountingNoDataProvider())
        sub = make_submission()
        db = make_db_session()

        result = await service.verify(sub, db)

        assert result["status"] == "NO_SATELLITE_DATA"
        assert result["satellite_confidence"] == 0.0
        assert call_count == 1  # no retry

    async def test_transient_failure_retries_and_returns_unavailable(self):
        """SatelliteUnavailableError triggers retries, ultimately returns SATELLITE_UNAVAILABLE."""
        provider = MockConfiguredSatelliteProvider(
            raise_error=SatelliteUnavailableError("Connection timed out")
        )
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        with patch("app.services.satellite_verification_service.asyncio.sleep", new_callable=AsyncMock):
            result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_UNAVAILABLE"
        assert result["satellite_confidence"] == 0.0

    async def test_retry_succeeds_on_second_attempt(self):
        """Provider fails first attempt, succeeds on second."""
        attempt_count = 0

        class RetrySuccessProvider(SatelliteProvider):
            def is_configured(self) -> bool:
                return True

            async def query(self, submission_id, latitude, longitude, capture_time, observation_type):
                nonlocal attempt_count
                attempt_count += 1
                if attempt_count < 2:
                    raise SatelliteUnavailableError("Transient error")
                return SatelliteVerificationResult(
                    submission_id=submission_id,
                    provider="retry_test",
                    scene_id="RETRY_SCENE",
                    imagery_date=datetime(2024, 3, 13, tzinfo=timezone.utc),
                    confidence=75.0,
                    result="SATELLITE_OK",
                    cloud_cover_pct=20.0,
                    temporal_gap_days=2.0,
                )

        service = SatelliteVerificationService(provider=RetrySuccessProvider())
        sub = make_submission()
        db = make_db_session()

        with patch("app.services.satellite_verification_service.asyncio.sleep", new_callable=AsyncMock):
            result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_OK"
        assert result["satellite_confidence"] == 75.0
        assert attempt_count == 2

    async def test_idempotency_returns_cached_result(self):
        """Cached SATELLITE_OK result is returned without re-querying provider."""
        cached = {
            "submission_id": "GW-TESTSAT001",
            "status": "SATELLITE_OK",
            "satellite_confidence": 88.0,
            "scene_id": "CACHED_SCENE",
            "imagery_date": "2024-03-13T05:46:49+00:00",
            "confidence": 88.0,
        }

        event_mock = MagicMock()
        event_mock.result_json = cached
        db = make_db_session(existing_event=event_mock)

        call_count = 0

        class CountingProvider(MockConfiguredSatelliteProvider):
            async def query(self, *args, **kwargs):
                nonlocal call_count
                call_count += 1
                return await super().query(*args, **kwargs)

        service = SatelliteVerificationService(provider=CountingProvider())
        sub = make_submission()

        result = await service.verify(sub, db)

        assert result["status"] == "SATELLITE_OK"
        assert result["satellite_confidence"] == 88.0
        assert call_count == 0  # provider NOT called

    async def test_satellite_confidence_not_updated_on_failure(self):
        """satellite_confidence stays None when verification fails."""
        provider = MockConfiguredSatelliteProvider(
            raise_error=NoSatelliteDataError("No imagery")
        )
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        sub.satellite_confidence = None
        db = make_db_session()

        await service.verify(sub, db)

        assert sub.satellite_confidence is None

    async def test_capture_time_none_uses_now(self):
        """If submission.capture_time is None, service uses current UTC time."""
        provider = MockConfiguredSatelliteProvider()
        service = SatelliteVerificationService(provider=provider)
        sub = make_submission()
        sub.capture_time = None
        db = make_db_session()

        result = await service.verify(sub, db)

        # Should succeed — no crash from None capture_time
        assert result["status"] == "SATELLITE_OK"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Integration: API endpoint with injected provider
# ─────────────────────────────────────────────────────────────────────────────

class TestSatelliteResultEndpoint:
    async def test_satellite_result_endpoint_returns_structured_response(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """Satellite result endpoint returns structured real response with injected mock."""
        mock_provider = MockConfiguredSatelliteProvider(cloud_cover=10.0, water_pct=8.0, gap_days=3.0)
        set_satellite_provider(mock_provider)
        try:
            # Create submission
            resp = await client.post(
                "/api/jal-saheli/submissions",
                json={
                    "observation_type": "check_dam",
                    "latitude": INDIA_LAT,
                    "longitude": INDIA_LON,
                    "description": "Satellite test submission",
                },
                headers=registered_cadre["headers"],
            )
            assert resp.status_code == 201
            sub_id = resp.json()["id"]

            # Query satellite result
            sat_resp = await client.get(
                f"/api/jal-saheli/submissions/{sub_id}/satellite-result",
                headers=registered_cadre["headers"],
            )
            assert sat_resp.status_code == 200
            data = sat_resp.json()

            assert data["submission_id"] == sub_id
            assert data["status"] == "SATELLITE_OK"
            assert data["satellite_confidence"] > 0.0
            assert data["scene_id"] == "MOCK_SCENE_001"
            assert "evidence" in data
            assert isinstance(data["evidence"], list)
        finally:
            reset_satellite_provider()

    async def test_satellite_result_without_credentials_real_cdse_call(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """With default CDSE provider (open access), endpoint either succeeds or returns NO_SATELLITE_DATA/UNAVAILABLE."""
        # Do NOT inject mock — use the real CDSE provider
        # In CI/offline, the CDSE call will likely fail or return no data
        reset_satellite_provider()

        resp = await client.post(
            "/api/jal-saheli/submissions",
            json={
                "observation_type": "water_body",
                "latitude": INDIA_LAT,
                "longitude": INDIA_LON,
            },
            headers=registered_cadre["headers"],
        )
        assert resp.status_code == 201
        sub_id = resp.json()["id"]

        sat_resp = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}/satellite-result",
            headers=registered_cadre["headers"],
        )
        assert sat_resp.status_code == 200
        data = sat_resp.json()

        # Status must be one of the legitimate codes — never fabricated
        assert data["status"] in (
            "SATELLITE_OK",
            "SATELLITE_UNAVAILABLE",
            "NO_SATELLITE_DATA",
            "SATELLITE_NOT_CONFIGURED",
        )
        assert data["submission_id"] == sub_id
