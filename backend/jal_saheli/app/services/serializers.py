"""Map ORM rows to API schemas."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from app.models.entities import (
    AnalysisResult,
    JalSaheliProfile,
    JalSaheliSubmission,
    Recommendation,
    Submission,
    VerificationTask,
    WatershedFeature,
)
from app.schemas.api import (
    AnalysisOut,
    FeatureImportance,
    JalSaheliProfileOut,
    JalSaheliSubmissionOut,
    RecommendationOut,
    SubmissionOut,
    VerificationTaskOut,
    XaiBlock,
)


def coords(lat: float, lng: float) -> str:
    return f"{lat:.4f}° N, {lng:.4f}° E"


def submission_out(row: Submission) -> SubmissionOut:
    return SubmissionOut(
        id=row.id,
        title=row.title,
        location_label=row.location_label,
        district=row.district,
        lat=row.lat,
        lng=row.lng,
        status=row.status,
        classification=row.classification,
        photo_url=row.photo_url,
        captured_at=row.captured_at,
        submitter_name=row.submitter_name,
        source=row.source,
        notes=row.notes,
        coordinates=coords(row.lat, row.lng),
    )


def analysis_out(row: AnalysisResult, submission: Submission, rec: Recommendation | None) -> AnalysisOut:
    raw = json.loads(row.xai_json or "{}")
    xai_conf = raw.get("confidence")
    if xai_conf is None:
        xai_conf = row.confidence
    xai = XaiBlock(
        confidence=xai_conf,
        important_features=[FeatureImportance(**f) for f in raw.get("important_features", [])],
        explanation=list(raw.get("explanation") or []),
        method=raw.get("method", "satellite-lookup"),
    )
    return AnalysisOut(
        submission_id=row.submission_id,
        status=row.status,
        provider=row.provider,
        classification=row.classification,
        confidence=row.confidence,
        satellite_match=row.satellite_match,
        ndvi=row.ndvi,
        ndwi=row.ndwi,
        ndvi_source=row.ndvi_source,
        ndwi_source=row.ndwi_source,
        lulc=row.lulc,
        change_detection=row.change_detection,
        anomaly=row.anomaly,
        xai=xai,
        recommendation=rec.intervention if rec else None,
        photo_url=submission.photo_url,
        location=submission.location_label,
        coordinates=coords(submission.lat, submission.lng),
        captured_at=submission.captured_at,
        submission_status=submission.status,
    )


def verification_out(task: VerificationTask, submission: Submission) -> VerificationTaskOut:
    reasons = [task.reason] if task.reason else []
    if task.confidence is not None and task.confidence < 0.75:
        reasons.append(f"Classifier confidence {int(task.confidence * 100)}% is below the triage threshold.")
    risk = None
    if task.confidence is not None:
        risk = max(10, min(99, int((1 - task.confidence) * 100)))
    ai_conf = int(round(task.confidence * 100)) if task.confidence is not None else None
    return VerificationTaskOut(
        id=task.id,
        submission_id=task.submission_id,
        status=task.status,
        priority=task.priority,
        reason=task.reason,
        confidence=task.confidence,
        ai_confidence=ai_conf,
        assigned_officer=task.assigned_officer,
        lat=task.lat,
        lng=task.lng,
        notes=task.notes,
        title=submission.title,
        intervention=submission.classification or submission.title,
        location={
            "village": submission.location_label,
            "district": submission.district,
            "state": "Andhra Pradesh",
        },
        submitted_at=submission.captured_at,
        triage_reason=task.reason,
        reasons=reasons,
        recommended_action="Immediate field verification" if task.priority == "HIGH" else "Schedule field verification",
        risk_score=risk,
    )


def recommendation_out(row: Recommendation) -> RecommendationOut:
    return RecommendationOut(
        submission_id=row.submission_id,
        intervention=row.intervention,
        suitability=row.suitability,
        reasons=json.loads(row.reasons_json or "[]"),
        important_features=[FeatureImportance(**f) for f in json.loads(row.important_features_json or "[]")],
        explanation=row.explanation,
        provider=row.provider,
        method=row.provider if row.provider else "label-mapping",
    )


def gis_feature(row: WatershedFeature) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [row.lng, row.lat]},
        "properties": {
            "id": row.id,
            "name": row.name,
            "type": row.feature_type,
            "location": row.location,
            "status": row.status,
            "analysis_status": row.status,
            "confidence": row.confidence,
            "description": row.description,
            "priority": row.priority,
            "submission_id": row.submission_id,
        },
    }


def jal_profile_out(
    profile: JalSaheliProfile,
    submissions: list[JalSaheliSubmission],
) -> JalSaheliProfileOut:
    verified = sum(1 for s in submissions if s.status == "VERIFIED")
    pending = sum(1 for s in submissions if s.status in {"PENDING", "ANALYZING", "ANALYZED", "VERIFICATION_REQUIRED"})
    rejected = sum(1 for s in submissions if s.status == "REJECTED")
    total = len(submissions)
    accuracy = int(round((verified / total) * 100)) if total else 0
    return JalSaheliProfileOut(
        id=profile.id,
        name=profile.name,
        role=profile.role,
        village=profile.village,
        phone=profile.phone,
        badge=profile.badge,
        jal_credits=profile.jal_credits,
        stats={
            "totalSubmissions": total,
            "verifiedCount": verified,
            "pendingCount": pending,
            "rejectedCount": rejected,
            "accuracyRate": accuracy,
            "accuracyRateDisplay": f"{accuracy}%",
            "totalCredits": profile.jal_credits,
        },
        accuracy_history=[{"label": s.id, "score": 90 if s.status == "VERIFIED" else 70} for s in submissions[:8]],
        provider="demo",
    )


def jal_submission_out(row: JalSaheliSubmission) -> JalSaheliSubmissionOut:
    return JalSaheliSubmissionOut(
        id=row.id,
        core_submission_id=row.core_submission_id,
        observation_type=row.observation_type,
        type_label=row.type_label,
        status=row.status,
        channel=row.channel,
        credits=row.credits,
        lat=row.lat,
        lng=row.lng,
        location_label=row.location_label,
        notes=row.notes,
        photo_url=row.photo_url,
        created_at=row.created_at,
        earnings=row.credits,
        earnings_display=f"{row.credits} Jal Credits",
    )


def utcnow() -> datetime:
    return datetime.now(UTC)
