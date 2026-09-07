"""
app/integrations/telegram_bot.py
Real Telegram Bot integration handler for Jal Saheli field cadre observations.

Implements a stateful conversation flow:
  /start → Language selection → Photo → Location → Description → Submission → Verification

State machine:
  IDLE → AWAITING_LANGUAGE → AWAITING_PHOTO → AWAITING_LOCATION → AWAITING_DESCRIPTION → IDLE

Supports: English (en), Hindi (hi), Marathi (mr)

Security:
  - Duplicate update_id suppression
  - Input validation on coordinates and photos
  - Magic byte verification on downloaded images
  - Rate limiting via webhook endpoint dependency

IMPORTANT: If TELEGRAM_BOT_TOKEN is not configured, the bot processes
updates internally (DB writes, verification) but NEVER pretends that
external Telegram message delivery succeeded.
"""
from __future__ import annotations

import collections
import logging
import time
from enum import Enum
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.integrations.telegram_client import get_telegram_client
from app.models.profile import CadreProfile
from app.models.submission import Submission, SubmissionStatus, OBSERVATION_TYPE_LABELS
from app.services import profile_service, verification_service
from app.utils.id_generator import generate_submission_id
from app.utils.storage import check_image_magic_bytes, save_photo, ALLOWED_EXTENSIONS
from app.utils.telegram_i18n import (
    get_msg,
    format_verification_reply,
    format_status_reply,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
)

logger = logging.getLogger("jal_saheli.integrations.telegram")


# ─────────────────────────────────────────────────────────────────────────────
# Conversation states
# ─────────────────────────────────────────────────────────────────────────────

class ConvState(str, Enum):
    IDLE = "idle"
    AWAITING_LANGUAGE = "awaiting_language"
    AWAITING_PHOTO = "awaiting_photo"
    AWAITING_LOCATION = "awaiting_location"
    AWAITING_DESCRIPTION = "awaiting_description"


class UserSession:
    """Per-user conversation session with TTL."""

    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        self.state: ConvState = ConvState.IDLE
        self.lang: str = lang
        self.photo_bytes: bytes | None = None
        self.photo_file_id: str | None = None
        self.photo_ext: str = ".jpg"
        self.latitude: float | None = None
        self.longitude: float | None = None
        self.last_active: float = time.time()

    def reset(self, keep_lang: bool = True) -> None:
        lang = self.lang if keep_lang else DEFAULT_LANGUAGE
        self.state = ConvState.IDLE
        self.lang = lang
        self.photo_bytes = None
        self.photo_file_id = None
        self.photo_ext = ".jpg"
        self.latitude = None
        self.longitude = None
        self.last_active = time.time()

    def touch(self) -> None:
        self.last_active = time.time()


# ─────────────────────────────────────────────────────────────────────────────
# Session store & duplicate suppression
# ─────────────────────────────────────────────────────────────────────────────

SESSION_TTL_SECONDS = 1800  # 30 minutes
MAX_SESSIONS = 10000
DEDUP_CACHE_SIZE = 5000

_sessions: dict[int, UserSession] = {}
_processed_updates: collections.OrderedDict[int, float] = collections.OrderedDict()
_background_tasks: set[asyncio.Task] = set()


def _get_session(user_id: int, lang: str = DEFAULT_LANGUAGE) -> UserSession:
    """Get or create a user session, pruning expired entries."""
    now = time.time()
    session = _sessions.get(user_id)
    if session and (now - session.last_active) > SESSION_TTL_SECONDS:
        session.reset(keep_lang=True)
    if session is None:
        if len(_sessions) >= MAX_SESSIONS:
            oldest_key = min(_sessions, key=lambda k: _sessions[k].last_active)
            del _sessions[oldest_key]
        session = UserSession(lang=lang)
        _sessions[user_id] = session
    session.touch()
    return session


def _is_duplicate_update(update_id: int) -> bool:
    """Check and record update_id for duplicate suppression."""
    if update_id in _processed_updates:
        return True
    _processed_updates[update_id] = time.time()
    while len(_processed_updates) > DEDUP_CACHE_SIZE:
        _processed_updates.popitem(last=False)
    return False


def clear_sessions() -> None:
    """Clear all sessions and dedup cache (for testing)."""
    _sessions.clear()
    _processed_updates.clear()
    for t in list(_background_tasks):
        t.cancel()
    _background_tasks.clear()


async def wait_for_background_tasks(timeout: float = 5.0) -> None:
    """Wait for all pending background verification tasks to complete (for tests/shutdown)."""
    if _background_tasks:
        done, pending = await asyncio.wait(list(_background_tasks), timeout=timeout)
        for t in pending:
            t.cancel()
        _background_tasks.clear()


