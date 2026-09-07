"""
tests/conftest.py
Shared pytest fixtures for the Jal Saheli backend test suite.

Fixtures provided:
  - settings:         Test settings loaded from .env.test
  - app:              Fresh FastAPI app instance per test
  - client:           Async HTTPX test client
  - db_session:       Async SQLAlchemy session against an in-memory SQLite DB
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient

# ── Load .env.test into os.environ BEFORE any app import reads config ────────
# Resolve path relative to this file (tests/ → backend/jal_saheli/.env.test)
_env_test_path = Path(__file__).parent.parent / ".env.test"
load_dotenv(dotenv_path=_env_test_path, override=True)
os.environ["ENV_FILE"] = str(_env_test_path)

# ── Now import app modules (config will read from os.environ populated above) ─
from app.config import get_settings, Settings  # noqa: E402
from app.db.database import init_db, close_db, Base  # noqa: E402
from app.main import create_app  # noqa: E402

# Ensure any cached settings instance is cleared so our env vars take effect
get_settings.cache_clear()


# ─────────────────────────────────────────────────────────────────────────────
# pytest-asyncio configuration
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ─────────────────────────────────────────────────────────────────────────────
# Settings fixture
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def settings() -> Settings:
    """
    Load settings from .env.test.
    Cached for the entire test session.
    """
    get_settings.cache_clear()
    s = get_settings()
    assert s.app.env == "test", f"Expected APP_ENV=test, got {s.app.env!r}. Check .env.test"
    return s


# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# Database fixture
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def init_test_db(settings: Settings):
    """
    Initialise an SQLite database for the test session.
    Removes any stale test database file first so table schemas are always current.
    """
    import app.models  # noqa: F401 — register all ORM models with Base.metadata

    test_db_file = Path(__file__).parent.parent / "jal_saheli_test.db"
    if test_db_file.exists():
        try:
            test_db_file.unlink()
        except Exception:
            pass

    await init_db(
        database_url=settings.database.url,
        echo=False,
        create_tables=True,
    )
    yield
    await close_db()
    if test_db_file.exists():
        try:
            test_db_file.unlink()
        except Exception:
            pass



# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app + HTTPX client fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_app(settings: Settings):
    """
    Create a single FastAPI app instance for the test session.
    Uses create_app() factory — same path as production startup.
    """
    app = create_app()
    return app


@pytest_asyncio.fixture(scope="session")
async def client(test_app, init_test_db) -> AsyncGenerator[AsyncClient, None]:
    """
    HTTPX AsyncClient pointed at the test app via ASGI transport.
    Database is initialised before the client is created.
    """
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def registered_cadre(client: AsyncClient):
    """
    Helper fixture: creates a unique registered cadre and returns
    its credentials + authorization headers.
    """
    import uuid
    phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
    payload = {
        "name": "Sunita Devi",
        "phone": phone,
        "village": "Kalyanpur",
        "telegram_handle": "@sunita_jal",
    }
    resp = await client.post("/api/jal-saheli/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    return {
        "token": data["access_token"],
        "cadre_id": data["cadre_id"],
        "name": data["name"],
        "phone": phone,
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }
