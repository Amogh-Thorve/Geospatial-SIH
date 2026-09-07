"""
app/services/verification_service.py
Dual-engine consensus verification pipeline:
  GeoBrain-v3 (AI Vision, 40% weight) + Sentinel-2 MSI (Satellite NDWI, 60% weight)

Consensus Formula:
  final_confidence = round((0.40 * ai_confidence) + (0.60 * satellite_confidence), 1)

Decision Logic:
  final_confidence >= 80.0 → VERIFIED  → Credits reward to EarningsLedger
  final_confidence <  65.0 → REJECTED  → Rejection reason logged
  otherwise                → PROCESSING (flagged for manual review)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.earnings import EarningsLedger, EarningsStatus
from app.models.profile import CadreProfile
from app.models.submission import Submission, SubmissionStatus
from app.models.verification import VerificationEvent
from app.services.ai_service import analyze_submission
from app.services.earnings_service import process_submission_earnings
from app.services.notification_service import NotificationEvent, get_notification_service
from app.services.satellite_service import verify_submission
from app.utils.id_generator import generate_transaction_id

logger = logging.getLogger("jal_saheli.services.verification")


async def run_full_verification(
    submission: Submission,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Execute full dual-engine verification pipeline on a submission:
    1. AI Vision analysis
    2. Satellite cross-check
    3. Weighted consensus calculation
    4. Incentive credit if verified
    5. Audit event logging
    """
    # 1. Run AI Vision
    ai_res = await analyze_submission(submission, db)
    ai_conf = ai_res["confidence"]
    ai_status = ai_res.get("status", "AI_OK")

    # 2. Run Satellite Cross-check
    sat_res = await verify_submission(submission, db)
    sat_conf = sat_res["satellite_confidence"]
    sat_status = sat_res.get("status", "SATELLITE_OK")

    # 3. Compute weighted consensus for display (still useful as an overall indicator)
    final_conf = round((0.40 * ai_conf) + (0.60 * sat_conf), 1)
    submission.final_confidence = final_conf

    # 4. Apply defensible verification rules
    reward_earned = 0
    new_status = SubmissionStatus.PENDING
    reason = "Evidence is inconclusive. Requires manual review."

    # Rule 1: Provider Unavailable (PENDING)
    if ai_status != "AI_OK" or sat_status != "SATELLITE_OK":
        new_status = SubmissionStatus.PENDING
        reason = "Insufficient evidence: Provider unavailable or missing data."
    # Rule 2: AI Rejected (REJECTED)
    elif ai_conf < 30.0:
        new_status = SubmissionStatus.REJECTED
        reason = "AI analysis strongly indicates the photo does not match the observation type."
    # Rule 3: Conflicting Evidence (PENDING)
    elif (ai_conf >= 70.0 and sat_conf < 40.0) or (ai_conf < 40.0 and sat_conf >= 70.0):
        new_status = SubmissionStatus.PENDING
        reason = "Conflicting evidence between on-ground photo and satellite imagery. Requires manual review."
    # Rule 4: Dual Confirmation (VERIFIED)
    elif ai_conf >= 60.0 and sat_conf >= 60.0 and final_conf >= 75.0:
        new_status = SubmissionStatus.VERIFIED
        reason = "Dual-engine consensus verified. Evidence matches observation."
    # Rule 5: Default (PENDING) falls through

    submission.rejection_reason = reason if new_status == SubmissionStatus.REJECTED else None

    submission.status = new_status if new_status != SubmissionStatus.PENDING else SubmissionStatus.PROCESSING

    ledger_entry: EarningsLedger | None = None
    if new_status == SubmissionStatus.VERIFIED:
        submission.verified_by = "Automated Pipeline (GeoBrain-v3 + Sentinel-2)"
        submission.verified_at = datetime.now(timezone.utc)
        # Evaluate eligibility and record earnings via EarningsService & EarningsPolicy
        ledger_entry, _ = await process_submission_earnings(submission, db)
        reward_earned = ledger_entry.amount if ledger_entry else 0
    elif new_status == SubmissionStatus.REJECTED:
        submission.verified_by = "Automated Pipeline (GeoBrain-v3 + Sentinel-2)"
        submission.verified_at = datetime.now(timezone.utc)
    else:
        # PENDING / PROCESSING
        submission.verified_by = None
        submission.verified_at = None

    # Load cadre for notifications
    cadre_res = await db.execute(
        select(CadreProfile).where(CadreProfile.id == submission.cadre_id)
    )
    cadre = cadre_res.scalar_one_or_none()
    notif = get_notification_service()

    if cadre:
        if new_status == SubmissionStatus.VERIFIED:
            await notif.notify(
                cadre=cadre,
                event=NotificationEvent.VERIFICATION_COMPLETED,
                submission=submission,
                context={
                    "status": "verified",
                    "ai_score": ai_conf,
                    "sat_score": sat_conf,
                    "final_score": final_conf,
                    "amount": reward_earned,
                    "reason": reason,
                },
            )
            if ledger_entry:
                await notif.notify(
                    cadre=cadre,
                    event=NotificationEvent.EARNING_RECORDED,
                    submission=submission,
                    context={
                        "amount": ledger_entry.amount,
                        "txn_id": ledger_entry.id,
                    },
                )
        elif new_status == SubmissionStatus.REJECTED:
            await notif.notify(
                cadre=cadre,
                event=NotificationEvent.SUBMISSION_REJECTED,
                submission=submission,
                context={
                    "reason": reason,
                    "final_score": final_conf,
                },
            )
        else:
            await notif.notify(
                cadre=cadre,
                event=NotificationEvent.SUBMISSION_PENDING,
                submission=submission,
                context={
                    "reason": reason,
                    "final_score": final_conf,
                },
            )

    final_payload = {
        "submissionId": submission.id,
        "status": submission.status.value,
        "aiConfidence": ai_conf,
        "aiConfidenceDisplay": f"{round(ai_conf)}%",
        "satelliteConfidence": sat_conf,
        "satelliteConfidenceDisplay": f"{round(sat_conf)}%",
        "finalConfidence": final_conf,
        "finalConfidenceDisplay": f"{round(final_conf)}%",
        "reward": reward_earned,
        "rewardDisplay": f"₹{reward_earned}",
        "resultText": reason,
    }

    # Record final audit event
    final_event = VerificationEvent(
        submission_id=submission.id,
        engine="final",
        confidence=final_conf,
        result_json=final_payload,
    )
    db.add(final_event)
    await db.flush()

    logger.info(
        "Verification pipeline complete",
        extra={"submission_id": submission.id, "status": new_status.value, "final_conf": final_conf},
    )

    return final_payload


async def get_latest_verification_result(
    submission: Submission,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Retrieve the latest verification result for a submission.
    If no verification has run yet, triggers it on the fly.
    """
    ev_q = await db.execute(
        select(VerificationEvent)
        .where(VerificationEvent.submission_id == submission.id, VerificationEvent.engine == "final")
        .order_by(VerificationEvent.created_at.desc())
        .limit(1)
    )
    latest_event = ev_q.scalar_one_or_none()
    if latest_event and latest_event.result_json:
        return latest_event.result_json

    # If verification hasn't run yet, run it
    return await run_full_verification(submission, db)
