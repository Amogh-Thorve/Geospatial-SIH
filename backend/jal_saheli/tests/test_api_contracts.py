"""API contract tests for GeoWise endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_api_health(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code in (200, 503)
    body = response.json()
    assert body["status"] in ("healthy", "degraded")


@pytest.mark.asyncio
async def test_create_submission_and_analysis(client: AsyncClient) -> None:
    created = await client.post(
        "/api/submissions",
        json={
            "title": "Farm Pond demo site",
            "location_label": "Anantapur test plot",
            "district": "Anantapur",
            "lat": 14.68,
            "lng": 77.60,
            "classification": "Farm Pond",
            "submitter_name": "Test Officer",
            "source": "drishti",
            "notes": "pytest farm pond",
        },
    )
    assert created.status_code == 201, created.text
    submission_id = created.json()["id"]

    analyzed = await client.post(f"/api/submissions/{submission_id}/analyze")
    assert analyzed.status_code == 200, analyzed.text
    payload = analyzed.json()
    assert payload["provider"] == "MockGeoAIProvider"
    assert payload["submission_id"] == submission_id
    assert "ndvi" in payload
    assert payload["xai"]["method"] == "rule-based-demo"

    fetched = await client.get(f"/api/submissions/{submission_id}/analysis")
    assert fetched.status_code == 200
    assert fetched.json()["classification"]


@pytest.mark.asyncio
async def test_verification_update_and_recommendation(client: AsyncClient) -> None:
    created = await client.post(
        "/api/submissions",
        json={
            "title": "Check Dam Construction — pytest",
            "location_label": "Chittoor test plot",
            "district": "Chittoor",
            "lat": 13.62,
            "lng": 79.41,
            "classification": "Check Dam",
            "submitter_name": "Test Officer",
            "source": "drishti",
            "notes": "check dam pytest",
        },
    )
    assert created.status_code == 201, created.text
    submission_id = created.json()["id"]
    analyzed = await client.post(f"/api/submissions/{submission_id}/analyze")
    assert analyzed.status_code == 200, analyzed.text
    assert analyzed.json()["anomaly"] is True

    tasks = await client.get("/api/verification/tasks")
    assert tasks.status_code == 200
    data = tasks.json()
    match = next((t for t in data if t["submission_id"] == submission_id), None)
    assert match, data
    task_id = match["id"]

    patched = await client.patch(
        f"/api/verification/tasks/{task_id}",
        json={"status": "VERIFIED", "assigned_officer": "Officer Test", "notes": "Field confirmed"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "VERIFIED"

    rec = await client.get(f"/api/recommendations/{submission_id}")
    assert rec.status_code == 200
    body = rec.json()
    assert body["provider"] == "DemoRecommendationEngine"
    assert 0 <= body["suitability"] <= 1

    jal = await client.post(
        "/api/jal-saheli/submissions",
        json={
            "observation_type": "farm_pond",
            "type_label": "Farm Pond",
            "lat": 14.68,
            "lng": 77.60,
            "location_label": "pytest plot",
            "notes": "jal post",
        },
    )
    assert jal.status_code == 201, jal.text
    assert jal.json()["id"].startswith("JS-")
