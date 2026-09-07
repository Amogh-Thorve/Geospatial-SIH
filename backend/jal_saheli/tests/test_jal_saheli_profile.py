"""Jal Saheli profile ensure + dashboard contract tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select

from app.models.entities import JalSaheliProfile, JalSaheliSubmission
from app.services.seed import ensure_jal_saheli_profile


@pytest.mark.asyncio
async def test_jal_saheli_profile_auto_created(client: AsyncClient, init_test_db) -> None:
    from app.db.database import get_session

    async with get_session() as session:
        await session.execute(delete(JalSaheliSubmission))
        await session.execute(delete(JalSaheliProfile))
        await session.commit()

    response = await client.get("/api/jal-saheli/profile")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == "JS-001"
    assert body["name"] == "Jal Saheli"
    assert body["jal_credits"] == 0
    assert body["stats"]["totalSubmissions"] == 0


@pytest.mark.asyncio
async def test_ensure_jal_saheli_profile_idempotent(init_test_db) -> None:
    from app.db.database import get_session

    async with get_session() as session:
        first = await ensure_jal_saheli_profile(session)
        second = await ensure_jal_saheli_profile(session)
        await session.commit()
        assert first.id == second.id == "JS-001"
        rows = (await session.execute(select(JalSaheliProfile))).scalars().all()
        assert len(rows) == 1
