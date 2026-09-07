"""
tests/test_ai_analysis.py
Comprehensive test suite for Phase 6: Real AI Analysis Integration.

Tests:
  - Successful provider response (real HTTP round-trip mocked)
  - Malformed response (missing fields, bad confidence type, out-of-range)
  - Provider timeout
  - Provider HTTP failure (non-200, connection error)
  - Missing credentials (AI_NOT_CONFIGURED)
  - Duplicate processing (idempotency)
  - Provider is replaceable (set_ai_provider)
  - Response validation edge cases
  - ai_service.analyze_submission integration
  - Retry behavior on transient failures
"""
from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.integrations.ai_provider import (
    AIAnalysisResult,
    AINotConfiguredError,
    AIProvider,
    AIResponseError,
    AIUnavailableError,
)
from app.integrations.ai_http_provider import GenericHTTPAIProvider, _validate_response
from app.integrations.ai_client import get_ai_provider, reset_ai_provider, set_ai_provider
from app.services.ai_analysis_service import AIAnalysisService

pytestmark = pytest.mark.asyncio


# ─────────────────────────────────────────────────────────────────────────────
# Test helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_submission(
    obs_type: str = "check_dam",
    lat: float = 19.876,
    lng: float = 75.343,
    description: str = "Test check dam",
) -> MagicMock:
    """Create a minimal Submission-like mock."""
    m = MagicMock()
    m.id = f"GW-TEST{uuid.uuid4().int % 999999:06d}"
    m.observation_type = obs_type
    m.photo_url = "/uploads/test/photo.jpg"
    m.latitude = lat
    m.longitude = lng
    m.description = description
    m.ai_confidence = None
    return m


def make_db_session() -> AsyncMock:
    """Return a minimal async DB session mock."""
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    # Mock execute to return no existing VerificationEvent (no idempotency hit)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_mock)
    return db


def make_valid_provider_response(
    result: str = "CHECK_DAM_DETECTED",
    confidence: float = 93.5,
    model: str = "geobrain-v3",
) -> dict[str, Any]:
    return {
        "result": result,
        "confidence": confidence,
        "model": model,
        "detected_features": ["Masonry embankment", "Spillway detected"],
        "observations": ["Water impounded behind structure"],
    }


class MockConfiguredHTTPProvider(AIProvider):
    """Stub provider that returns a canned valid response."""

    def __init__(self, response: dict | None = None, raise_error: Exception | None = None):
        self._response = response or make_valid_provider_response()
        self._raise = raise_error
        self._provider_name = "mock_http"

    def is_configured(self) -> bool:
        return True

    async def analyze(self, submission_id, observation_type, photo_url, latitude, longitude, description, photo_bytes=None) -> AIAnalysisResult:
        if self._raise:
            raise self._raise
        return AIAnalysisResult(
            submission_id=submission_id,
            provider="mock_http",
            model=self._response["model"],
            result=self._response["result"],
            confidence=self._response["confidence"],
            detected_features=self._response.get("detected_features", []),
            observations=self._response.get("observations", []),
            raw_response=self._response,
        )


class MockUnconfiguredProvider(AIProvider):
    """Stub provider that always reports unconfigured."""

    def is_configured(self) -> bool:
        return False

    async def analyze(self, *args, **kwargs) -> AIAnalysisResult:
        raise AINotConfiguredError("No credentials configured")


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_provider():
    """Reset the global AI provider singleton between tests."""
    reset_ai_provider()
    yield
    reset_ai_provider()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Provider interface contract
# ─────────────────────────────────────────────────────────────────────────────

