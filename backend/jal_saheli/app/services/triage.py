"""Autonomous triage: low-confidence analyses become verification tasks."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.contracts import Priority, SubmissionStatus, VerificationStatus
from app.models.entities import Submission, VerificationTask


def _priority_for(confidence: float) -> str:
    if confidence < 0.55:
        return Priority.HIGH
    if confidence < 0.75:
        return Priority.MEDIUM
    return Priority.LOW


async def maybe_create_verification_task(
    session: AsyncSession,
    submission: Submission,
    confidence: float,
    reason: str,
) -> VerificationTask | None:
    settings = get_settings()
    threshold = settings.ai.confidence_threshold
    if confidence >= threshold and not (submission.status == SubmissionStatus.VERIFICATION_REQUIRED):
        return None

    existing = await session.execute(
        select(VerificationTask).where(VerificationTask.submission_id == submission.id)
    )
    task = existing.scalars().first()
    now = datetime.now(UTC)
    if task is None:
        task = VerificationTask(
            id=f"VQ-{submission.id.replace('GW-', '')}",
            submission_id=submission.id,
            status=VerificationStatus.PENDING,
            priority=_priority_for(confidence),
            reason=reason,
            confidence=confidence,
            assigned_officer=None,
            lat=submission.lat,
            lng=submission.lng,
            created_at=now,
            updated_at=now,
        )
        session.add(task)
    else:
        task.reason = reason
        task.confidence = confidence
        task.priority = _priority_for(confidence)
        task.updated_at = now
    submission.status = SubmissionStatus.VERIFICATION_REQUIRED
    return task
