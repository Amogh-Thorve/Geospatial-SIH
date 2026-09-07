"""
tests/test_telegram.py
Tests for Telegram Bot webhook integration:
  POST /telegram/webhook
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from app.integrations.telegram_bot import clear_sessions
from app.integrations.ai_provider import AIAnalysisResult, AIProvider
from app.integrations.ai_client import reset_ai_provider, set_ai_provider


class _TelegramTestAIProvider(AIProvider):
    """Mock AI provider for Telegram integration tests."""
    def is_configured(self) -> bool:
        return True

    async def analyze(self, submission_id, observation_type, photo_url, latitude, longitude, description, photo_bytes=None) -> AIAnalysisResult:
        return AIAnalysisResult(
            submission_id=submission_id,
            provider="telegram_test",
            model="geobrain-v3-test",
            result="WATER_FEATURE_CONFIRMED",
            confidence=91.0,
            detected_features=["Water boundary", "Structure integrity"],
            observations=["Ground water feature verified"],
        )


class TestTelegramWebhook:
    @pytest.fixture(autouse=True)
    def clean_sessions(self):
        clear_sessions()
        set_ai_provider(_TelegramTestAIProvider())
        yield
        clear_sessions()
        reset_ai_provider()

    @pytest.mark.asyncio
    async def test_telegram_start_command(self, client: AsyncClient):
        update = {
            "update_id": 10001,
            "message": {
                "message_id": 1,
                "from": {"id": 123456789, "first_name": "Pooja", "username": "pooja_jal"},
                "chat": {"id": 123456789, "type": "private"},
                "date": 1725680000,
                "text": "/start",
            },
        }
        res = await client.post("/telegram/webhook", json=update)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["result"]["command"] == "start"
        assert "Namaste" in data["result"]["reply"]
        assert "/lang_en" in data["result"]["reply"]

    @pytest.mark.asyncio
    async def test_telegram_status_command(self, client: AsyncClient):
        update = {
            "update_id": 10002,
            "message": {
                "message_id": 2,
                "from": {"id": 123456789, "first_name": "Pooja", "username": "pooja_jal"},
                "chat": {"id": 123456789, "type": "private"},
                "date": 1725680001,
                "text": "/status",
            },
        }
        res = await client.post("/telegram/webhook", json=update)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["result"]["command"] == "status"
        assert "Status Report" in data["result"]["reply"]
        assert "Pooja" in data["result"]["reply"]

    @pytest.mark.asyncio
    async def test_telegram_photo_observation_submission(self, client: AsyncClient):
        uid = 987654321
        # Step 1: /start
        await client.post("/telegram/webhook", json={
            "update_id": 10003,
            "message": {
                "message_id": 3,
                "from": {"id": uid, "first_name": "Rekha", "username": "rekha_jal"},
                "chat": {"id": uid, "type": "private"},
                "date": 1725680002,
                "text": "/start",
            },
        })
        # Step 2: Language
        await client.post("/telegram/webhook", json={
            "update_id": 10004,
            "message": {
                "message_id": 4,
                "from": {"id": uid, "first_name": "Rekha", "username": "rekha_jal"},
                "chat": {"id": uid, "type": "private"},
                "date": 1725680003,
                "text": "/lang_en",
            },
        })
        # Step 3: Photo
        photo_res = await client.post("/telegram/webhook", json={
            "update_id": 10005,
            "message": {
                "message_id": 5,
                "from": {"id": uid, "first_name": "Rekha", "username": "rekha_jal"},
                "chat": {"id": uid, "type": "private"},
                "date": 1725680004,
                "photo": [
                    {"file_id": "thumb_123", "file_size": 1024, "width": 100, "height": 100},
                    {"file_id": "full_photo_456", "file_size": 204800, "width": 1080, "height": 1080},
                ],
            },
        })
        assert photo_res.status_code == 200
        assert photo_res.json()["result"]["action"] == "photo_received"

        # Step 4: Location
        loc_res = await client.post("/telegram/webhook", json={
            "update_id": 10006,
            "message": {
                "message_id": 6,
                "from": {"id": uid, "first_name": "Rekha", "username": "rekha_jal"},
                "chat": {"id": uid, "type": "private"},
                "date": 1725680005,
                "location": {
                    "latitude": 24.5854,
                    "longitude": 73.7125,
                },
            },
        })
        assert loc_res.status_code == 200
        assert loc_res.json()["result"]["action"] == "location_received"

        # Step 5: Description
        desc_res = await client.post("/telegram/webhook", json={
            "update_id": 10007,
            "message": {
                "message_id": 7,
                "from": {"id": uid, "first_name": "Rekha", "username": "rekha_jal"},
                "chat": {"id": uid, "type": "private"},
                "date": 1725680006,
                "text": "Masonry check dam water storage",
            },
        })
        assert desc_res.status_code == 200
        data = desc_res.json()
        assert data["ok"] is True
        assert data["result"]["status"] == "handled"
        assert data["result"]["action"] == "submission_created"
        assert data["result"]["submission_id"].startswith("GW-")
        # When AI is configured the reply should contain confidence info
        reply = data["result"]["reply"]
        assert data["result"]["submission_id"] is not None
        # The submission was created and a result reply was sent — verify
        assert "GW-" in reply or "Confidence" in reply or "Observation" in reply

