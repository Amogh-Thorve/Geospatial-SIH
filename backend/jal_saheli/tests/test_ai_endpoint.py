"""
tests/test_ai_endpoint.py
Tests for the GeoBrain Vision inference endpoint (/predict).
"""
import pytest
from httpx import AsyncClient

from app.main import app

pytestmark = pytest.mark.asyncio


async def test_ai_predict_check_dam(client: AsyncClient):
    payload = {
        "submission_id": "GW-990001",
        "observation_type": "check_dam",
        "photo_url": "/uploads/test.jpg",
        "latitude": 19.876,
        "longitude": 75.343,
        "description": "Masonry check dam with good water storage",
    }
    resp = await client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "CHECK_DAM_DETECTED"
    assert data["confidence"] > 90.0
    assert data["model"] == "geobrain-vision-v3"
    assert "masonry_structure" in data["detected_features"]
    assert len(data["observations"]) > 0


async def test_ai_predict_farm_pond(client: AsyncClient):
    payload = {
        "submission_id": "GW-990002",
        "observation_type": "farm_pond",
        "latitude": 18.520,
        "longitude": 73.856,
    }
    resp = await client.post("/api/jal-saheli/ai/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "FARM_POND_DETECTED"
    assert data["confidence"] > 90.0
    assert "earthen_embankment" in data["detected_features"]


async def test_ai_predict_unknown_type(client: AsyncClient):
    payload = {
        "submission_id": "GW-990003",
        "observation_type": "custom_pond",
    }
    resp = await client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "WATER_STRUCTURE_DETECTED" in data["result"]
    assert data["confidence"] > 80.0
