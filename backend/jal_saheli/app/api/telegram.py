"""
app/api/telegram.py
Telegram webhook endpoint for receiving Telegram Bot updates.
"""
from __future__ import annotations

import hmac
import logging
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db_session
from app.integrations import telegram_bot

logger = logging.getLogger("jal_saheli.api.telegram")

router = APIRouter(prefix="/telegram", tags=["Telegram"])


@router.post(
    "/webhook",
    summary="Receive Telegram Bot update webhook",
)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """
    Webhook handler invoked by Telegram Bot API on new updates.
    Processes commands (/start, /help, /status) and media submissions (photos & location).
    Enforces constant-time validation of X-Telegram-Bot-Api-Secret-Token.
    """
    settings = get_settings()

    # If secret token is configured, enforce strict constant-time matching
    if settings.telegram.webhook_secret:
        if not x_telegram_bot_api_secret_token or not hmac.compare_digest(
            x_telegram_bot_api_secret_token, settings.telegram.webhook_secret
        ):
            logger.warning(
                "Telegram webhook unauthorized secret token mismatch",
                extra={"provided_header": bool(x_telegram_bot_api_secret_token)},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "unauthorized", "message": "Invalid or missing webhook secret token"},
            )

    try:
        update_data = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_json", "message": str(exc)},
        ) from exc

    result = await telegram_bot.handle_telegram_update(update_data, db)
    return {"ok": True, "result": result}
