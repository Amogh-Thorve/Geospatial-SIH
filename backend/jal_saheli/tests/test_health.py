"""
tests/test_health.py
Health endpoint tests.

Verifies:
  - GET /health returns valid JSON
  - Response contains required fields
  - Component statuses are correctly structured
  - Database component reports actual status (not assumed healthy)
  - Optional services report not_configured when unconfigured in .env.test
  - HTTP status code matches overall health (200=healthy, 503=degraded)
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestHealthEndpoint:
    """GET /health returns a valid, structured health response."""

    @pytest.mark.asyncio
    async def test_health_returns_json(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.headers["content-type"].startswith("application/json")

    @pytest.mark.asyncio
    async def test_health_has_required_top_level_fields(self, client: AsyncClient):
        response = await client.get("/health")
        body = response.json()

        required_fields = {"status", "environment", "version", "uptime_seconds", "python_version", "components"}
        assert required_fields.issubset(body.keys()), (
            f"Missing fields: {required_fields - body.keys()}"
        )

    @pytest.mark.asyncio
    async def test_health_status_is_valid_enum(self, client: AsyncClient):
        response = await client.get("/health")
        body = response.json()
        assert body["status"] in ("healthy", "degraded"), (
            f"Unexpected status value: {body['status']!r}"
        )

    @pytest.mark.asyncio
    async def test_health_environment_is_test(self, client: AsyncClient):
        response = await client.get("/health")
        body = response.json()
        assert body["environment"] == "test"

    @pytest.mark.asyncio
    async def test_health_uptime_is_positive_number(self, client: AsyncClient):
        response = await client.get("/health")
        body = response.json()
        assert isinstance(body["uptime_seconds"], (int, float))
        assert body["uptime_seconds"] >= 0

    @pytest.mark.asyncio
    async def test_health_python_version_string(self, client: AsyncClient):
        response = await client.get("/health")
        body = response.json()
        version = body["python_version"]
        assert isinstance(version, str)
        # Must look like "3.11.x"
        parts = version.split(".")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)


class TestHealthComponents:
    """Individual component statuses are correctly reported."""

    @pytest.mark.asyncio
    async def test_health_has_database_component(self, client: AsyncClient):
        response = await client.get("/health")
        components = response.json()["components"]
        assert "database" in components

    @pytest.mark.asyncio
    async def test_database_component_has_status_field(self, client: AsyncClient):
        response = await client.get("/health")
        db = response.json()["components"]["database"]
        assert "status" in db
        assert db["status"] in ("healthy", "unhealthy")

    @pytest.mark.asyncio
    async def test_database_is_healthy_with_sqlite(self, client: AsyncClient):
        """SQLite must be reachable during tests (init_test_db runs before client)."""
        response = await client.get("/health")
        db = response.json()["components"]["database"]
        assert db["status"] == "healthy", (
            "Database should be healthy — SQLite init_test_db fixture should have run"
        )

    @pytest.mark.asyncio
    async def test_telegram_not_configured(self, client: AsyncClient):
        """TELEGRAM_BOT_TOKEN is empty in .env.test — must report not_configured."""
        response = await client.get("/health")
        telegram = response.json()["components"]["telegram"]
        assert telegram["status"] == "not_configured"

    @pytest.mark.asyncio
    async def test_ai_service_not_configured(self, client: AsyncClient):
        """AI_SERVICE_URL is empty in .env.test — must report not_configured."""
        response = await client.get("/health")
        ai = response.json()["components"]["ai_service"]
        assert ai["status"] == "not_configured"

    @pytest.mark.asyncio
    async def test_satellite_not_configured(self, client: AsyncClient):
        """Sentinel credentials empty in .env.test — must report not_configured."""
        response = await client.get("/health")
        sat = response.json()["components"]["satellite_service"]
        assert sat["status"] == "not_configured"

    @pytest.mark.asyncio
    async def test_storage_is_healthy_for_local_backend(self, client: AsyncClient):
        """Local storage requires no credentials — must always be healthy."""
        response = await client.get("/health")
        storage = response.json()["components"]["storage"]
        assert storage["status"] == "healthy"
        assert storage["backend"] == "local"

    @pytest.mark.asyncio
    async def test_all_components_present(self, client: AsyncClient):
        """All expected components must appear in the response."""
        response = await client.get("/health")
        components = response.json()["components"]
        expected = {"database", "telegram", "ai_service", "satellite_service", "storage", "authentication"}
        missing = expected - components.keys()
        assert not missing, f"Missing components in health response: {missing}"


class TestHealthHTTPStatus:
    """HTTP status code reflects actual health."""

    @pytest.mark.asyncio
    async def test_http_200_when_required_components_healthy(self, client: AsyncClient):
        """
        In test environment with SQLite + local storage,
        all required components should be healthy → HTTP 200.
        """
        response = await client.get("/health")
        body = response.json()
        if body["status"] == "healthy":
            assert response.status_code == 200
        else:
            assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_health_endpoint_is_fast(self, client: AsyncClient):
        """Health endpoint should respond within 2 seconds even with DB check."""
        import time
        start = time.monotonic()
        response = await client.get("/health")
        elapsed = time.monotonic() - start
        assert elapsed < 2.0, f"Health check took {elapsed:.2f}s — too slow"
        assert response.status_code in (200, 503)
