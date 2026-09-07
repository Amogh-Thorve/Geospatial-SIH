"""Dashboard, GIS, submissions, verification, recommendations, Jal Saheli routes."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.contracts import SubmissionStatus, VerificationStatus
from app.db.database import get_db_session
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
    DashboardAlert,
    DashboardKpi,
    DashboardSummary,
    GisFeatureCollection,
    JalSaheliEarningsOut,
    JalSaheliProfileOut,
    JalSaheliSubmissionCreate,
    JalSaheliSubmissionOut,
    RecommendationOut,
    SubmissionCreate,
    SubmissionOut,
    VerificationPatch,
    VerificationTaskOut,
)
from app.services.serializers import (
    analysis_out,
    gis_feature,
    jal_profile_out,
    jal_submission_out,
    recommendation_out,
    submission_out,
    utcnow,
    verification_out,
)
from app.services.workflow import analyze_submission, get_submission
from app.workers.feedback import store_feedback

router = APIRouter()


def _next_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8].upper()}"


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(db: AsyncSession = Depends(get_db_session)) -> DashboardSummary:
    total = await db.scalar(select(func.count()).select_from(Submission)) or 0
    verified = await db.scalar(
        select(func.count()).select_from(Submission).where(Submission.status == SubmissionStatus.VERIFIED)
    ) or 0
    low = await db.scalar(
        select(func.count()).select_from(AnalysisResult).where(AnalysisResult.confidence < 0.75)
    ) or 0
    tasks = await db.scalar(
        select(func.count())
        .select_from(VerificationTask)
        .where(VerificationTask.status.in_([VerificationStatus.PENDING, VerificationStatus.ASSIGNED, VerificationStatus.IN_PROGRESS, VerificationStatus.NEEDS_REVIEW]))
    ) or 0
    areas = await db.scalar(select(func.count()).select_from(WatershedFeature)) or 0
    recs = await db.scalar(select(func.count()).select_from(Recommendation)) or 0

    kpis = [
        DashboardKpi(id="submissions", label="Total submissions", value=str(total), change="Demo seed + live posts", icon="FileText", status="info"),
        DashboardKpi(id="verified", label="Verified submissions", value=str(verified), change="Field-closed cases", icon="CheckCircle2", status="success", trend="up"),
        DashboardKpi(id="low-conf", label="Low-confidence cases", value=str(low), change="Below triage threshold", icon="AlertTriangle", status="warning", trend="down"),
        DashboardKpi(id="queue", label="Active verification tasks", value=str(tasks), change="Autonomous triage", icon="ShieldCheck", status="warning"),
        DashboardKpi(id="areas", label="Watershed features mapped", value=str(areas), change="Local demo GIS layer", icon="MapPin", status="info"),
        DashboardKpi(id="recs", label="Recommended interventions", value=str(recs), change="Rule-based demo engine", icon="Satellite", status="success"),
    ]

    task_rows = (
        await db.execute(
            select(VerificationTask, Submission)
            .join(Submission, Submission.id == VerificationTask.submission_id)
            .order_by(VerificationTask.created_at.desc())
            .limit(4)
        )
    ).all()
    alerts = [
        DashboardAlert(
            id=task.id,
            title=f"{task.priority} triage · {sub.classification or sub.title}",
            location=sub.location_label,
            submission_id=sub.id,
            priority="high" if task.priority == "HIGH" else "medium",
            time=task.updated_at.isoformat(),
            description=task.reason,
        )
        for task, sub in task_rows
    ]

    recent = (
        await db.execute(select(Submission).order_by(Submission.created_at.desc()).limit(5))
    ).scalars().all()
    activity = [
        {
            "id": f"ACT-{row.id}",
            "type": "submission",
            "title": f"{row.status.replace('_', ' ').title()}",
            "detail": f"{row.id} · {row.title}",
            "time": row.created_at.isoformat(),
            "status": "pending" if "PENDING" in row.status or "VERIFICATION" in row.status else "verified",
        }
        for row in recent
    ]

    return DashboardSummary(
        provider="demo",
        kpis=kpis,
        alerts=alerts,
        activity=activity,
        system_status=[
            {"id": "api", "label": "GeoWise API", "status": "operational", "note": "Local FastAPI"},
            {"id": "geoai", "label": "Geo AI provider", "status": "demo", "note": "MockGeoAIProvider — not live ML"},
            {"id": "satellite", "label": "Satellite adapter", "status": "demo", "note": "Srishti adapter is local/stub"},
            {"id": "telegram", "label": "Telegram adapter", "status": "demo", "note": "LocalTelegramBotProvider"},
        ],
        totals={
            "submissions": int(total),
            "verified": int(verified),
            "low_confidence": int(low),
            "verification_tasks": int(tasks),
            "features": int(areas),
            "recommendations": int(recs),
        },
    )


@router.get("/submissions", response_model=list[SubmissionOut])
async def list_submissions(db: AsyncSession = Depends(get_db_session)) -> list[SubmissionOut]:
    rows = (await db.execute(select(Submission).order_by(Submission.created_at.desc()))).scalars().all()
    return [submission_out(r) for r in rows]


@router.get("/submissions/{submission_id}", response_model=SubmissionOut)
async def get_submission_route(submission_id: str, db: AsyncSession = Depends(get_db_session)) -> SubmissionOut:
    row = await get_submission(db, submission_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission_out(row)


@router.post("/submissions", response_model=SubmissionOut, status_code=201)
async def create_submission(payload: SubmissionCreate, db: AsyncSession = Depends(get_db_session)) -> SubmissionOut:
    sid = _next_id("GW")
    now = utcnow()
    row = Submission(
        id=sid,
        title=payload.title,
        location_label=payload.location_label,
        district=payload.district,
        lat=payload.lat,
        lng=payload.lng,
        status=SubmissionStatus.PENDING,
        classification=payload.classification,
        photo_url=payload.photo_url,
        captured_at=now,
        submitter_name=payload.submitter_name,
        source=payload.source,
        notes=payload.notes,
        created_at=now,
    )
    db.add(row)
    db.add(
        WatershedFeature(
            id=sid,
            submission_id=sid,
            name=payload.classification or payload.title,
            feature_type="jal-saheli" if payload.source == "jal-saheli" else "intervention",
            location=payload.district or payload.location_label,
            status="pending",
            lat=payload.lat,
            lng=payload.lng,
            confidence=0.0,
            description=payload.notes or "New field submission",
            priority="MEDIUM",
        )
    )
    await db.flush()
    return submission_out(row)


@router.post("/submissions/{submission_id}/analyze", response_model=AnalysisOut)
async def analyze_route(submission_id: str, db: AsyncSession = Depends(get_db_session)) -> AnalysisOut:
    row = await get_submission(db, submission_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    analysis = await analyze_submission(db, row)
    rec = (await db.execute(select(Recommendation).where(Recommendation.submission_id == submission_id))).scalars().first()
    await db.refresh(row)
    return analysis_out(analysis, row, rec)


@router.get("/submissions/{submission_id}/analysis", response_model=AnalysisOut)
async def get_analysis(submission_id: str, db: AsyncSession = Depends(get_db_session)) -> AnalysisOut:
    row = await get_submission(db, submission_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if row.analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found. POST /analyze first.")
    rec = (await db.execute(select(Recommendation).where(Recommendation.submission_id == submission_id))).scalars().first()
    return analysis_out(row.analysis, row, rec)


@router.get("/gis/features", response_model=GisFeatureCollection)
async def gis_features(db: AsyncSession = Depends(get_db_session)) -> GisFeatureCollection:
    rows = (await db.execute(select(WatershedFeature))).scalars().all()
    return GisFeatureCollection(provider="demo-local", features=[gis_feature(r) for r in rows])


@router.get("/verification/tasks", response_model=list[VerificationTaskOut])
async def list_tasks(db: AsyncSession = Depends(get_db_session)) -> list[VerificationTaskOut]:
    rows = (
        await db.execute(
            select(VerificationTask, Submission)
            .join(Submission, Submission.id == VerificationTask.submission_id)
            .order_by(VerificationTask.created_at.desc())
        )
    ).all()
    return [verification_out(task, sub) for task, sub in rows]


@router.get("/verification/tasks/{task_id}", response_model=VerificationTaskOut)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db_session)) -> VerificationTaskOut:
    row = (
        await db.execute(
            select(VerificationTask, Submission)
            .join(Submission, Submission.id == VerificationTask.submission_id)
            .where(VerificationTask.id == task_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Verification task not found")
    return verification_out(row[0], row[1])


@router.patch("/verification/tasks/{task_id}", response_model=VerificationTaskOut)
async def patch_task(
    task_id: str,
    payload: VerificationPatch,
    db: AsyncSession = Depends(get_db_session),
) -> VerificationTaskOut:
    task = (await db.execute(select(VerificationTask).where(VerificationTask.id == task_id))).scalars().first()
    if task is None:
        raise HTTPException(status_code=404, detail="Verification task not found")
    submission = await get_submission(db, task.submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if payload.status:
        allowed = {s.value for s in VerificationStatus}
        if payload.status not in allowed:
            raise HTTPException(status_code=422, detail=f"Invalid status. Allowed: {sorted(allowed)}")
        task.status = payload.status
    if payload.assigned_officer is not None:
        task.assigned_officer = payload.assigned_officer
        if task.status == VerificationStatus.PENDING:
            task.status = VerificationStatus.ASSIGNED
    if payload.notes is not None:
        task.notes = payload.notes
    task.updated_at = utcnow()

    if task.status == VerificationStatus.VERIFIED:
        submission.status = SubmissionStatus.VERIFIED
        await store_feedback(db, submission, "VERIFIED", payload.outcome_label, payload.notes)
        profile = (await db.execute(select(JalSaheliProfile).where(JalSaheliProfile.id == "JS-001"))).scalars().first()
        if profile:
            profile.jal_credits += 15
        js = (
            await db.execute(
                select(JalSaheliSubmission).where(JalSaheliSubmission.core_submission_id == submission.id)
            )
        ).scalars().first()
        if js:
            js.status = SubmissionStatus.VERIFIED
            js.credits = 15
    elif task.status == VerificationStatus.REJECTED:
        submission.status = SubmissionStatus.REJECTED
        await store_feedback(db, submission, "REJECTED", payload.outcome_label, payload.notes)
    elif task.status == VerificationStatus.NEEDS_REVIEW:
        submission.status = SubmissionStatus.VERIFICATION_REQUIRED

    await db.flush()
    return verification_out(task, submission)


@router.get("/recommendations/{submission_id}", response_model=RecommendationOut)
async def get_recommendation(submission_id: str, db: AsyncSession = Depends(get_db_session)) -> RecommendationOut:
    row = (
        await db.execute(select(Recommendation).where(Recommendation.submission_id == submission_id))
    ).scalars().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return recommendation_out(row)


@router.get("/jal-saheli/profile", response_model=JalSaheliProfileOut)
async def jal_profile(db: AsyncSession = Depends(get_db_session)) -> JalSaheliProfileOut:
    profile = (await db.execute(select(JalSaheliProfile).where(JalSaheliProfile.id == "JS-001"))).scalars().first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    subs = (
        await db.execute(
            select(JalSaheliSubmission).where(JalSaheliSubmission.profile_id == profile.id)
        )
    ).scalars().all()
    return jal_profile_out(profile, list(subs))


@router.get("/jal-saheli/submissions", response_model=list[JalSaheliSubmissionOut])
async def jal_submissions(db: AsyncSession = Depends(get_db_session)) -> list[JalSaheliSubmissionOut]:
    rows = (
        await db.execute(select(JalSaheliSubmission).order_by(JalSaheliSubmission.created_at.desc()))
    ).scalars().all()
    return [jal_submission_out(r) for r in rows]


@router.post("/jal-saheli/submissions", response_model=JalSaheliSubmissionOut, status_code=201)
async def jal_create(
    payload: JalSaheliSubmissionCreate,
    db: AsyncSession = Depends(get_db_session),
) -> JalSaheliSubmissionOut:
    jid = _next_id("JS")
    lat = payload.lat if payload.lat is not None else 13.6288
    lng = payload.lng if payload.lng is not None else 79.4192
    core = SubmissionCreate(
        title=payload.title or payload.type_label or payload.observation_type,
        location_label=payload.location_label,
        district=payload.location_label,
        lat=lat,
        lng=lng,
        classification=payload.type_label or payload.observation_type,
        photo_url=payload.photo_url,
        submitter_name="Asha Patil",
        source="jal-saheli",
        notes=payload.notes,
    )
    created = await create_submission(core, db)
    analysis_row = await get_submission(db, created.id)
    if analysis_row:
        await analyze_submission(db, analysis_row)
    now = utcnow()
    js = JalSaheliSubmission(
        id=jid,
        profile_id="JS-001",
        core_submission_id=created.id,
        observation_type=payload.observation_type,
        type_label=payload.type_label or payload.observation_type.replace("_", " ").title(),
        status=analysis_row.status if analysis_row else SubmissionStatus.ANALYZED,
        channel=payload.channel,
        credits=0,
        lat=lat,
        lng=lng,
        location_label=payload.location_label,
        notes=payload.notes,
        photo_url=payload.photo_url,
        created_at=now,
    )
    db.add(js)
    await db.flush()
    return jal_submission_out(js)


@router.get("/jal-saheli/earnings", response_model=JalSaheliEarningsOut)
async def jal_earnings(db: AsyncSession = Depends(get_db_session)) -> JalSaheliEarningsOut:
    profile = (await db.execute(select(JalSaheliProfile).where(JalSaheliProfile.id == "JS-001"))).scalars().first()
    rows = (
        await db.execute(select(JalSaheliSubmission).order_by(JalSaheliSubmission.created_at.desc()))
    ).scalars().all()
    ledger = [
        {
            "id": r.id,
            "submissionId": r.core_submission_id or r.id,
            "typeLabel": r.type_label,
            "date": r.created_at.isoformat(),
            "amount": r.credits,
            "amountDisplay": f"{r.credits} Jal Credits",
            "status": "credited" if r.credits else "pending",
            "method": "non-monetary stewardship score",
            "note": "No cash value",
        }
        for r in rows
    ]
    return JalSaheliEarningsOut(
        total_credits=profile.jal_credits if profile else 0,
        transaction_count=len(ledger),
        ledger=ledger,
    )
