"""
tests/test_submissions.py
Tests for ground observation submissions:
  GET  /api/jal-saheli/submissions
  POST /api/jal-saheli/submissions
  GET  /api/jal-saheli/submissions/{id}
  GET  /api/jal-saheli/submissions/{id}/status
"""
from __future__ import annotations

import io
import pytest
from httpx import AsyncClient


class TestSubmissionsEndpoint:
    @pytest.mark.asyncio
    async def test_list_submissions_initially_empty(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        assert res.json() == []
        assert res.headers.get("X-Total-Count") == "0"

    @pytest.mark.asyncio
    async def test_create_submission_json(
        self, client: AsyncClient, registered_cadre: dict
    ):
        payload = {
            "observation_type": "water_body",
            "latitude": 24.5854,
            "longitude": 73.7125,
            "location_label": "Village Pond East",
            "description": "Clean water observed after rains",
            "capture_time": "2026-09-07T08:30:00Z",
        }
        res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 201
        data = res.json()
        assert data["id"].startswith("GW-")
        assert data["status"] == "pending"
        assert data["observation_type"] == "water_body"
        assert data["latitude"] == 24.5854
        assert data["longitude"] == 73.7125
        assert data["reward_amount"] == 25
        assert data["description"] == "Clean water observed after rains"
        assert data["earnings_credited"] is False

    @pytest.mark.asyncio
    async def test_create_submission_multipart_with_photo(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # 1x1 dummy PNG bytes
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {
            "photo": ("pond.png", io.BytesIO(png_bytes), "image/png"),
        }
        data = {
            "observation_type": "check_dam",
            "latitude": "23.4567",
            "longitude": "75.1234",
            "description": "Masonry check dam with good storage",
        }
        res = await client.post(
            "/api/jal-saheli/submissions",
            data=data,
            files=files,
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 201
        res_data = res.json()
        assert res_data["id"].startswith("GW-")
        assert res_data["observation_type"] == "check_dam"
        assert res_data["photo_url"] is not None
        assert res_data["type_label"] == "Check Dam"

    @pytest.mark.asyncio
    async def test_create_submission_invalid_type_fails(
        self, client: AsyncClient, registered_cadre: dict
    ):
        payload = {"observation_type": "invalid_unknown_type", "latitude": 20.0, "longitude": 70.0}
        res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 400
        assert "Invalid observation type" in res.json()["detail"]["message"]

    @pytest.mark.asyncio
    async def test_create_submission_invalid_coordinates_fails(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # Latitude > 90
        payload = {"observation_type": "water_body", "latitude": 95.0, "longitude": 70.0}
        res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_get_submission_by_id(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # Create a submission first
        payload = {"observation_type": "borewell", "latitude": 21.0, "longitude": 72.0}
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        sub_id = create_res.json()["id"]

        # Fetch it
        res = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == sub_id
        assert data["observation_type"] == "borewell"

    @pytest.mark.asyncio
    async def test_get_submission_by_id_not_found(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get(
            "/api/jal-saheli/submissions/GW-NONEXISTENT",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_get_submission_status(
        self, client: AsyncClient, registered_cadre: dict
    ):
        payload = {"observation_type": "water_quality", "latitude": 22.0, "longitude": 71.0}
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        sub_id = create_res.json()["id"]

        res = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}/status",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == sub_id
        assert data["status"] == "pending"
        assert "ai_confidence" in data
        assert "satellite_confidence" in data
        assert "final_confidence" in data

    @pytest.mark.asyncio
    async def test_submissions_cadre_isolation(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # Create submission as cadre A
        payload = {"observation_type": "farm_pond", "latitude": 20.0, "longitude": 70.0}
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json=payload,
            headers=registered_cadre["headers"],
        )
        sub_id = create_res.json()["id"]

        # Register cadre B with unique phone
        import uuid
        phone_b = f"+9193{uuid.uuid4().int % 100000000:08d}"
        reg_b = await client.post(
            "/api/jal-saheli/auth/register",
            json={"name": "Cadre B", "phone": phone_b},
        )
        assert reg_b.status_code == 201
        headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

        # Cadre B should NOT see Cadre A's submission
        res_b = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}",
            headers=headers_b,
        )
        assert res_b.status_code == 404
