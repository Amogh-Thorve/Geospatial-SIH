"""
tests/test_startup.py
Application startup tests.

Verifies that:
  - FastAPI app creates without errors
  - App metadata (title, version) is correct
  - Lifespan can start and stop cleanly
  - CORS middleware is registered with expected origins
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.config import Settings
from app.main import create_app


class TestAppCreation:
    """FastAPI app factory produces a correctly configured instance."""

    def test_create_app_returns_fastapi_instance(self, settings: Settings):
        from fastapi import FastAPI
        app = create_app()
        assert isinstance(app, FastAPI)

    def test_app_title_matches_settings(self, settings: Settings):
        app = create_app()
        assert app.title == settings.app.title

    def test_app_version_matches_settings(self, settings: Settings):
        app = create_app()
        assert app.version == settings.app.version

    def test_docs_disabled_in_non_debug_mode(self, settings: Settings):
        """In test env (debug=False) docs endpoints should be None."""
        app = create_app()
        if not settings.app.debug:
            assert app.docs_url is None
            assert app.redoc_url is None

    def test_routers_are_registered(self):
        """Health route must be present in the app's route list."""
        app = create_app()
        routes = [r.path for r in app.routes if hasattr(r, "path")]
        assert "/health" in routes, f"Expected /health in routes, got: {routes}"


class TestLifespan:
    """App starts up and shuts down cleanly via lifespan."""

    @pytest.mark.asyncio
    async def test_lifespan_starts_without_error(self, client: AsyncClient):
        """
        If this test passes, the client fixture was created successfully,
        meaning lifespan start completed without raising an exception.
        """
        assert client is not None

    @pytest.mark.asyncio
    async def test_app_responds_after_startup(self, client: AsyncClient):
        """App must respond to any request after startup (even a 404)."""
        response = await client.get("/health")
        # Either healthy or degraded — both are valid responses, not connection errors
        assert response.status_code in (200, 503)


class TestCORSMiddleware:
    """CORS headers are correctly set on cross-origin requests."""

    @pytest.mark.asyncio
    async def test_cors_headers_present_for_allowed_origin(self, client: AsyncClient):
        """Requests from Vite dev server origin get CORS headers."""
        response = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # OPTIONS preflight should succeed
        assert response.status_code in (200, 204)
        assert "access-control-allow-origin" in response.headers

    @pytest.mark.asyncio
    async def test_cors_allows_vite_ports(self, client: AsyncClient, settings: Settings):
        """Both Vite default ports (5173 and 5174) are in allowed origins."""
        origins = settings.cors.origins
        assert "http://localhost:5173" in origins
        assert "http://localhost:5174" in origins
