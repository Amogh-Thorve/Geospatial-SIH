"""
tests/test_auth.py
Unit and integration tests for cadre registration and authentication.
"""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient


class TestCadreRegistration:
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        phone = f"+9197{uuid.uuid4().int % 100000000:08d}"
        payload = {
            "name": "Meera Bai",
            "phone": phone,
            "village": "Rampura",
            "telegram_handle": "@meera_jal",
        }
        res = await client.post("/api/jal-saheli/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["name"] == "Meera Bai"
        assert "cadre_id" in data
        assert data["expires_in"] > 0

    @pytest.mark.asyncio
    async def test_register_duplicate_phone_fails(self, client: AsyncClient):
        phone = f"+9196{uuid.uuid4().int % 100000000:08d}"
        payload = {"name": "Radha Sharma", "phone": phone}
        res1 = await client.post("/api/jal-saheli/auth/register", json=payload)
        assert res1.status_code == 201

        # Attempt to register again with same phone
        res2 = await client.post("/api/jal-saheli/auth/register", json=payload)
        assert res2.status_code == 409

    @pytest.mark.asyncio
    async def test_register_invalid_phone_fails(self, client: AsyncClient):
        payload = {"name": "Invalid Phone", "phone": "abc-not-a-number"}
        res = await client.post("/api/jal-saheli/auth/register", json=payload)
        assert res.status_code == 422


class TestCadreLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient):
        phone = f"+9195{uuid.uuid4().int % 100000000:08d}"
        payload = {"name": "Anita Patel", "phone": phone}
        res_reg = await client.post("/api/jal-saheli/auth/register", json=payload)
        assert res_reg.status_code == 201

        res_login = await client.post("/api/jal-saheli/auth/login", json={"phone": phone})
        assert res_login.status_code == 200
        data = res_login.json()
        assert "access_token" in data
        assert data["name"] == "Anita Patel"

    @pytest.mark.asyncio
    async def test_login_unregistered_phone_fails(self, client: AsyncClient):
        res = await client.post("/api/jal-saheli/auth/login", json={"phone": "+919999999999"})
        assert res.status_code == 404


class TestProtectedRoutesAuth:
    @pytest.mark.asyncio
    async def test_missing_token_returns_401(self, client: AsyncClient):
        res = await client.get("/api/jal-saheli/profile")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, client: AsyncClient):
        res = await client.get(
            "/api/jal-saheli/profile",
            headers={"Authorization": "Bearer invalid.jwt.token"},
        )
        assert res.status_code == 401
