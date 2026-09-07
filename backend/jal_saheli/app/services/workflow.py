"""Submission analysis + recommendation orchestration."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.provider import get_geo_ai_provider
from app.core.contracts import AnalysisStatus, SubmissionStatus
from app.models.entities import AnalysisResult, Recommendation, Submission, WatershedFeature
from app.services.recommendation import recommend
from app.services.triage import maybe_create_verification_task
from app.services.xai import build_xai


async def get_submission(session: AsyncSession, submission_id: str) -> Submission | None:
    result = await session.execute(
        select(Submission)
        .options(
            selectinload(Submission.analysis),
            selectinload(Submission.recommendations),
            selectinload(Submission.verification_tasks),
        )
        .where(Submission.id == submission_id)
    )
    return result.scalars().first()


async def _sync_gis(
    session: AsyncSession,
    submission: Submission,
    analysis: AnalysisResult,
) -> None:
    feature = (
        await session.execute(
            select(WatershedFeature).where(WatershedFeature.submission_id == submission.id)
        )
    ).scalars().first()
    if feature is None:
        return
    feature.lat = submission.lat
    feature.lng = submission.lng
    if analysis.status == AnalysisStatus.UNAVAILABLE:
        feature.status = "unavailable"
        feature.confidence = None
        feature.description = analysis.change_detection or "SATELLITE DATA UNAVAILABLE"
        feature.priority = "MEDIUM"
    elif analysis.anomaly:
        feature.status = "flagged"
        feature.confidence = analysis.confidence
        feature.description = (
            f"{analysis.lulc}; NDVI={analysis.ndvi}; NDWI={analysis.ndwi}; {analysis.satellite_match}"
        )
        feature.priority = "HIGH"
    else:
        feature.status = "analyzed"
        feature.confidence = analysis.confidence
        feature.description = (
            f"{analysis.lulc}; NDVI={analysis.ndvi}; NDWI={analysis.ndwi}; {analysis.satellite_match}"
        )
        feature.priority = "MEDIUM"
    if analysis.classification:
        feature.name = analysis.classification


async def analyze_submission(session: AsyncSession, submission: Submission) -> AnalysisResult:
    submission.status = SubmissionStatus.ANALYZING
    await session.flush()

    provider = get_geo_ai_provider()
    raw = provider.analyze(
        {
            "id": submission.id,
            "title": submission.title,
            "classification": submission.classification,
            "notes": submission.notes or "",
            "lat": submission.lat,
            "lng": submission.lng,
        }
    )
    xai = build_xai(raw)
    rec = recommend(raw)
    now = datetime.now(UTC)
    unavailable = raw.get("available") is False or raw.get("status") == "UNAVAILABLE"

    analysis = submission.analysis
    if analysis is None:
        analysis = AnalysisResult(submission_id=submission.id, created_at=now)
        session.add(analysis)
        submission.analysis = analysis

    analysis.status = AnalysisStatus.UNAVAILABLE if unavailable else AnalysisStatus.COMPLETED
    analysis.provider = raw["provider"]
    analysis.classification = raw.get("classification") or ""
    analysis.confidence = raw.get("confidence")
    analysis.satellite_match = raw.get("satellite_match") or "UNAVAILABLE"
    analysis.ndvi = raw.get("ndvi")
    analysis.ndwi = raw.get("ndwi")
    analysis.ndvi_source = raw.get("ndvi_source") or "unavailable"
    analysis.ndwi_source = raw.get("ndwi_source") or "unavailable"
    analysis.lulc = raw.get("lulc") or ""
    analysis.change_detection = raw.get("change_detection") or ""
    analysis.anomaly = bool(raw.get("anomaly"))
    analysis.xai_json = json.dumps(xai)
    analysis.explanation = " ".join(xai["explanation"])
    analysis.created_at = now

    if raw.get("classification"):
        submission.classification = raw["classification"]

    existing_rec = await session.execute(
        select(Recommendation).where(Recommendation.submission_id == submission.id)
    )
    recommendation = existing_rec.scalars().first()
    if recommendation is None:
        recommendation = Recommendation(submission_id=submission.id, created_at=now)
        session.add(recommendation)
    recommendation.intervention = rec["intervention"]
    recommendation.suitability = rec["suitability"]
    recommendation.reasons_json = json.dumps(rec["reasons"])
    recommendation.important_features_json = json.dumps(rec["important_features"])
    recommendation.explanation = rec["explanation"]
    recommendation.provider = rec["provider"]
    recommendation.created_at = now

    if unavailable or raw.get("anomaly") or (
        raw.get("confidence") is not None and raw["confidence"] < 0.75
    ):
        await maybe_create_verification_task(
            session,
            submission,
            raw.get("confidence"),
            raw.get("change_detection") or "Geo AI flagged this submission",
            anomaly=True,
        )
    else:
        submission.status = SubmissionStatus.ANALYZED

    await _sync_gis(session, submission, analysis)
    await session.flush()
    return analysis