# ─────────────────────────────────────────────────────────────────────────────
# Cadre user mapping
# ─────────────────────────────────────────────────────────────────────────────

async def get_or_create_cadre_from_telegram(
    user_id: int,
    username: str | None,
    first_name: str,
    db: AsyncSession,
) -> CadreProfile:
    """
    Find cadre by telegram_user_id (primary) or telegram_handle (fallback),
    or create a new CadreProfile.
    """
    # Primary lookup: telegram_user_id
    res = await db.execute(
        select(CadreProfile).where(CadreProfile.telegram_user_id == user_id)
    )
    cadre = res.scalar_one_or_none()
    if cadre:
        return cadre

    # Fallback: telegram_handle (only link if not already linked to another user)
    handle = f"@{username}" if username else f"tg_{user_id}"
    if username:
        res = await db.execute(
            select(CadreProfile).where(
                CadreProfile.telegram_handle == handle,
                CadreProfile.telegram_user_id.is_(None),
            )
        )
        cadre = res.scalar_one_or_none()
        if cadre:
            cadre.telegram_user_id = user_id
            await db.flush()
            return cadre

    # Create new cadre profile
    phone = f"+91tg{user_id % 10000000000:010d}"
    cadre = CadreProfile(
        name=first_name or f"Jal Saheli ({handle})",
        phone=phone,
        telegram_handle=handle,
        telegram_user_id=user_id,
        village="Field Area",
        preferred_language=DEFAULT_LANGUAGE,
    )
    db.add(cadre)
    await db.flush()
    await db.refresh(cadre)
    return cadre


# ─────────────────────────────────────────────────────────────────────────────
# Observation type detection from text
# ─────────────────────────────────────────────────────────────────────────────

def _detect_observation_type(text: str) -> str:
    """Detect observation type from user's text description."""
    t = text.lower()
    if "check dam" in t or "dam" in t or "चेक डैम" in t or "चेक डॅम" in t:
        return "check_dam"
    if "pond" in t or "farm pond" in t or "तालाब" in t or "शेततळे" in t:
        return "farm_pond"
    if "borewell" in t or "bore" in t or "well" in t or "बोरवेल" in t or "बोअरवेल" in t:
        return "borewell"
    if "quality" in t or "गुणवत्ता" in t:
        return "water_quality"
    if "trench" in t or "contour" in t:
        return "contour_trench"
    if "gully" in t or "plug" in t:
        return "gully_plug"
    if "percolation" in t or "tank" in t:
        return "percolation_tank"
    if "irrigation" in t or "सिंचाई" in t:
        return "irrigation"
    if "groundwater" in t or "भूजल" in t:
        return "groundwater"
    return "water_body"


# ─────────────────────────────────────────────────────────────────────────────
# Main update handler
# ─────────────────────────────────────────────────────────────────────────────

