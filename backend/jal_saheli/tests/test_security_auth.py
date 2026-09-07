"""
tests/test_security_auth.py
Comprehensive Phase 4 Security and Authentication test suite.

Verifies:
  1. Unauthenticated requests to protected endpoints return 401
  2. Authenticated requests with valid JWT return 200/201
  3. Unauthorized resource access (Cadre isolation and ownership) returns 404
  4. Invalid credentials (malformed or tampered JWT) return 401
  5. Expired credentials return 401 with "token_expired" detail
  6. Browser parameter tampering (user_id/cadre_id injection) is ignored
  7. Telegram webhook secret token validation (missing/wrong -> 403, correct -> 200)
  8. Malicious file upload rejection (disguised non-image content -> 400)
  9. Rate limiting enforcement on rapid requests (exceeding limit -> 429)
"""
from __future__ import annotations

import io
import uuid
import pytest
from httpx import AsyncClient

from app.config import get_settings
from app.utils.auth import create_access_token, create_expired_token
from app.utils.rate_limiter import limiter, SlidingWindowRateLimiter


# ─────────────────────────────────────────────────────────────────────────────
# 1. Unauthenticated Requests
# ─────────────────────────────────────────────────────────────────────────────

class TestUnauthenticatedRequests:
    """Ensure all protected endpoints reject requests without a Bearer token."""

    @pytest.mark.asyncio
    async def test_get_profile_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/profile")
        assert res.status_code == 401
        data = res.json()
        assert data.get("detail", {}).get("error") == "unauthorized"

    @pytest.mark.asyncio
    async def test_get_submissions_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/submissions")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_post_submission_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.post(
            "/api/jal-saheli/submissions",
            json={"observation_type": "water_body", "latitude": 18.52, "longitude": 73.85},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_single_submission_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/submissions/GW-999999")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_earnings_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/earnings")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_earnings_summary_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/earnings/summary")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_verification_history_unauthenticated_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/verification-history")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# 2. Authenticated Requests
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthenticatedRequests:
    """Ensure valid JWT tokens authenticate requests successfully."""

    @pytest.mark.asyncio
    async def test_authenticated_profile_access(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get("/api/jal-saheli/profile", headers=registered_cadre["headers"])
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == registered_cadre["cadre_id"]
        assert data["phone"] == registered_cadre["phone"]

    @pytest.mark.asyncio
    async def test_authenticated_submission_creation(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.post(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
            json={
                "observation_type": "water_body",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "description": "Authenticated test observation",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["cadre_id"] == registered_cadre["cadre_id"]
        assert data["observation_type"] == "water_body"


# ─────────────────────────────────────────────────────────────────────────────
# 3. Unauthorized Resource Access & User Ownership
# ─────────────────────────────────────────────────────────────────────────────

class TestUserOwnershipAndCadreIsolation:
    """Ensure Cadre A cannot view or manipulate Cadre B's resources."""

    @pytest.mark.asyncio
    async def test_cadre_cannot_access_other_cadre_submission(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # 1. Cadre A creates a submission
        res_a = await client.post(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
            json={"observation_type": "check_dam", "latitude": 19.1, "longitude": 74.2},
        )
        assert res_a.status_code == 201
        sub_id = res_a.json()["id"]

        # 2. Register Cadre B
        phone_b = f"+9198{uuid.uuid4().int % 100000000:08d}"
        res_b_reg = await client.post(
            "/api/jal-saheli/auth/register",
            json={"name": "Cadre B", "phone": phone_b, "village": "Village B"},
        )
        assert res_b_reg.status_code == 201
        token_b = res_b_reg.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. Cadre B attempts to access Cadre A's submission directly -> 404 (not accessible)
        res_cross = await client.get(f"/api/jal-saheli/submissions/{sub_id}", headers=headers_b)
        assert res_cross.status_code == 404

        # 4. Cadre B attempts to access Cadre A's status directly -> 404
        res_status = await client.get(
            f"/api/jal-saheli/submissions/{sub_id}/status", headers=headers_b
        )
        assert res_status.status_code == 404

        # 5. Cadre B lists submissions -> does not see Cadre A's submission
        res_list_b = await client.get("/api/jal-saheli/submissions", headers=headers_b)
        assert res_list_b.status_code == 200
        b_ids = [s["id"] for s in res_list_b.json()]
        assert sub_id not in b_ids


# ─────────────────────────────────────────────────────────────────────────────
# 4. Invalid Credentials
# ─────────────────────────────────────────────────────────────────────────────

class TestInvalidCredentials:
    """Ensure malformed, tampered, or forged tokens are rejected."""

    @pytest.mark.asyncio
    async def test_completely_malformed_token_returns_401(self, client: AsyncClient):
        res = await client.get(
            "/api/jal-saheli/profile",
            headers={"Authorization": "Bearer not-even-a-jwt"},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_tampered_jwt_signature_returns_401(
        self, client: AsyncClient, registered_cadre: dict
    ):
        original_token = registered_cadre["headers"]["Authorization"].removeprefix("Bearer ")
        # Tamper last 5 characters
        tampered_token = original_token[:-5] + "XXXXX"
        res = await client.get(
            "/api/jal-saheli/profile",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_token_with_nonexistent_cadre_returns_401(self, client: AsyncClient):
        # Valid token signed with correct key, but cadre ID does not exist in DB
        ghost_token, _ = create_access_token(cadre_id=str(uuid.uuid4()), phone="+919999999999")
        res = await client.get(
            "/api/jal-saheli/profile",
            headers={"Authorization": f"Bearer {ghost_token}"},
        )
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# 5. Expired Credentials
# ─────────────────────────────────────────────────────────────────────────────

class TestExpiredCredentials:
    """Ensure expired JWT tokens are explicitly recognized and rejected with 401."""

    @pytest.mark.asyncio
    async def test_expired_token_returns_401_with_token_expired(
        self, client: AsyncClient, registered_cadre: dict
    ):
        expired_token = create_expired_token(
            registered_cadre["cadre_id"], registered_cadre["phone"]
        )
        res = await client.get(
            "/api/jal-saheli/profile",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert res.status_code == 401
        data = res.json()
        assert data.get("detail", {}).get("error") == "token_expired"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Browser Parameter Tampering & Zero-Trust Identity
# ─────────────────────────────────────────────────────────────────────────────

class TestParameterTamperingProtection:
    """Ensure client cannot inject or spoof cadre_id / user_id from browser."""

    @pytest.mark.asyncio
    async def test_client_cannot_spoof_cadre_id_in_submission(
        self, client: AsyncClient, registered_cadre: dict
    ):
        fake_cadre_id = f"SPOOFED-{uuid.uuid4().hex[:8]}"

        # Attacker tries to pass a forged cadre_id and user_id in the body
        res = await client.post(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
            json={
                "observation_type": "water_body",
                "latitude": 18.52,
                "longitude": 73.85,
                "cadre_id": fake_cadre_id,
                "user_id": fake_cadre_id,
                "telegram_user_id": 12345678,
            },
        )
        assert res.status_code == 201
        sub_data = res.json()

        # The submission MUST be bound to registered_cadre["cadre_id"], NOT fake_cadre_id
        assert sub_data["cadre_id"] == registered_cadre["cadre_id"]
        assert sub_data["cadre_id"] != fake_cadre_id


# ─────────────────────────────────────────────────────────────────────────────
# 7. Telegram Webhook Secret Token Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestTelegramWebhookSecurity:
    """Ensure the Telegram webhook endpoint validates X-Telegram-Bot-Api-Secret-Token."""

    @pytest.mark.asyncio
    async def test_webhook_rejects_missing_or_invalid_secret_token(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ):
        settings = get_settings()
        secret = "super-secure-webhook-secret-token"
        monkeypatch.setattr(settings.telegram, "webhook_secret", secret)

        update_payload = {
            "update_id": 99999,
            "message": {
                "message_id": 1,
                "from": {"id": 88888, "first_name": "Test", "username": "test_bot_user"},
                "text": "/start",
            },
        }

        # 1. Missing secret header -> 403
        res_missing = await client.post(
            "/api/jal-saheli/telegram/webhook",
            json=update_payload,
        )
        assert res_missing.status_code == 403

        # 2. Invalid secret header -> 403
        res_invalid = await client.post(
            "/api/jal-saheli/telegram/webhook",
            json=update_payload,
            headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret-token"},
        )
        assert res_invalid.status_code == 403

        # 3. Valid secret header -> 200
        res_valid = await client.post(
            "/api/jal-saheli/telegram/webhook",
            json=update_payload,
            headers={"X-Telegram-Bot-Api-Secret-Token": secret},
        )
        assert res_valid.status_code == 200
        assert res_valid.json()["ok"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 8. Malicious File Upload Protection
# ─────────────────────────────────────────────────────────────────────────────

class TestFileUploadSecurity:
    """Ensure disguised or corrupted files without genuine image magic bytes are rejected."""

    @pytest.mark.asyncio
    async def test_disguised_script_file_rejected(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # PHP script disguised with a .jpg filename and image/jpeg MIME type
        fake_content = b"<?php echo 'malicious payload'; ?>"
        fake_file = ("exploit.jpg", fake_content, "image/jpeg")

        res = await client.post(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
            data={"observation_type": "water_body"},
            files={"photo": fake_file},
        )
        assert res.status_code == 400
        data = res.json()
        assert "valid image signature" in data.get("detail", {}).get("message", "").lower()

    @pytest.mark.asyncio
    async def test_genuine_jpeg_photo_accepted(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # Valid JPEG magic bytes: FF D8 FF E0
        valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 64
        photo_file = ("pond.jpg", valid_jpeg, "image/jpeg")

        res = await client.post(
            "/api/jal-saheli/submissions",
            headers=registered_cadre["headers"],
            data={"observation_type": "water_body", "description": "Valid photo submission"},
            files={"photo": photo_file},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["photo_url"] is not None
        assert data["photo_url"].endswith(".jpg")


# ─────────────────────────────────────────────────────────────────────────────
# 9. Rate Limiting Protection
# ─────────────────────────────────────────────────────────────────────────────

class TestRateLimiting:
    """Ensure sliding-window rate limiter throttles excessive requests."""

    def test_sliding_window_rate_limiter_logic(self):
        rl = SlidingWindowRateLimiter()
        key = "test-client-ip"
        limit = 3
        window = 10

        # Requests 1, 2, 3 allowed
        assert rl.is_allowed(key, limit, window)[0] is True
        assert rl.is_allowed(key, limit, window)[0] is True
        assert rl.is_allowed(key, limit, window)[0] is True

        # Request 4 exceeds limit
        allowed, retry_after = rl.is_allowed(key, limit, window)
        assert allowed is False
        assert retry_after > 0

        # Reset clears state
        rl.reset()
        assert rl.is_allowed(key, limit, window)[0] is True

    @pytest.mark.asyncio
    async def test_rate_limit_exceeded_returns_429(
        self, client: AsyncClient
    ):
        limiter.reset()

        # Simulate filling the 10-request allowance for IP 192.168.1.100 on /api/jal-saheli/auth/login
        path_key = "ip:192.168.1.100:/api/jal-saheli/auth/login"
        for _ in range(10):
            allowed, _ = limiter.is_allowed(path_key, 10, 60)
            assert allowed is True

        # 11th request will trigger rate limiter before reaching the handler
        res = await client.post(
            "/api/jal-saheli/auth/login",
            json={"phone": "+919999999999"},
            headers={"X-Forwarded-For": "192.168.1.100", "X-Test-Rate-Limit": "true"},
        )
        assert res.status_code == 429
        assert "Retry-After" in res.headers
        data = res.json()
        assert data.get("detail", {}).get("error") == "rate_limit_exceeded"

        # Cleanup limiter state so subsequent tests are unaffected
        limiter.reset()
