"""Submission analysis + recommendation orchestration."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.provider import get_geo_ai_provider
from app.core.contracts import AnalysisStatus, SubmissionStatus
from app.models.entities import AnalysisResult, Recommendation, Submission
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

    analysis = submission.analysis
    if analysis is None:
        analysis = AnalysisResult(submission_id=submission.id, created_at=now)
        session.add(analysis)
        submission.analysis = analysis

    analysis.status = AnalysisStatus.COMPLETED
    analysis.provider = raw["provider"]
    analysis.classification = raw["classification"]
    analysis.confidence = raw["confidence"]
    analysis.satellite_match = raw["satellite_match"]
    analysis.ndvi = raw["ndvi"]
    analysis.ndwi = raw["ndwi"]
    analysis.ndvi_source = raw["ndvi_source"]
    analysis.ndwi_source = raw["ndwi_source"]
    analysis.lulc = raw["lulc"]
    analysis.change_detection = raw["change_detection"]
    analysis.anomaly = raw["anomaly"]
    analysis.xai_json = json.dumps(xai)
    analysis.explanation = " ".join(xai["explanation"])
    analysis.created_at = now

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

    if raw["anomaly"] or raw["confidence"] < 0.75:
        await maybe_create_verification_task(
            session,
            submission,
            raw["confidence"],
            raw["change_detection"],
        )
    else:
        submission.status = SubmissionStatus.ANALYZED

    await session.flush()
    return analysis
