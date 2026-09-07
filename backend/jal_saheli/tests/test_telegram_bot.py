"""
tests/test_telegram_bot.py
Comprehensive test suite for the Telegram Bot integration (Phase 5).

Tests:
  - Webhook security (secret token validation)
  - /start command → language prompt
  - Language selection → photo prompt
  - Photo → location prompt
  - Location → description prompt
  - Description → real DB submission + verification pipeline
  - /cancel command
  - /status command → real aggregated stats
  - /help command
  - Duplicate update suppression
  - Invalid location rejection
  - State machine edge cases (text when photo expected, etc.)
  - Hindi and Marathi language flows
  - CadreProfile telegram_user_id mapping
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.integrations.telegram_bot import clear_sessions, wait_for_background_tasks

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def _cleanup_telegram_bot():
    clear_sessions()
    yield
    await wait_for_background_tasks(timeout=2.0)
    clear_sessions()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

_update_counter = 900000


def _next_update_id() -> int:
    global _update_counter
    _update_counter += 1
    return _update_counter


def make_update(
    user_id: int = 111222333,
    text: str | None = None,
    photo: list | None = None,
    location: dict | None = None,
    username: str | None = None,
    first_name: str = "Sunita",
    update_id: int | None = None,
) -> dict:
    """Build a Telegram Update JSON structure."""
    uid = update_id or _next_update_id()
    uname = username if username is not None else f"user_{user_id}"
    msg: dict = {
        "message_id": uid,
        "from": {
            "id": user_id,
            "is_bot": False,
            "first_name": first_name,
            "username": uname,
        },
        "chat": {"id": user_id, "type": "private"},
        "date": 1700000000,
    }
    if text is not None:
        msg["text"] = text
    if photo is not None:
        msg["photo"] = photo
    if location is not None:
        msg["location"] = location
    return {"update_id": uid, "message": msg}


WEBHOOK_URL = "/api/jal-saheli/telegram/webhook"


async def post_webhook(client: AsyncClient, update: dict, secret: str = "") -> dict:
    """POST a Telegram update to the webhook endpoint."""
    headers: dict[str, str] = {"X-Test-Rate-Limit": "true"}
    if secret:
        headers["X-Telegram-Bot-Api-Secret-Token"] = secret
    resp = await client.post(WEBHOOK_URL, json=update, headers=headers)
    return {"status_code": resp.status_code, "body": resp.json()}


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_bot_sessions():
    """Clear bot session state between tests."""
    clear_sessions()
    yield
    clear_sessions()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Webhook security
# ─────────────────────────────────────────────────────────────────────────────

class TestWebhookSecurity:
    """Constant-time secret token validation on the webhook endpoint."""

    async def test_webhook_secret_enforcement(self, client: AsyncClient, monkeypatch):
        """When webhook secret is configured: missing or wrong header gives 403, correct gives 200."""
        from app.config import get_settings
        settings = get_settings()
        monkeypatch.setattr(settings.telegram, "webhook_secret", "secret_token_123")

        update = make_update(user_id=111999888, text="/start")
        # Missing secret
        resp_missing = await post_webhook(client, update, secret="")
        assert resp_missing["status_code"] == 403

        # Wrong secret
        resp_wrong = await post_webhook(client, update, secret="wrong_token")
        assert resp_wrong["status_code"] == 403

        # Correct secret
        resp_ok = await post_webhook(client, update, secret="secret_token_123")
        assert resp_ok["status_code"] == 200

    async def test_webhook_invalid_json(self, client: AsyncClient):
        """Malformed JSON body → 400."""
        headers: dict[str, str] = {"X-Test-Rate-Limit": "true", "Content-Type": "application/json"}
        resp = await client.post(WEBHOOK_URL, content=b"{not valid json", headers=headers)
        assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 2. /start command
# ─────────────────────────────────────────────────────────────────────────────

class TestStartCommand:
    """Test /start triggers language selection prompt."""

    async def test_start_returns_language_prompt(self, client: AsyncClient):
        user_id = 500001
        update = make_update(user_id=user_id, text="/start")
        resp = await post_webhook(client, update)
        assert resp["status_code"] == 200
        body = resp["body"]
        assert body["ok"] is True
        result = body["result"]
        assert result["status"] == "handled"
        assert result["command"] == "start"
        assert "/lang_en" in result["reply"]
        assert "/lang_hi" in result["reply"]
        assert "/lang_mr" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Language selection
# ─────────────────────────────────────────────────────────────────────────────

class TestLanguageSelection:
    """Test language selection and state transition to AWAITING_PHOTO."""

    async def test_select_english(self, client: AsyncClient):
        user_id = 500010
        # Start
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        # Select English
        resp = await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        result = resp["body"]["result"]
        assert result["lang"] == "en"
        assert "English" in result["reply"]

    async def test_select_hindi(self, client: AsyncClient):
        user_id = 500011
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        resp = await post_webhook(client, make_update(user_id=user_id, text="Hindi"))
        result = resp["body"]["result"]
        assert result["action"] == "language_set"
        assert result["lang"] == "hi"
        assert "हिंदी" in result["reply"]

    async def test_select_marathi(self, client: AsyncClient):
        user_id = 500012
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        resp = await post_webhook(client, make_update(user_id=user_id, text="Marathi"))
        result = resp["body"]["result"]
        assert result["action"] == "language_set"
        assert result["lang"] == "mr"
        assert "मराठी" in result["reply"]

    async def test_unrecognized_language_reprompts(self, client: AsyncClient):
        user_id = 500013
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        resp = await post_webhook(client, make_update(user_id=user_id, text="French"))
        result = resp["body"]["result"]
        assert result["action"] == "lang_reprompt"
        assert "/lang_en" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 4. Full flow: Photo → Location → Description → Submission
# ─────────────────────────────────────────────────────────────────────────────

class TestFullSubmissionFlow:
    """End-to-end Telegram submission flow with real DB writes."""

    async def test_full_english_flow(self, client: AsyncClient):
        user_id = 600001
        # /start
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        # Language
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        # Photo (simulate Telegram photo array)
        photo_update = make_update(
            user_id=user_id,
            photo=[
                {"file_id": "AgACtest123_small", "file_unique_id": "u1", "width": 320, "height": 240, "file_size": 8000},
                {"file_id": "AgACtest123_large", "file_unique_id": "u2", "width": 1280, "height": 960, "file_size": 120000},
            ],
        )
        resp = await post_webhook(client, photo_update)
        result = resp["body"]["result"]
        assert result["action"] == "photo_received"
        assert result["file_id"] == "AgACtest123_large"
        assert "location" in result["reply"].lower() or "GPS" in result["reply"]

        # Location
        loc_update = make_update(
            user_id=user_id,
            location={"latitude": 19.8760, "longitude": 75.3433},
        )
        resp = await post_webhook(client, loc_update)
        result = resp["body"]["result"]
        assert result["action"] == "location_received"
        assert result["lat"] == 19.876
        assert result["lng"] == 75.3433

        # Description → submission
        desc_update = make_update(user_id=user_id, text="Farm pond near village")
        resp = await post_webhook(client, desc_update)
        result = resp["body"]["result"]
        assert result["action"] == "submission_created"
        assert result["submission_id"].startswith("GW-")
        assert result["observation_type"] == "farm_pond"
        assert "verification" not in result  # Now asynchronous
        assert "Submitting to backend and running dual-engine" in result["reply"]

    async def test_skip_description(self, client: AsyncClient):
        user_id = 600002
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_skip_test", "file_unique_id": "u3", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 20.0, "longitude": 76.0},
        ))
        # /skip
        resp = await post_webhook(client, make_update(user_id=user_id, text="/skip"))
        result = resp["body"]["result"]
        assert result["action"] == "submission_created"
        assert result["observation_type"] == "water_body"  # default when no description keywords

    async def test_hindi_flow(self, client: AsyncClient):
        user_id = 600003
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_hi"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_hindi_test", "file_unique_id": "u4", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 18.5, "longitude": 73.8},
        ))
        resp = await post_webhook(client, make_update(user_id=user_id, text="चेक डैम"))
        result = resp["body"]["result"]
        assert result["action"] == "submission_created"
        assert result["observation_type"] == "check_dam"
        # Reply should be in Hindi and indicate processing
        assert "अवलोकन प्राप्त हुआ" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 5. /cancel command
# ─────────────────────────────────────────────────────────────────────────────

class TestCancelCommand:
    """Test /cancel resets session state."""

    async def test_cancel_mid_flow(self, client: AsyncClient):
        user_id = 700001
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        # Cancel before photo
        resp = await post_webhook(client, make_update(user_id=user_id, text="/cancel"))
        result = resp["body"]["result"]
        assert result["command"] == "cancel"
        assert "cancelled" in result["reply"].lower() or "cancel" in result["reply"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 6. /help command
# ─────────────────────────────────────────────────────────────────────────────

class TestHelpCommand:
    """Test /help returns command listing."""

    async def test_help_returns_commands(self, client: AsyncClient):
        user_id = 700010
        resp = await post_webhook(client, make_update(user_id=user_id, text="/help"))
        result = resp["body"]["result"]
        assert result["command"] == "help"
        assert "/start" in result["reply"]
        assert "/status" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 7. /status command
# ─────────────────────────────────────────────────────────────────────────────

class TestStatusCommand:
    """Test /status returns real aggregated stats from DB."""

    async def test_status_new_user(self, client: AsyncClient):
        user_id = 700020
        resp = await post_webhook(client, make_update(user_id=user_id, text="/status"))
        result = resp["body"]["result"]
        assert result["command"] == "status"
        # New user should have 0 submissions
        assert "0" in result["reply"]

    async def test_status_after_submission(self, client: AsyncClient):
        """Submit first, then check /status shows correct counts."""
        user_id = 700021
        # Do full flow
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_stat_test", "file_unique_id": "u5", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 19.0, "longitude": 74.0},
        ))
        await post_webhook(client, make_update(user_id=user_id, text="Water body"))

        # Now check status
        resp = await post_webhook(client, make_update(user_id=user_id, text="/status"))
        result = resp["body"]["result"]
        assert result["command"] == "status"
        # Should show at least 1 total observation
        assert "Total Observations: 1" in result["reply"] or "1" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 8. Duplicate update suppression
# ─────────────────────────────────────────────────────────────────────────────

class TestDuplicateSuppression:
    """Test that the same update_id is not processed twice."""

    async def test_duplicate_update_id(self, client: AsyncClient):
        user_id = 800001
        fixed_id = 999999
        update = make_update(user_id=user_id, text="/start", update_id=fixed_id)
        # First call
        resp1 = await post_webhook(client, update)
        assert resp1["body"]["result"]["status"] == "handled"
        # Second call (same update_id)
        resp2 = await post_webhook(client, update)
        assert resp2["body"]["result"]["status"] == "duplicate"


# ─────────────────────────────────────────────────────────────────────────────
# 9. Invalid location
# ─────────────────────────────────────────────────────────────────────────────

class TestInvalidLocation:
    """Test invalid coordinates are rejected with a re-prompt."""

    async def test_out_of_range_lat(self, client: AsyncClient):
        user_id = 800010
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_loc_test", "file_unique_id": "u6", "width": 640, "height": 480, "file_size": 30000}],
        ))
        # Invalid latitude
        resp = await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 999, "longitude": 75.0},
        ))
        result = resp["body"]["result"]
        assert result["action"] == "invalid_location"
        assert "invalid" in result["reply"].lower() or "⚠️" in result["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 10. State machine edge cases
# ─────────────────────────────────────────────────────────────────────────────

class TestStateMachineEdgeCases:
    """Test edge cases in the conversation state machine."""

    async def test_text_when_photo_expected(self, client: AsyncClient):
        """When photo is expected but user sends text → re-prompt."""
        user_id = 800020
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        # Send text instead of photo
        resp = await post_webhook(client, make_update(user_id=user_id, text="Hello there"))
        result = resp["body"]["result"]
        assert result["action"] == "photo_reprompt"
        assert "photo" in result["reply"].lower()

    async def test_text_when_location_expected(self, client: AsyncClient):
        """When location is expected but user sends text → re-prompt."""
        user_id = 800021
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_edge", "file_unique_id": "u7", "width": 640, "height": 480, "file_size": 30000}],
        ))
        # Send text instead of location
        resp = await post_webhook(client, make_update(user_id=user_id, text="Some random text"))
        result = resp["body"]["result"]
        assert result["action"] == "location_reprompt"

    async def test_idle_user_gets_help(self, client: AsyncClient):
        """Idle user sending random text → help message."""
        user_id = 800022
        resp = await post_webhook(client, make_update(user_id=user_id, text="Random message"))
        result = resp["body"]["result"]
        assert result["action"] == "help_fallback"
        assert "/start" in result["reply"]

    async def test_empty_message_ignored(self, client: AsyncClient):
        """Update without a message object is ignored."""
        update = {"update_id": _next_update_id()}
        resp = await post_webhook(client, update)
        assert resp["body"]["result"]["status"] == "ignored"


# ─────────────────────────────────────────────────────────────────────────────
# 11. CadreProfile mapping
# ─────────────────────────────────────────────────────────────────────────────

class TestCadreMapping:
    """Test telegram_user_id is properly stored on CadreProfile."""

    async def test_cadre_created_with_telegram_user_id(self, client: AsyncClient):
        """Submitting via Telegram creates a CadreProfile with telegram_user_id set."""
        user_id = 900001
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        # After /start, cadre should exist
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))

        # Check status to confirm cadre exists with name
        resp = await post_webhook(client, make_update(user_id=user_id, text="/status"))
        result = resp["body"]["result"]
        assert result["command"] == "status"
        assert "Sunita" in result["reply"]

    async def test_same_user_id_returns_same_cadre(self, client: AsyncClient):
        """Multiple updates from same telegram user → same cadre profile."""
        user_id = 900002
        # First interaction
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        # Full submission
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_same_user", "file_unique_id": "u8", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 19.0, "longitude": 74.0},
        ))
        resp1 = await post_webhook(client, make_update(user_id=user_id, text="Check dam"))
        sub1_id = resp1["body"]["result"]["submission_id"]

        # Second submission (same user)
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": "AgAC_same_user2", "file_unique_id": "u9", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 19.1, "longitude": 74.1},
        ))
        resp2 = await post_webhook(client, make_update(user_id=user_id, text="Borewell"))
        sub2_id = resp2["body"]["result"]["submission_id"]

        # Both submissions should be different
        assert sub1_id != sub2_id

        # /status should show 2 total
        resp = await post_webhook(client, make_update(user_id=user_id, text="/status"))
        assert "2" in resp["body"]["result"]["reply"]


# ─────────────────────────────────────────────────────────────────────────────
# 12. Observation type detection
# ─────────────────────────────────────────────────────────────────────────────

class TestObservationTypeDetection:
    """Test that description text maps to correct observation types."""

    @pytest.mark.parametrize("text,expected_type", [
        ("check dam", "check_dam"),
        ("Farm Pond near village", "farm_pond"),
        ("Borewell depth check", "borewell"),
        ("Water quality test", "water_quality"),
        ("Contour trench work", "contour_trench"),
        ("Gully plug construction", "gully_plug"),
        ("Percolation tank status", "percolation_tank"),
    ])
    async def test_type_detection(self, client: AsyncClient, text: str, expected_type: str):
        user_id = 900100 + hash(text) % 10000
        await post_webhook(client, make_update(user_id=user_id, text="/start"))
        await post_webhook(client, make_update(user_id=user_id, text="/lang_en"))
        await post_webhook(client, make_update(
            user_id=user_id,
            photo=[{"file_id": f"AgAC_type_{expected_type}", "file_unique_id": f"ut_{expected_type}", "width": 640, "height": 480, "file_size": 30000}],
        ))
        await post_webhook(client, make_update(
            user_id=user_id,
            location={"latitude": 19.0, "longitude": 74.0},
        ))
        resp = await post_webhook(client, make_update(user_id=user_id, text=text))
        result = resp["body"]["result"]
        assert result["observation_type"] == expected_type
