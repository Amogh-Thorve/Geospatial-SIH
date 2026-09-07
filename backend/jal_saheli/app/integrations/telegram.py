"""Telegram bot provider boundary. No live Telegram traffic in the MVP."""

from __future__ import annotations

from typing import Any, Protocol

from app.config import get_settings


class TelegramBotProvider(Protocol):
    name: str
    live: bool

    def status(self) -> dict[str, Any]:
        ...


class LocalTelegramBotProvider:
    name = "LocalTelegramBotProvider"
    live = False

    def status(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "live": False,
            "detail": "Local adapter only. No Telegram bot token is used.",
        }


class LiveTelegramBotProvider:
    name = "LiveTelegramBotProvider"
    live = True

    def status(self) -> dict[str, Any]:
        settings = get_settings()
        return {
            "provider": self.name,
            "live": bool(settings.telegram.configured),
            "detail": "Would post to Telegram when TELEGRAM_BOT_TOKEN is configured.",
        }


def get_telegram_provider() -> TelegramBotProvider:
    settings = get_settings()
    if settings.telegram.configured:
        return LiveTelegramBotProvider()
    return LocalTelegramBotProvider()
