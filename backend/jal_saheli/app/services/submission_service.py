"""
app/services/submission_service.py
Submission CRUD — reads and writes from real database records.
No hardcoded JSON responses.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.profile import CadreProfile
from app.models.submission import (
    Submission,
    SubmissionStatus,
    OBSERVATION_TYPE_LABELS,
    REWARD_SCHEDULE,
)
from app.models.earnings import EarningsLedger
from app.schemas.submission import (
    SubmissionResponse,
    VerificationDetail,
    LocationSchema,
    VerificationHistoryItem,
    SubmissionStatusResponse,
)
from app.utils.id_generator import generate_submission_id
from app.utils.storage import save_photo

logger = logging.getLogger("jal_saheli.services.submission")

_VALID_TYPES = set(OBSERVATION_TYPE_LABELS.keys())


def _to_response(sub: Submission, has_earnings: bool = False) -> SubmissionResponse:
    date_str = sub.created_at.date().isoformat() if sub.created_at else None
    date_disp = sub.created_at.strftime("%b %d, %Y") if sub.created_at else None
    time_disp = sub.created_at.strftime("%I:%M %p") if sub.created_at else None
    reward = sub.reward_amount

    return SubmissionResponse(
        id=sub.id,
        cadre_id=sub.cadre_id,
        observation_type=sub.observation_type,
        type_label=sub.type_label,
        description=sub.description,
        channel=sub.channel,
        latitude=sub.latitude,
        longitude=sub.longitude,
        location_label=sub.location_label,
        location=LocationSchema(lat=sub.latitude, lng=sub.longitude, label=sub.location_label),
        photo_url=sub.photo_url,
        capture_time=sub.capture_time,
        status=sub.status,
        verification=VerificationDetail(
            ai_confidence=sub.ai_confidence,
            satellite_confidence=sub.satellite_confidence,
            final_confidence=sub.final_confidence,
            verified_by=sub.verified_by,
            verified_at=sub.verified_at,
            rejection_reason=sub.rejection_reason,
        ),
        reward_amount=reward,
        earnings_credited=has_earnings,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        type=sub.observation_type,
        notes=sub.description,
        earnings=reward,
        earnings_display=f"₹{reward}",
        date=date_str,
        date_display=date_disp,
        time_display=time_disp,
    )


async def create_submission(
    *,
    cadre: CadreProfile,
    db: AsyncSession,
    observation_type: str,
    location_json: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_label: Optional[str] = None,
    description: Optional[str] = None,
    capture_time_str: Optional[str] = None,
    photo: Optional[UploadFile] = None,
) -> SubmissionResponse:
    """
    Create a new submission record. Saves photo if provided.
    Validates observation_type and coordinates.
    """
    # ── Validate observation type ─────────────────────────────────────────────
    obs_type = observation_type.strip().lower()
    if obs_type not in _VALID_TYPES:
        raise ValueError(
            f"Invalid observation type '{obs_type}'. "
            f"Valid: {', '.join(sorted(_VALID_TYPES))}"
        )

    # ── Parse location ────────────────────────────────────────────────────────
    if location_json:
        try:
            loc = json.loads(location_json)
            if latitude is None and loc.get("lat") is not None:
                latitude = float(loc["lat"])
            if longitude is None and loc.get("lng") is not None:
                longitude = float(loc["lng"])
            if location_label is None and loc.get("label"):
                location_label = loc["label"]
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid location JSON: {exc}") from exc

    if latitude is not None and not (-90 <= latitude <= 90):
        raise ValueError(f"Latitude must be between -90 and 90, got {latitude}")
    if longitude is not None and not (-180 <= longitude <= 180):
        raise ValueError(f"Longitude must be between -180 and 180, got {longitude}")

    # ── Parse capture time ────────────────────────────────────────────────────
    capture_time: Optional[datetime] = None
    if capture_time_str:
        try:
            capture_time = datetime.fromisoformat(capture_time_str)
            if capture_time.tzinfo is None:
                capture_time = capture_time.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise ValueError(f"Invalid capture_time format. Use ISO 8601: {exc}") from exc

    # ── Generate ID ───────────────────────────────────────────────────────────
    sub_id = generate_submission_id()

    # ── Save photo ────────────────────────────────────────────────────────────
    settings = get_settings()
    photo_url: Optional[str] = None
    photo_filename: Optional[str] = None

    if photo and photo.filename:
        photo_url, photo_filename = await save_photo(
            file=photo,
            cadre_id=cadre.id,
            submission_id=sub_id,
            base_dir=settings.storage.local_dir,
            max_bytes=settings.storage.max_photo_size_bytes,
        )

    # ── Insert record ─────────────────────────────────────────────────────────
    sub = Submission(
        id=sub_id,
        cadre_id=cadre.id,
        observation_type=obs_type,
        type_label=OBSERVATION_TYPE_LABELS.get(obs_type, obs_type.replace("_", " ").title()),
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
        capture_time=capture_time,
        photo_url=photo_url,
        photo_filename=photo_filename,
        status=SubmissionStatus.PENDING,
        channel="web",
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)

    logger.info(
        "Submission created",
        extra={"id": sub.id, "type": obs_type, "cadre": cadre.id},
    )
    return _to_response(sub, has_earnings=False)


async def list_submissions(
    cadre: CadreProfile,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
) -> tuple[list[SubmissionResponse], int]:
    """
    Return paginated submissions for a cadre.
    Returns (items, total_count).
    """
    q = select(Submission).where(Submission.cadre_id == cadre.id)
    if status_filter:
        try:
            q = q.where(Submission.status == SubmissionStatus(status_filter))
        except ValueError:
            raise ValueError(f"Invalid status filter '{status_filter}'")

    # Total count
    count_q = select(func.count()).select_from(q.subquery())
    total: int = (await db.execute(count_q)).scalar_one()

    # Paginated results
    offset = (page - 1) * page_size
    q = q.order_by(Submission.created_at.desc()).offset(offset).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    # Check which have credited earnings
    credited_ids: set[str] = set()
    if rows:
        sub_ids = [r.id for r in rows]
        er_q = select(EarningsLedger.submission_id).where(
            EarningsLedger.submission_id.in_(sub_ids)
        )
        credited_ids = {r for (r,) in (await db.execute(er_q)).all()}

    items = [_to_response(row, has_earnings=row.id in credited_ids) for row in rows]
    return items, total


async def get_submission_by_id(
    cadre: CadreProfile,
    db: AsyncSession,
    submission_id: str,
) -> Optional[SubmissionResponse]:
    """Fetch a single submission. Returns None if not found or not owned by cadre."""
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id,
            Submission.cadre_id == cadre.id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return None

    has_earnings = False
    er_q = await db.execute(
        select(EarningsLedger.id).where(EarningsLedger.submission_id == sub.id).limit(1)
    )
    has_earnings = er_q.scalar_one_or_none() is not None

    return _to_response(sub, has_earnings=has_earnings)


async def get_submission_status(
    cadre: CadreProfile,
    db: AsyncSession,
    submission_id: str,
) -> Optional[SubmissionStatusResponse]:
    """Lightweight status-only fetch for polling."""
    result = await db.execute(
        select(
            Submission.id,
            Submission.status,
            Submission.ai_confidence,
            Submission.satellite_confidence,
            Submission.final_confidence,
            Submission.updated_at,
        ).where(
            Submission.id == submission_id,
            Submission.cadre_id == cadre.id,
        )
    )
    row = result.one_or_none()
    if row is None:
        return None
    return SubmissionStatusResponse(
        id=row.id,
        status=row.status,
        ai_confidence=row.ai_confidence,
        satellite_confidence=row.satellite_confidence,
        final_confidence=row.final_confidence,
        updated_at=row.updated_at,
    )


async def list_verification_history(
    cadre: CadreProfile,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[VerificationHistoryItem], int]:
    """
    Return paginated verification history — submissions that have reached
    a terminal status (VERIFIED or REJECTED).
    """
    q = select(Submission).where(
        Submission.cadre_id == cadre.id,
        Submission.status.in_([SubmissionStatus.VERIFIED, SubmissionStatus.REJECTED]),
    )
    count_q = select(func.count()).select_from(q.subquery())
    total: int = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    q = q.order_by(Submission.verified_at.desc().nulls_last()).offset(offset).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    items = [
        VerificationHistoryItem(
            submission_id=r.id,
            observation_type=r.observation_type,
            type_label=r.type_label,
            status=r.status,
            ai_confidence=r.ai_confidence,
            satellite_confidence=r.satellite_confidence,
            final_confidence=r.final_confidence,
            rejection_reason=r.rejection_reason,
            verified_at=r.verified_at,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return items, total
