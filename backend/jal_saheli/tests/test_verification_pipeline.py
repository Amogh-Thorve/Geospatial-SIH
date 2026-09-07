"""
tests/test_verification_pipeline.py
Tests for the full dual-engine verification pipeline:
  GET  /api/jal-saheli/submissions/{id}/ai-result
  GET  /api/jal-saheli/submissions/{id}/satellite-result
  GET  /api/jal-saheli/submissions/{id}/verification
  POST /api/jal-saheli/submissions/{id}/verify
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock

from app.integrations.ai_provider import AIAnalysisResult, AIProvider
from app.integrations.ai_client import reset_ai_provider, set_ai_provider
from app.integrations.satellite_provider import SatelliteProvider, SatelliteVerificationResult
from app.integrations.satellite_client import reset_satellite_provider, set_satellite_provider
from app.integrations.cdse_satellite_provider import _compute_confidence
from datetime import datetime, timezone


class _ConfiguredMockProvider(AIProvider):
    """Mock AI provider that always returns a confident result for tests."""
    def is_configured(self) -> bool:
        return True

    async def analyze(self, submission_id, observation_type, photo_url, latitude, longitude, description, photo_bytes=None) -> AIAnalysisResult:
        return AIAnalysisResult(
            submission_id=submission_id,
            provider="test_mock",
            model="geobrain-v3-test",
            result="WATER_BODY_DETECTED",
            confidence=92.0,
            detected_features=["Surface water boundary", "Reflectance index verified"],
            observations=["Water feature confirmed by mock AI"],
        )


class _ConfiguredMockSatelliteProvider(SatelliteProvider):
    """Mock satellite provider that always returns a confident result for tests."""
    def __init__(self):
        self._provider_name = "mock_satellite_pipeline"

    def is_configured(self) -> bool:
        return True

    async def query(self, submission_id, latitude, longitude, capture_time, observation_type):
        confidence = _compute_confidence(5.0, 1.0, 15.0)  # ~95%+ clamped to 98
        return SatelliteVerificationResult(
            submission_id=submission_id,
            provider="mock_satellite_pipeline",
            scene_id="MOCK_PIPELINE_SCENE_001",
            imagery_date=datetime(2024, 3, 14, 5, 46, 49, tzinfo=timezone.utc),
            confidence=confidence,
            result="SATELLITE_OK",
            cloud_cover_pct=5.0,
            temporal_gap_days=1.0,
            water_percentage=15.0,
            vegetation_percentage=30.0,
            metadata={"source": "mock_pipeline"},
            evidence=["Mock scene acquired 1 day before submission"],
        )


class TestVerificationPipeline:
    @pytest.mark.asyncio
    async def test_ai_result_endpoint(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """AI result endpoint returns real provider result (injected mock provider)."""
        # Inject a configured mock provider so this test has deterministic AI output
        set_ai_provider(_ConfiguredMockProvider())
        try:
            # 1. Create a submission
            sub_res = await client.post(
                "/api/jal-saheli/submissions",
                json={
                    "observation_type": "water_body",
                    "latitude": 24.5854,
                    "longitude": 73.7125,
                    "description": "Village pond inspection",
                },
                headers=registered_cadre["headers"],
            )
            assert sub_res.status_code == 201
            sub_id = sub_res.json()["id"]

            # 2. Query AI result
            ai_res = await client.get(
                f"/api/jal-saheli/submissions/{sub_id}/ai-result",
                headers=registered_cadre["headers"],
            )
            assert ai_res.status_code == 200
            data = ai_res.json()
            assert data["submission_id"] == sub_id
            assert data["status"] == "AI_OK"
            assert data["confidence"] > 80.0
            assert "confidence_display" in data
            assert isinstance(data["detected_features"], list)
            assert len(data["detected_features"]) > 0
            assert data["provider"] == "test_mock"
        finally:
            reset_ai_provider()

    @pytest.mark.asyncio
    async def test_satellite_result_endpoint(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """Satellite result endpoint returns real provider result (injected mock)."""
        set_satellite_provider(_ConfiguredMockSatelliteProvider())
        try:
            # 1. Create a submission
            sub_res = await client.post(
                "/api/jal-saheli/submissions",
                json={
                    "observation_type": "check_dam",
                    "latitude": 23.4567,
                    "longitude": 75.1234,
                },
                headers=registered_cadre["headers"],
            )
            assert sub_res.status_code == 201
            sub_id = sub_res.json()["id"]

            # 2. Query Satellite result
            sat_res = await client.get(
                f"/api/jal-saheli/submissions/{sub_id}/satellite-result",
                headers=registered_cadre["headers"],
            )
            assert sat_res.status_code == 200
            data = sat_res.json()
            assert data["submission_id"] == sub_id
            assert data["status"] == "SATELLITE_OK"
            assert data["satellite_confidence"] > 0.0
            assert "NDWI" in data["spectral_index"]   # legacy compat field
            assert "Sentinel-2" in data["sensor"]      # legacy compat field
            assert "ndwi_delta" in data                # legacy compat field
            assert data["scene_id"] == "MOCK_PIPELINE_SCENE_001"
            assert isinstance(data["evidence"], list)
        finally:
            reset_satellite_provider()

    @pytest.mark.asyncio
    async def test_full_verification_and_incentive_credit(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """Full dual-engine pipeline: inject mock AI & Satellite, verify VERIFIED status."""
        # Inject configured mock providers so both engines contribute real confidence scores
        set_ai_provider(_ConfiguredMockProvider())
        set_satellite_provider(_ConfiguredMockSatelliteProvider())
        try:
            # 1. Create a submission
            sub_res = await client.post(
                "/api/jal-saheli/submissions",
                json={
                    "observation_type": "water_body",
                    "latitude": 24.5854,
                    "longitude": 73.7125,
                },
                headers=registered_cadre["headers"],
            )
            assert sub_res.status_code == 201
            sub_id = sub_res.json()["id"]

            # 2. Trigger verification
            ver_res = await client.post(
                f"/api/jal-saheli/submissions/{sub_id}/verify",
                headers=registered_cadre["headers"],
            )
            assert ver_res.status_code == 200
            ver_data = ver_res.json()
            assert ver_data["submissionId"] == sub_id
            assert ver_data["status"] == "verified"
            assert ver_data["reward"] == 25
            assert ver_data["rewardDisplay"] == "₹25"
            assert ver_data["finalConfidence"] >= 80.0

            # 3. Check submission status in submissions API
            get_sub = await client.get(
                f"/api/jal-saheli/submissions/{sub_id}",
                headers=registered_cadre["headers"],
            )
            assert get_sub.status_code == 200
            sub_record = get_sub.json()
            assert sub_record["status"] == "verified"
            assert sub_record["earnings_credited"] is True
            assert sub_record["verification"]["verified_by"] is not None

            # 4. Check earnings ledger reflects credited reward
            earn_res = await client.get(
                "/api/jal-saheli/earnings",
                headers=registered_cadre["headers"],
            )
            assert earn_res.status_code == 200
            earnings = earn_res.json()
            matching = [e for e in earnings if e["submission_id"] == sub_id]
            assert len(matching) == 1
            assert matching[0]["amount"] == 25
            assert matching[0]["status"] == "credited"

            # 5. Check profile statistics update live from database
            prof_res = await client.get(
                "/api/jal-saheli/profile",
                headers=registered_cadre["headers"],
            )
            assert prof_res.status_code == 200
            stats = prof_res.json()["stats"]
            assert stats["verified_count"] >= 1
            assert stats["total_earnings_raw"] >= 25
            assert stats["accuracy_rate"] is not None
        finally:
            reset_ai_provider()
            reset_satellite_provider()
