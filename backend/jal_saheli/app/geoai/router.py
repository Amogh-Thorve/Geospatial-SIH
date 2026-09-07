"""Geo AI HTTP routes: predict-lulc, analyze-location, geo-ai health."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import get_geo_ai_provider
from app.db.database import get_db_session
from app.geoai.engine import (
    SatelliteUnavailableError,
    geoai_status,
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
    """Analyze a location via Ved Geo AI (Bhuvan LULC when enabled, else local NPZ)."""
    analysis = get_geo_ai_provider().analyze(
        {"lat": loc.latitude, "lng": loc.longitude}
    )

    if analysis.get("available") is False:
        code = analysis.get("code") or "SATELLITE DATA UNAVAILABLE"
        extra = analysis.get("extra") or {}
        status_code = 503 if code in {"MODEL_UNAVAILABLE", "LOOKUP_UNAVAILABLE"} else 422
        raise HTTPException(
            status_code=status_code,
            detail={
                "code": code,
                "message": analysis.get("change_detection") or "SATELLITE DATA UNAVAILABLE",
                "available": False,
                "lulc_source": analysis.get("lulc_source"),
                "bhuvan_lulc": analysis.get("bhuvan_lulc"),
                **extra,
            },
        )

    result = {
        "available": True,
        "prediction": analysis.get("prediction") or analysis.get("lulc") or analysis.get("classification"),
        "classification": analysis.get("classification"),
        "lulc": analysis.get("lulc"),
        "lulc_source": analysis.get("lulc_source"),
        "ndvi_val": analysis.get("ndvi_val", analysis.get("ndvi")),
        "ndwi_val": analysis.get("ndwi_val", analysis.get("ndwi")),
        "ndvi": analysis.get("ndvi"),
        "ndwi": analysis.get("ndwi"),
        "ndvi_source": analysis.get("ndvi_source"),
        "ndwi_source": analysis.get("ndwi_source"),
        "satellite_match": analysis.get("satellite_match"),
        "confidence": analysis.get("confidence"),
        "source": analysis.get("source"),
        "change_detection": analysis.get("change_detection"),
        "provider": analysis.get("provider"),
        "bhuvan_lulc": analysis.get("bhuvan_lulc"),
        "bhuvan": analysis.get("bhuvan"),
        "satellite_imagery_provider": analysis.get("satellite_imagery_provider"),
        "satellite_imagery_type": analysis.get("satellite_imagery_type"),
        "row": analysis.get("row"),
        "col": analysis.get("col"),
        "pixel_size_m": analysis.get("pixel_size_m"),
    }

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