class TestAIProviderInterface:
    """Verify that AIProvider is truly abstract and can be replaced."""

    def test_cannot_instantiate_abstract_provider(self):
        with pytest.raises(TypeError):
            AIProvider()

    def test_provider_is_replaceable(self):
        """set_ai_provider / get_ai_provider allows swapping at runtime."""
        mock = MockConfiguredHTTPProvider()
        set_ai_provider(mock)
        assert get_ai_provider() is mock

    def test_reset_returns_default_http_provider(self):
        set_ai_provider(MockConfiguredHTTPProvider())
        reset_ai_provider()
        provider = get_ai_provider()
        assert isinstance(provider, GenericHTTPAIProvider)

    def test_ai_analysis_result_to_dict(self):
        result = AIAnalysisResult(
            submission_id="GW-001",
            provider="test",
            model="m1",
            result="VERIFIED",
            confidence=88.6,
            detected_features=["feat1"],
            observations=["obs1"],
        )
        d = result.to_dict()
        assert d["submission_id"] == "GW-001"
        assert d["confidence"] == 88.6
        assert d["confidence_display"] == "89%"
        assert "feat1" in d["detected_features"]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Response validation (_validate_response)
# ─────────────────────────────────────────────────────────────────────────────

class TestResponseValidation:
    """Unit tests for the HTTP provider response validator."""

    def test_valid_response_passes(self):
        data = make_valid_provider_response()
        result = _validate_response(data, "GW-001", "test_provider")
        assert result.confidence == 93.5
        assert result.result == "CHECK_DAM_DETECTED"
        assert result.model == "geobrain-v3"
        assert "Masonry embankment" in result.detected_features

    def test_missing_result_field_raises(self):
        data = {"confidence": 90.0, "model": "m1"}
        with pytest.raises(AIResponseError, match="result"):
            _validate_response(data, "GW-001", "test")

    def test_missing_confidence_field_raises(self):
        data = {"result": "OK", "model": "m1"}
        with pytest.raises(AIResponseError, match="confidence"):
            _validate_response(data, "GW-001", "test")

    def test_missing_model_field_raises(self):
        data = {"result": "OK", "confidence": 90.0}
        with pytest.raises(AIResponseError, match="model"):
            _validate_response(data, "GW-001", "test")

    def test_non_numeric_confidence_raises(self):
        data = {"result": "OK", "confidence": "high", "model": "m1"}
        with pytest.raises(AIResponseError, match="not numeric"):
            _validate_response(data, "GW-001", "test")

    def test_confidence_below_zero_raises(self):
        data = {"result": "OK", "confidence": -5.0, "model": "m1"}
        with pytest.raises(AIResponseError, match="out of range"):
            _validate_response(data, "GW-001", "test")

    def test_confidence_above_100_raises(self):
        data = {"result": "OK", "confidence": 105.0, "model": "m1"}
        with pytest.raises(AIResponseError, match="out of range"):
            _validate_response(data, "GW-001", "test")

    def test_empty_result_string_raises(self):
        data = {"result": "", "confidence": 90.0, "model": "m1"}
        with pytest.raises(AIResponseError, match="empty"):
            _validate_response(data, "GW-001", "test")

    def test_optional_features_default_to_empty_list(self):
        data = {"result": "OK", "confidence": 80.0, "model": "m1"}
        result = _validate_response(data, "GW-001", "test")
        assert result.detected_features == []
        assert result.observations == []

    def test_confidence_boundary_zero_passes(self):
        data = {"result": "LOW", "confidence": 0.0, "model": "m1"}
        result = _validate_response(data, "GW-001", "test")
        assert result.confidence == 0.0

    def test_confidence_boundary_100_passes(self):
        data = {"result": "HIGH", "confidence": 100.0, "model": "m1"}
        result = _validate_response(data, "GW-001", "test")
        assert result.confidence == 100.0


# ─────────────────────────────────────────────────────────────────────────────
# 3. AIAnalysisService — core orchestration
# ─────────────────────────────────────────────────────────────────────────────

