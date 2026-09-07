"""Closed-loop feedback store. No retraining in the MVP."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import FeedbackRecord, Submission


async def store_feedback(
    session: AsyncSession,
    submission: Submission,
    outcome: str,
    verified_label: str | None,
    notes: str | None,
) -> FeedbackRecord:
    predicted = ""
    confidence = None
    if submission.analysis is not None:
        predicted = submission.analysis.classification
        confidence = submission.analysis.confidence
    record = FeedbackRecord(
        submission_id=submission.id,
        predicted_label=predicted,
        verified_label=verified_label or predicted,
        outcome=outcome,
        confidence=confidence,
        notes=notes,
        created_at=datetime.now(UTC),
    )
    session.add(record)
    return record
