"""Geo AI unified-backend contract tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_geo_ai_health(client: AsyncClient) -> None:
    response = await client.get("/api/geo-ai/health")
    assert response.status_code == 200
    body = response.json()
    assert body["model_loaded"] is True
    assert body["lookup_loaded"] is True
    assert isinstance(body["bhuvan"], dict)
    assert body["bhuvan"]["enabled"] is False
    assert isinstance(body["bhuvan_lulc"], dict)
    assert body["bhuvan_lulc"]["enabled"] is False
    assert body["bhuvan"]["reachable"] is False


@pytest.mark.asyncio
async def test_predict_lulc_known_indices(client: AsyncClient) -> None:
    combined = await client.post(
        "/api/predict-lulc",
        json={"nir": 0.8, "red": 0.2, "green": 0.8, "swir": 0.1},
    )
    assert combined.status_code == 200, combined.text
    body = combined.json()
    assert body["ndvi"] == 0.6
    # GREEN == NIR → NDWI is 0 by (GREEN-NIR)/(GREEN+NIR)
    assert body["ndwi"] == 0.0
    assert body["source"] == "random_forest"
    assert body["confidence"] is not None

    ndwi_case = await client.post(
        "/api/predict-lulc",
        json={"nir": 0.2, "red": 0.3, "green": 0.8, "swir": 0.1},
    )
    assert ndwi_case.status_code == 200
    assert ndwi_case.json()["ndwi"] == 0.6


@pytest.mark.asyncio
async def test_analyze_location_in_scene(client: AsyncClient) -> None:
    response = await client.post(
        "/api/analyze-location",
        json={"latitude": 13.2172, "longitude": 79.1003},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["available"] is True
    assert body["source"] == "real_satellite_grid"
    assert body["prediction"] == "Barren"
    assert body["ndvi_val"] == 0.106
    assert body["ndwi_val"] == 0.0
    assert body["satellite_match"] == "DISCREPANCY"
    assert body["confidence"] is None
    assert body["persisted"] is False


@pytest.mark.asyncio
async def test_analyze_location_invalid_coordinates(client: AsyncClient) -> None:
    bad_lat = await client.post(
        "/api/analyze-location",
        json={"latitude": 99, "longitude": 77},
    )
    assert bad_lat.status_code == 422
    bad_lon = await client.post(
        "/api/analyze-location",
        json={"latitude": 13, "longitude": 200},
    )
    assert bad_lon.status_code == 422


@pytest.mark.asyncio
async def test_analyze_location_outside_scene(client: AsyncClient) -> None:
    response = await client.post(
        "/api/analyze-location",
        json={"latitude": 28.61, "longitude": 77.21},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    if isinstance(detail, dict):
        assert detail["code"] == "OUTSIDE_AVAILABLE_SCENE"
        assert "UNAVAILABLE" in detail["message"]
        assert detail["available"] is False


@pytest.mark.asyncio
async def test_submission_analyze_persists_and_gis(client: AsyncClient) -> None:
    created = await client.post(
        "/api/submissions",
        json={
            "title": "In-scene lookup",
            "location_label": "LISS scene",
            "district": "Chittoor",
            "lat": 13.2172,
            "lng": 79.1003,
            "source": "drishti",
        },
    )
    assert created.status_code == 201, created.text
    sid = created.json()["id"]

    analyzed = await client.post(f"/api/submissions/{sid}/analyze")
    assert analyzed.status_code == 200, analyzed.text
    payload = analyzed.json()
    assert payload["provider"] == "VedGeoAI-RF-Lookup"
    assert payload["lulc"] == "Barren"
    assert payload["ndvi_source"] == "satellite_lookup"
    assert payload["confidence"] is None

    fetched = await client.get(f"/api/submissions/{sid}/analysis")
    assert fetched.status_code == 200
    assert fetched.json()["classification"] == "Barren"

    gis = await client.get("/api/gis/features")
    assert gis.status_code == 200
    match = next(f for f in gis.json()["features"] if f["properties"]["submission_id"] == sid)
    assert match["properties"]["status"] == "flagged"
    assert match["geometry"]["coordinates"] == [79.1003, 13.2172]

    tasks = await client.get("/api/verification/tasks")
    assert tasks.status_code == 200
    task = next((t for t in tasks.json() if t["submission_id"] == sid), None)
    assert task is not None
    assert task["confidence"] is None


@pytest.mark.asyncio
async def test_predict_lulc_without_model(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import app.geoai.engine as engine

    monkeypatch.setattr(engine, "rf_model", None)
    response = await client.post(
        "/api/predict-lulc",
        json={"nir": 0.8, "red": 0.2, "green": 0.8, "swir": 0.1},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_UNAVAILABLE"


@pytest.mark.asyncio
async def test_submission_rejects_invalid_coordinates(client: AsyncClient) -> None:
    response = await client.post(
        "/api/submissions",
        json={
            "title": "bad",
            "location_label": "x",
            "lat": 99,
            "lng": 10,
        },
    )
    assert response.status_code == 422