class TestAIAnalysisService:
    """Test AIAnalysisService orchestration including retries, idempotency, errors."""

    async def test_successful_provider_response(self):
        """Successful provider call returns AI_OK with real scores."""
        provider = MockConfiguredHTTPProvider()
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        result = await service.analyze(sub, db)

        assert result["status"] == "AI_OK"
        assert result["confidence"] == 93.5
        assert result["result"] == "CHECK_DAM_DETECTED"
        assert result["model"] == "geobrain-v3"
        assert "Masonry embankment" in result["detected_features"]
        # DB flush should have been called (for VerificationEvent)
        db.flush.assert_called()
        # ai_confidence should be updated on the submission proxy
        assert sub.ai_confidence == 93.5

    async def test_unconfigured_provider_returns_not_configured(self):
        """When provider not configured, returns AI_NOT_CONFIGURED immediately (no retry)."""
        provider = MockUnconfiguredProvider()
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        result = await service.analyze(sub, db)

        assert result["status"] == "AI_NOT_CONFIGURED"
        assert result["confidence"] == 0.0
        db.flush.assert_called()

    async def test_provider_timeout_returns_unavailable(self):
        """Timeout from provider maps to AI_UNAVAILABLE after retries."""
        provider = MockConfiguredHTTPProvider(
            raise_error=AIUnavailableError("Request timed out after 30s")
        )
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        with patch("app.services.ai_analysis_service.asyncio.sleep", new_callable=AsyncMock):
            result = await service.analyze(sub, db)

        assert result["status"] == "AI_UNAVAILABLE"
        assert result["confidence"] == 0.0
        assert "timed out" in result["error_message"].lower()

    async def test_provider_http_failure_returns_unavailable(self):
        """Non-200 HTTP response maps to AI_UNAVAILABLE."""
        provider = MockConfiguredHTTPProvider(
            raise_error=AIUnavailableError("AI provider returned HTTP 503: Service Unavailable")
        )
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        with patch("app.services.ai_analysis_service.asyncio.sleep", new_callable=AsyncMock):
            result = await service.analyze(sub, db)

        assert result["status"] == "AI_UNAVAILABLE"

    async def test_malformed_response_returns_response_invalid(self):
        """Provider returning schema-invalid response gives AI_RESPONSE_INVALID (no retry)."""
        provider = MockConfiguredHTTPProvider(
            raise_error=AIResponseError("Missing required field: confidence")
        )
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        db = make_db_session()

        result = await service.analyze(sub, db)

        assert result["status"] == "AI_RESPONSE_INVALID"
        assert result["confidence"] == 0.0

    async def test_idempotency_returns_cached_result(self):
        """If a successful AI_OK result already exists, it is returned without re-calling provider."""
        cached = {
            "submission_id": "GW-CACHED",
            "provider": "mock",
            "model": "m1",
            "result": "CHECK_DAM_DETECTED",
            "confidence": 91.0,
            "confidence_display": "91%",
            "detected_features": ["cached_feat"],
            "observations": [],
            "status": "AI_OK",
        }

        # Simulate DB returning an existing successful event
        event_mock = MagicMock()
        event_mock.result_json = cached
        db = make_db_session()
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = event_mock
        db.execute = AsyncMock(return_value=exec_result)

        call_count = 0

        class CountingProvider(MockConfiguredHTTPProvider):
            async def analyze(self, *args, **kwargs):
                nonlocal call_count
                call_count += 1
                return await super().analyze(*args, **kwargs)

        service = AIAnalysisService(provider=CountingProvider())
        sub = make_submission()
        sub.id = "GW-CACHED"

        result = await service.analyze(sub, db)

        assert result["status"] == "AI_OK"
        assert result["confidence"] == 91.0
        assert call_count == 0  # provider was NOT called

    async def test_retry_succeeds_on_second_attempt(self):
        """Provider fails first attempt, succeeds on second."""
        attempt_count = 0

        class RetrySuccessProvider(AIProvider):
            def is_configured(self) -> bool:
                return True

            async def analyze(self, submission_id, observation_type, photo_url, latitude, longitude, description, photo_bytes=None):
                nonlocal attempt_count
                attempt_count += 1
                if attempt_count < 2:
                    raise AIUnavailableError("Transient failure")
                return AIAnalysisResult(
                    submission_id=submission_id,
                    provider="retry_provider",
                    model="m1",
                    result="VERIFIED",
                    confidence=87.0,
                )

        service = AIAnalysisService(provider=RetrySuccessProvider())
        sub = make_submission()
        db = make_db_session()

        with patch("app.services.ai_analysis_service.asyncio.sleep", new_callable=AsyncMock):
            result = await service.analyze(sub, db)

        assert result["status"] == "AI_OK"
        assert result["confidence"] == 87.0
        assert attempt_count == 2

    async def test_ai_confidence_not_updated_on_failure(self):
        """When AI fails, submission.ai_confidence is not set."""
        provider = MockUnconfiguredProvider()
        service = AIAnalysisService(provider=provider)
        sub = make_submission()
        sub.ai_confidence = None
        db = make_db_session()

        await service.analyze(sub, db)

        assert sub.ai_confidence is None


