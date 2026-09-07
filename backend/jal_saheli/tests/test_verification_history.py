"""
tests/test_verification_history.py
Tests for GET /api/jal-saheli/verification-history.
Ensures only terminal submissions (VERIFIED / REJECTED) appear.
"""
from __future__ import annotations

from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.database import get_db_session
from app.models.submission import Submission, SubmissionStatus


class TestVerificationHistoryEndpoint:
    @pytest.mark.asyncio
    async def test_verification_history_initially_empty(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get(
            "/api/jal-saheli/verification-history",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        assert res.json() == []
        assert res.headers.get("X-Total-Count") == "0"

    @pytest.mark.asyncio
    async def test_pending_submission_not_in_verification_history(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # Create a pending submission
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json={"observation_type": "water_body", "latitude": 24.0, "longitude": 73.0},
            headers=registered_cadre["headers"],
        )
        assert create_res.status_code == 201

        # Must not show in verification-history
        res = await client.get(
            "/api/jal-saheli/verification-history",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        assert res.json() == []

    @pytest.mark.asyncio
    async def test_verified_submission_appears_in_verification_history(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # 1. Create a submission
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json={"observation_type": "water_body", "latitude": 24.1, "longitude": 73.1},
            headers=registered_cadre["headers"],
        )
        sub_id = create_res.json()["id"]

        # 2. Simulate pipeline completing verification directly in DB
        from app.db.database import get_session
        async with get_session() as session:
                sub = (await session.execute(select(Submission).where(Submission.id == sub_id))).scalar_one()
                sub.status = SubmissionStatus.VERIFIED
                sub.ai_confidence = 94.0
                sub.satellite_confidence = 97.0
                sub.final_confidence = 96.0
                sub.verified_at = datetime.now(timezone.utc)
                sub.verified_by = "GeoBrain + Sentinel-2"
                await session.commit()

        # 3. Now check verification-history
        res = await client.get(
            "/api/jal-saheli/verification-history",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        found = next((item for item in items if item["submission_id"] == sub_id), None)
        assert found is not None
        assert found["status"] == "verified"
        assert found["ai_confidence"] == 94.0
        assert found["satellite_confidence"] == 97.0
        assert found["final_confidence"] == 96.0
