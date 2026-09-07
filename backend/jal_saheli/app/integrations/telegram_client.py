"""
app/integrations/telegram_client.py
Real asynchronous Telegram Bot API client.

Handles:
  - send_message: text replies with optional parse_mode and reply_markup
  - get_file / download_file: download photo bytes from Telegram servers
  - set_webhook: register webhook URL with Telegram

CRITICAL: If TELEGRAM_BOT_TOKEN is not configured, every outbound method
logs a clear configuration error and returns a failure indicator.
It NEVER pretends that external delivery succeeded.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("jal_saheli.integrations.telegram_client")

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramClient:
    """
    Async wrapper around the Telegram Bot HTTP API.
    All methods require a valid bot token from settings.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._token = settings.telegram.bot_token
        self._configured = settings.telegram.configured

    @property
    def configured(self) -> bool:
        return self._configured

    @property
    def _base_url(self) -> str:
        return f"{TELEGRAM_API_BASE}/bot{self._token}"

    # ─────────────────────────────────────────────────────────────────────────
    # Send message
    # ─────────────────────────────────────────────────────────────────────────

    async def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: str = "Markdown",
        reply_markup: dict | None = None,
    ) -> dict[str, Any]:
        """
        Send a text message to a Telegram chat.
        Returns the Telegram API response dict, or a failure stub if unconfigured.
        """
        if not self._configured:
            logger.warning(
                "Telegram bot not configured — message NOT delivered externally",
                extra={"chat_id": chat_id, "text_preview": text[:80]},
            )
            return {
                "ok": False,
                "delivered": False,
                "reason": "unconfigured_bot_token",
                "chat_id": chat_id,
                "text": text,
            }

        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(f"{self._base_url}/sendMessage", json=payload)
                data = resp.json()
                if not data.get("ok"):
                    logger.error("Telegram sendMessage failed", extra={"response": data})
                return data
        except Exception as exc:
            logger.error("Telegram sendMessage HTTP error", extra={"error": str(exc)})
            return {"ok": False, "delivered": False, "reason": "http_error", "error": str(exc)}

    # ─────────────────────────────────────────────────────────────────────────
    # Get file path
    # ─────────────────────────────────────────────────────────────────────────

    async def get_file_path(self, file_id: str) -> str | None:
        """
        Call Telegram getFile to retrieve the file_path for downloading.
        Returns None if unconfigured or on API error.
        """
        if not self._configured:
            logger.warning("Telegram bot not configured — cannot getFile")
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{self._base_url}/getFile",
                    params={"file_id": file_id},
                )
                data = resp.json()
                if data.get("ok"):
                    return data["result"].get("file_path")
                logger.error("Telegram getFile failed", extra={"response": data})
                return None
        except Exception as exc:
            logger.error("Telegram getFile HTTP error", extra={"error": str(exc)})
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Download file bytes
    # ─────────────────────────────────────────────────────────────────────────

    async def download_file(self, file_id: str) -> bytes | None:
        """
        Download raw file bytes from Telegram servers.
        Returns None if unconfigured, if getFile fails, or on download error.
        """
        if not self._configured:
            logger.warning("Telegram bot not configured — cannot download file")
            return None

        file_path = await self.get_file_path(file_id)
        if not file_path:
            return None

        download_url = f"{TELEGRAM_API_BASE}/file/bot{self._token}/{file_path}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(download_url)
                if resp.status_code == 200:
                    logger.info(
                        "Telegram photo downloaded",
                        extra={"file_id": file_id, "size_bytes": len(resp.content)},
                    )
                    return resp.content
                logger.error(
                    "Telegram file download failed",
                    extra={"file_id": file_id, "status": resp.status_code},
                )
                return None
        except Exception as exc:
            logger.error(
                "Telegram file download HTTP error",
                extra={"file_id": file_id, "error": str(exc)},
            )
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Set webhook
    # ─────────────────────────────────────────────────────────────────────────

    async def set_webhook(self, url: str, secret_token: str = "") -> dict[str, Any]:
        """
        Register a webhook URL with the Telegram Bot API.
        """
        if not self._configured:
            logger.warning("Telegram bot not configured — cannot set webhook")
            return {"ok": False, "reason": "unconfigured_bot_token"}

        payload: dict[str, Any] = {"url": url}
        if secret_token:
            payload["secret_token"] = secret_token

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(f"{self._base_url}/setWebhook", json=payload)
                data = resp.json()
                logger.info("Telegram setWebhook result", extra={"response": data})
                return data
        except Exception as exc:
            logger.error("Telegram setWebhook HTTP error", extra={"error": str(exc)})
            return {"ok": False, "reason": "http_error", "error": str(exc)}


# Module-level singleton (lazy-init safe)
_client: TelegramClient | None = None


def get_telegram_client() -> TelegramClient:
    """Return or create the global TelegramClient singleton."""
    global _client
    if _client is None:
        _client = TelegramClient()
    return _client


def reset_telegram_client() -> None:
    """Reset client singleton (used in tests after config changes)."""
    global _client
    _client = None