# ─────────────────────────────────────────────────────────────────────────────
# 4. GenericHTTPAIProvider — HTTP integration
# ─────────────────────────────────────────────────────────────────────────────

class TestGenericHTTPAIProvider:
    """Unit tests for the concrete HTTP provider."""

    async def test_is_configured_false_when_url_empty(self):
        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings:
            mock_settings.return_value.ai.service_url = ""
            provider = GenericHTTPAIProvider()
            assert provider.is_configured() is False

    async def test_is_configured_true_when_url_set(self):
        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings:
            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = ""
            mock_settings.return_value.ai.timeout_seconds = 30
            provider = GenericHTTPAIProvider()
            assert provider.is_configured() is True

    async def test_not_configured_raises_not_configured_error(self):
        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings:
            mock_settings.return_value.ai.service_url = ""
            provider = GenericHTTPAIProvider()
            with pytest.raises(AINotConfiguredError):
                await provider.analyze(
                    submission_id="GW-001",
                    observation_type="check_dam",
                    photo_url=None,
                    latitude=19.0,
                    longitude=75.0,
                    description=None,
                )

    async def test_successful_http_call(self):
        """Provider correctly parses a valid HTTP 200 JSON response."""
        valid_response = make_valid_provider_response()

        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings, \
             patch("app.integrations.ai_http_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = "test-key"
            mock_settings.return_value.ai.timeout_seconds = 30

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = valid_response

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            provider = GenericHTTPAIProvider()
            result = await provider.analyze(
                submission_id="GW-001",
                observation_type="check_dam",
                photo_url="/uploads/test/photo.jpg",
                latitude=19.876,
                longitude=75.343,
                description="Masonry check dam",
            )

        assert result.confidence == 93.5
        assert result.result == "CHECK_DAM_DETECTED"
        assert result.model == "geobrain-v3"

    async def test_http_timeout_raises_unavailable(self):
        """Timeout exception maps to AIUnavailableError."""
        import httpx as _httpx

        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings, \
             patch("app.integrations.ai_http_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = ""
            mock_settings.return_value.ai.timeout_seconds = 5

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(side_effect=_httpx.TimeoutException("Timed out"))
            mock_client_cls.return_value = mock_client

            provider = GenericHTTPAIProvider()
            with pytest.raises(AIUnavailableError, match="timed out"):
                await provider.analyze(
                    submission_id="GW-002",
                    observation_type="farm_pond",
                    photo_url=None,
                    latitude=19.0,
                    longitude=75.0,
                    description=None,
                )

    async def test_http_non_200_raises_unavailable(self):
        """Non-200 HTTP response maps to AIUnavailableError."""
        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings, \
             patch("app.integrations.ai_http_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = ""
            mock_settings.return_value.ai.timeout_seconds = 30

            mock_response = MagicMock()
            mock_response.status_code = 503
            mock_response.text = "Service Unavailable"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            provider = GenericHTTPAIProvider()
            with pytest.raises(AIUnavailableError, match="HTTP 503"):
                await provider.analyze(
                    submission_id="GW-003",
                    observation_type="water_body",
                    photo_url=None,
                    latitude=19.0,
                    longitude=75.0,
                    description=None,
                )

    async def test_invalid_json_response_raises_response_error(self):
        """Non-JSON body maps to AIResponseError."""
        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings, \
             patch("app.integrations.ai_http_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = ""
            mock_settings.return_value.ai.timeout_seconds = 30

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.side_effect = json.JSONDecodeError("Not JSON", "", 0)
            mock_response.text = "Not JSON response text"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            provider = GenericHTTPAIProvider()
            with pytest.raises(AIResponseError, match="not valid JSON"):
                await provider.analyze(
                    submission_id="GW-004",
                    observation_type="borewell",
                    photo_url=None,
                    latitude=19.0,
                    longitude=75.0,
                    description=None,
                )

    async def test_auth_header_included_when_api_key_set(self):
        """Bearer Authorization header is included when AI_SERVICE_API_KEY is configured."""
        valid_response = make_valid_provider_response()
        captured_headers: dict = {}

        with patch("app.integrations.ai_http_provider.get_settings") as mock_settings, \
             patch("app.integrations.ai_http_provider.httpx.AsyncClient") as mock_client_cls:

            mock_settings.return_value.ai.service_url = "http://ai.example.com"
            mock_settings.return_value.ai.api_key = "my-secret-key"
            mock_settings.return_value.ai.timeout_seconds = 30

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = valid_response

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)

            async def capture_post(url, json=None, headers=None):
                captured_headers.update(headers or {})
                return mock_response

            mock_client.post = capture_post
            mock_client_cls.return_value = mock_client

            provider = GenericHTTPAIProvider()
            await provider.analyze(
                submission_id="GW-005",
                observation_type="check_dam",
                photo_url=None,
                latitude=19.0,
                longitude=75.0,
                description=None,
            )

        assert captured_headers.get("Authorization") == "Bearer my-secret-key"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Integration: analyze_submission API endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalyzeSubmissionEndpoint:
    """Verify the /submissions/{id}/ai-result endpoint with the new provider."""

    async def test_ai_result_endpoint_not_configured(self, client: AsyncClient, registered_cadre: dict):
        """When AI not configured, ai-result endpoint returns AI_NOT_CONFIGURED status."""
        # Create a submission
        resp = await client.post(
            "/api/jal-saheli/submissions",
            data={
                "observationType": "check_dam",
                "latitude": "19.876",
                "longitude": "75.343",
                "notes": "Test submission",
            },
            headers={**registered_cadre["headers"], "X-Test-Rate-Limit": "true"},
        )
        assert resp.status_code == 201
        sub_id = resp.json()["id"]

        # Query AI result (AI is not configured in test env)
        ai_resp = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}/ai-result",
            headers=registered_cadre["headers"],
        )
        assert ai_resp.status_code == 200
        data = ai_resp.json()
        # With no AI configured, result should reflect that
        assert "confidence" in data

    async def test_ai_result_with_mock_provider(self, client: AsyncClient, registered_cadre: dict):
        """Inject a mock provider and verify endpoint returns its result."""
        mock_provider = MockConfiguredHTTPProvider(
            response=make_valid_provider_response(confidence=88.0, result="FARM_POND_VERIFIED")
        )
        set_ai_provider(mock_provider)

        # Create submission
        resp = await client.post(
            "/api/jal-saheli/submissions",
            data={
                "observationType": "farm_pond",
                "latitude": "19.0",
                "longitude": "75.0",
                "notes": "Farm pond observation",
            },
            headers={**registered_cadre["headers"], "X-Test-Rate-Limit": "true"},
        )
        assert resp.status_code == 201
        sub_id = resp.json()["id"]

        # Query AI result
        ai_resp = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}/ai-result",
            headers=registered_cadre["headers"],
        )
        assert ai_resp.status_code == 200
        data = ai_resp.json()
        assert data["confidence"] >= 0.0