async def handle_telegram_update(
    update: dict[str, Any],
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Process incoming Telegram Update JSON.

    Returns a dict with:
      - status: "handled" | "ignored" | "duplicate"
      - reply: str (the text we attempt to send back)
      - external_delivery: dict from TelegramClient.send_message
      - Additional fields depending on the action
    """
    # ── Duplicate suppression ─────────────────────────────────────────────
    update_id = update.get("update_id")
    if update_id is not None and _is_duplicate_update(update_id):
        logger.info("Duplicate update_id suppressed", extra={"update_id": update_id})
        return {"status": "duplicate", "update_id": update_id}

    # ── Extract message ───────────────────────────────────────────────────
    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"status": "ignored", "reason": "no_message"}

    user = message.get("from", {})
    user_id = user.get("id")
    chat_id = message.get("chat", {}).get("id")
    if not user_id or not chat_id:
        return {"status": "ignored", "reason": "no_user_id_or_chat_id"}

    username = user.get("username")
    first_name = user.get("first_name", "Jal Saheli")
    text = (message.get("text") or message.get("caption") or "").strip()

    # ── Resolve cadre ─────────────────────────────────────────────────────
    cadre = await get_or_create_cadre_from_telegram(user_id, username, first_name, db)
    session = _get_session(user_id, lang=cadre.preferred_language)
    tg = get_telegram_client()

    # ── Command: /cancel ──────────────────────────────────────────────────
    if text.startswith("/cancel"):
        session.reset(keep_lang=True)
        reply = get_msg("cancelled", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "command": "cancel", "reply": reply, "external_delivery": delivery}

    # ── Command: /help ────────────────────────────────────────────────────
    if text.startswith("/help"):
        reply = get_msg("help_message", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "command": "help", "reply": reply, "external_delivery": delivery}

    # ── Command: /lang (change language) ──────────────────────────────────
    if text.startswith("/lang"):
        # Direct language selection: /lang_en, /lang_hi, /lang_mr
        lang_code = text.removeprefix("/lang").strip("_ ")
        if lang_code in SUPPORTED_LANGUAGES:
            session.lang = lang_code
            cadre.preferred_language = lang_code
            await db.flush()
            reply = get_msg("language_selected", lang_code)
            session.state = ConvState.AWAITING_PHOTO
            delivery = await tg.send_message(chat_id, reply)
            return {"status": "handled", "command": "lang_set", "lang": lang_code, "reply": reply, "external_delivery": delivery}
        # Show language selection
        session.state = ConvState.AWAITING_LANGUAGE
        reply = get_msg("welcome_choose_language", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "command": "lang_prompt", "reply": reply, "external_delivery": delivery}

    # ── Command: /start ───────────────────────────────────────────────────
    if text.startswith("/start"):
        session.reset(keep_lang=True)
        session.state = ConvState.AWAITING_LANGUAGE
        reply = get_msg("welcome_choose_language", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "command": "start", "reply": reply, "external_delivery": delivery}

    # ── Command: /status ──────────────────────────────────────────────────
    if text.startswith("/status"):
        prof = await profile_service.get_profile(cadre, db)
        reply = format_status_reply(
            cadre_name=cadre.name,
            total=prof.stats.total_submissions,
            verified=prof.stats.verified_count,
            pending=prof.stats.pending_count,
            accuracy=prof.stats.accuracy_rate,
            total_earnings=prof.stats.total_earnings_raw,
            lang=session.lang,
        )
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "command": "status", "reply": reply, "external_delivery": delivery}

    # ── State: AWAITING_LANGUAGE ──────────────────────────────────────────
    if session.state == ConvState.AWAITING_LANGUAGE:
        # Check for inline lang commands in plain text
        lang_code = None
        t_lower = text.lower()
        if "/lang_en" in t_lower or "english" in t_lower or t_lower == "en":
            lang_code = "en"
        elif "/lang_hi" in t_lower or "hindi" in t_lower or "हिंदी" in t_lower or t_lower == "hi":
            lang_code = "hi"
        elif "/lang_mr" in t_lower or "marathi" in t_lower or "मराठी" in t_lower or t_lower == "mr":
            lang_code = "mr"

        if lang_code:
            session.lang = lang_code
            cadre.preferred_language = lang_code
            await db.flush()
            session.state = ConvState.AWAITING_PHOTO
            reply = get_msg("language_selected", lang_code)
            delivery = await tg.send_message(chat_id, reply)
            return {"status": "handled", "action": "language_set", "lang": lang_code, "reply": reply, "external_delivery": delivery}

        # Unrecognized input — re-prompt
        reply = get_msg("welcome_choose_language", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "action": "lang_reprompt", "reply": reply, "external_delivery": delivery}

    # ── State: AWAITING_PHOTO (or any state when a photo arrives) ─────────
    photos = message.get("photo")
    if photos:
        # Telegram sends photos as array of PhotoSize; pick largest
        best_photo = photos[-1]
        file_id = best_photo.get("file_id", "")

        # Download real photo bytes if bot is configured
        photo_bytes: bytes | None = None
        if tg.configured:
            photo_bytes = await tg.download_file(file_id)
            if photo_bytes and not check_image_magic_bytes(photo_bytes):
                reply = get_msg("invalid_photo", session.lang)
                delivery = await tg.send_message(chat_id, reply)
                return {"status": "handled", "action": "invalid_photo_magic", "reply": reply, "external_delivery": delivery}
        else:
            # In test/dev mode without real token, store file_id reference
            logger.info("Bot unconfigured — storing file_id reference without download", extra={"file_id": file_id})

        session.photo_bytes = photo_bytes
        session.photo_file_id = file_id
        session.state = ConvState.AWAITING_LOCATION
        reply = get_msg("photo_received_send_location", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "action": "photo_received", "file_id": file_id, "reply": reply, "external_delivery": delivery}

    # ── State: AWAITING_LOCATION ──────────────────────────────────────────
    location = message.get("location")
    if location and session.state == ConvState.AWAITING_LOCATION:
        lat = location.get("latitude")
        lng = location.get("longitude")

        if lat is None or lng is None or not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            reply = get_msg("invalid_location", session.lang)
            delivery = await tg.send_message(chat_id, reply)
            return {"status": "handled", "action": "invalid_location", "reply": reply, "external_delivery": delivery}

        session.latitude = float(lat)
        session.longitude = float(lng)
        session.state = ConvState.AWAITING_DESCRIPTION
        reply = get_msg("location_received_send_notes", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "action": "location_received", "lat": session.latitude, "lng": session.longitude, "reply": reply, "external_delivery": delivery}

    # ── State: AWAITING_DESCRIPTION (or /skip) ────────────────────────────
    if session.state == ConvState.AWAITING_DESCRIPTION:
        description = text if text and not text.startswith("/skip") else "Submitted via Telegram bot"
        obs_type = _detect_observation_type(description)
        type_label = OBSERVATION_TYPE_LABELS.get(obs_type, obs_type.replace("_", " ").title())

        # Send processing message
        processing_reply = get_msg("processing_observation", session.lang)
        await tg.send_message(chat_id, processing_reply)

        # ── Save photo if we have bytes ───────────────────────────────────
        settings = get_settings()
        sub_id = generate_submission_id()
        photo_url: str | None = None

        if session.photo_bytes:
            try:
                from io import BytesIO
                from fastapi import UploadFile

                bio = BytesIO(session.photo_bytes)
                upload = UploadFile(file=bio, filename=f"telegram_{sub_id}.jpg", headers={"content-type": "image/jpeg"})
                photo_url, _ = await save_photo(
                    file=upload,
                    cadre_id=cadre.id,
                    submission_id=sub_id,
                    base_dir=settings.storage.local_dir,
                    max_bytes=settings.storage.max_photo_size_bytes,
                )
            except ValueError as exc:
                logger.warning("Photo save failed", extra={"error": str(exc)})
                photo_url = f"telegram://{session.photo_file_id}" if session.photo_file_id else None
        elif session.photo_file_id:
            photo_url = f"telegram://{session.photo_file_id}"

        # ── Create real Submission ────────────────────────────────────────
        sub = Submission(
            id=sub_id,
            cadre_id=cadre.id,
            observation_type=obs_type,
            type_label=type_label,
            description=description,
            latitude=session.latitude,
            longitude=session.longitude,
            photo_url=photo_url,
            channel="telegram",
            status=SubmissionStatus.PENDING,
        )
        db.add(sub)
        await db.flush()

        # ── Spawn real verification pipeline in background ──────────────────
        import asyncio
        from app.services.notification_service import NotificationEvent, get_notification_service

        # Notify submission received
        notif = get_notification_service()
        await notif.notify(cadre, NotificationEvent.SUBMISSION_RECEIVED, sub)

        async def _background_verification(sub_id_to_verify: str, chat_id_to_reply: int, session_lang: str):
            from app.db.database import get_async_sessionmaker
            from sqlalchemy.ext.asyncio import AsyncSession
            from app.models.submission import Submission
            from app.models.profile import CadreProfile
            from sqlalchemy import select

            SessionLocal = get_async_sessionmaker()
            if not SessionLocal:
                return

            try:
                async with SessionLocal() as bg_db:
                    bg_sub = (await bg_db.execute(select(Submission).where(Submission.id == sub_id_to_verify))).scalar_one_or_none()
                    if not bg_sub:
                        return

                    bg_cadre = (await bg_db.execute(select(CadreProfile).where(CadreProfile.id == bg_sub.cadre_id))).scalar_one_or_none()
                    if bg_cadre:
                        await notif.notify(bg_cadre, NotificationEvent.PROCESSING_STARTED, bg_sub)

                    bg_ver_result = await verification_service.run_full_verification(bg_sub, bg_db)
                    await bg_db.commit()
            except Exception as exc:
                logger.error("Background verification failed", extra={"error": str(exc), "submission_id": sub_id_to_verify})

        bg_task = asyncio.create_task(_background_verification(sub.id, chat_id, session.lang))
        _background_tasks.add(bg_task)
        bg_task.add_done_callback(_background_tasks.discard)

        # ── Format and send immediate processing message ──────────────────
        reply = get_msg("processing_observation", session.lang)
        delivery = await tg.send_message(chat_id, reply)

        # Reset session for next observation
        session.reset(keep_lang=True)

        return {
            "status": "handled",
            "action": "submission_created",
            "submission_id": sub.id,
            "observation_type": obs_type,
            "reply": reply,
            "external_delivery": delivery,
        }

    # ── State: AWAITING_PHOTO but user sent text instead ──────────────────
    if session.state == ConvState.AWAITING_PHOTO:
        reply = get_msg("send_photo_prompt", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "action": "photo_reprompt", "reply": reply, "external_delivery": delivery}

    # ── State: AWAITING_LOCATION but user sent text instead ───────────────
    if session.state == ConvState.AWAITING_LOCATION and not location:
        reply = get_msg("photo_received_send_location", session.lang)
        delivery = await tg.send_message(chat_id, reply)
        return {"status": "handled", "action": "location_reprompt", "reply": reply, "external_delivery": delivery}

    # ── Unrecognized input in IDLE state ──────────────────────────────────
    reply = get_msg("help_message", session.lang)
    delivery = await tg.send_message(chat_id, reply)
    return {"status": "handled", "action": "help_fallback", "reply": reply, "external_delivery": delivery}
