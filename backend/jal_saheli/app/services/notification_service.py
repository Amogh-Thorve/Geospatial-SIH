"""
app/services/notification_service.py
Multi-lingual cadre notification service.

Dispatches notifications for lifecycle events:
  - Submission received
  - Processing started
  - Verification completed
  - Submission pending
  - Submission rejected
  - Earning recorded

Reliability:
  - Supports English ('en'), Hindi ('hi'), and Marathi ('mr').
  - Resolves language from CadreProfile.preferred_language.
  - Safe failure handling: Notification delivery failures NEVER abort database transactions.
"""
from __future__ import annotations

import enum
import logging
from typing import Any

from app.integrations.telegram_client import get_telegram_client
from app.models.profile import CadreProfile
from app.models.submission import Submission
from app.utils.telegram_i18n import (
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    format_notification,
    format_verification_reply,
)

logger = logging.getLogger("jal_saheli.services.notification")


class NotificationEvent(str, enum.Enum):
    SUBMISSION_RECEIVED = "submission_received"
    PROCESSING_STARTED = "processing_started"
    VERIFICATION_COMPLETED = "verification_completed"
    SUBMISSION_PENDING = "submission_pending"
    SUBMISSION_REJECTED = "submission_rejected"
    EARNING_RECORDED = "earning_recorded"


class NotificationService:
    """Dispatches localized alerts and status updates to field cadres."""

    def __init__(self) -> None:
        pass

    async def notify(
        self,
        cadre: CadreProfile | None,
        event: NotificationEvent,
        submission: Submission | None = None,
        context: dict[str, Any] | None = None,
    ) -> bool:
        """
        Send a notification for a lifecycle event.

        Args:
            cadre: Target CadreProfile
            event: Lifecycle event enum
            submission: Optional Submission object
            context: Additional parameters (e.g. amount, txn_id, reason, scores)

        Returns:
            True if delivered successfully, False otherwise.
            NEVER raises an exception (safe for background/critical flows).
        """
        if not cadre:
            logger.debug("No cadre provided for notification", extra={"event": event.value})
            return False

        # Resolve target language
        lang = cadre.preferred_language if cadre.preferred_language in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
        ctx = context or {}

        sub_id = ctx.get("sub_id") or (submission.id if submission else "")
        type_label = ctx.get("type_label") or (submission.type_label if submission else "")
        reason = ctx.get("reason", "")
        amount = ctx.get("amount", 0)
        txn_id = ctx.get("txn_id", "")

        # Format message based on event
        msg_text: str = ""
        if event == NotificationEvent.VERIFICATION_COMPLETED:
            msg_text = format_verification_reply(
                sub_id=sub_id,
                type_label=type_label,
                status=ctx.get("status", "pending"),
                ai_score=ctx.get("ai_score", 0.0),
                sat_score=ctx.get("sat_score", 0.0),
                final_score=ctx.get("final_score", 0.0),
                reward_amount=amount,
                rejection_reason=reason,
                lang=lang,
            )
        else:
            event_key = f"notif_{event.value}"
            msg_text = format_notification(
                event_key=event_key,
                lang=lang,
                sub_id=sub_id,
                type_label=type_label,
                amount=amount,
                txn_id=txn_id,
                reason=reason,
            )

        if not msg_text:
            logger.warning("Empty notification text generated", extra={"event": event.value, "lang": lang})
            return False

        # Dispatch via Telegram if user ID is available
        if cadre.telegram_user_id:
            try:
                tg = get_telegram_client()
                delivery = await tg.send_message(cadre.telegram_user_id, msg_text)
                if delivery.get("status") == "delivered":
                    logger.info(
                        "Notification delivered to cadre via Telegram",
                        extra={
                            "cadre_id": cadre.id,
                            "event": event.value,
                            "telegram_user_id": cadre.telegram_user_id,
                            "lang": lang,
                        },
                    )
                    return True
                else:
                    logger.warning(
                        "Telegram notification delivery unsuccessful",
                        extra={
                            "cadre_id": cadre.id,
                            "event": event.value,
                            "delivery_result": delivery,
                        },
                    )
                    return False
            except Exception as exc:
                # Reliability requirement: network/bot failures must NEVER abort caller
                logger.error(
                    "Failed to dispatch Telegram notification",
                    extra={
                        "cadre_id": cadre.id,
                        "event": event.value,
                        "error": str(exc),
                    },
                )
                return False

        logger.info(
            "Cadre has no active Telegram user ID; notification recorded in log only",
            extra={"cadre_id": cadre.id, "event": event.value},
        )
        return False


_notification_service_instance: NotificationService | None = None


def get_notification_service() -> NotificationService:
    global _notification_service_instance
    if _notification_service_instance is None:
        _notification_service_instance = NotificationService()
    return _notification_service_instance


def set_notification_service(service: NotificationService) -> None:
    global _notification_service_instance
    _notification_service_instance = service


def reset_notification_service() -> None:
    global _notification_service_instance
    _notification_service_instance = None
