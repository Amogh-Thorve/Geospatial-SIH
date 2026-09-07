"""Geo AI HTTP routes: predict-lulc, analyze-location, geo-ai health."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.geoai.engine import (
    SatelliteUnavailableError,
    geoai_status,
    lookup_location,
    predict_lulc_from_bands,
)
from app.services.workflow import analyze_submission, get_submission

router = APIRouter()


class PixelRequest(BaseModel):
    green: float
    red: float
    nir: float
    swir: float


class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    submission_id: str | None = None


def _unavailable_http(exc: SatelliteUnavailableError) -> HTTPException:
    status_code = 503 if exc.code in {"MODEL_UNAVAILABLE", "LOOKUP_UNAVAILABLE"} else 422
    return HTTPException(
        status_code=status_code,
        detail={
            "code": exc.code,
            "message": exc.message,
            "available": False,
            **exc.extra,
        },
    )


@router.get("/geo-ai/health")
def geo_ai_health() -> dict:
    payload = geoai_status()
    payload["service"] = "GeoWise Geo AI"
    return payload


@router.post("/predict-lulc")
def predict_lulc(data: PixelRequest) -> dict:
    try:
        return predict_lulc_from_bands(data.green, data.red, data.nir, data.swir)
    except SatelliteUnavailableError as exc:
        raise _unavailable_http(exc) from exc


@router.post("/analyze-location")
async def analyze_location(
    loc: LocationRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        result = lookup_location(loc.latitude, loc.longitude)
    except SatelliteUnavailableError as exc:
        raise _unavailable_http(exc) from exc

    if loc.submission_id:
        row = await get_submission(db, loc.submission_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Submission not found")
        if abs(row.lat - loc.latitude) > 1e-6 or abs(row.lng - loc.longitude) > 1e-6:
            raise HTTPException(
                status_code=422,
                detail="submission_id coordinates do not match latitude/longitude",
            )
        await analyze_submission(db, row)
        result["submission_id"] = loc.submission_id
        result["persisted"] = True
    else:
        result["persisted"] = False
    return result
