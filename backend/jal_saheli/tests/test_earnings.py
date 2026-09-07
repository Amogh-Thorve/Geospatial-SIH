"""
tests/test_earnings.py
Tests for:
  GET /api/jal-saheli/earnings
  GET /api/jal-saheli/earnings/summary
Ensures real DB aggregation and no fake/dummy figures.
"""
from __future__ import annotations

from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.earnings import EarningsLedger, EarningsStatus


class TestEarningsEndpoints:
    @pytest.mark.asyncio
    async def test_earnings_initially_empty(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get(
            "/api/jal-saheli/earnings",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        assert res.json() == []
        assert res.headers.get("X-Total-Count") == "0"

    @pytest.mark.asyncio
    async def test_earnings_summary_zero_values(
        self, client: AsyncClient, registered_cadre: dict
    ):
        res = await client.get(
            "/api/jal-saheli/earnings/summary",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_credited"] == 0
        assert data["total_credited_display"] == "₹0"
        assert data["this_month_credited"] == 0
        assert data["this_month_display"] == "₹0"
        assert data["pending_amount"] == 0
        assert data["pending_display"] == "₹0"
        assert data["transaction_count"] == 0
        assert data["by_type"] == []

    @pytest.mark.asyncio
    async def test_earnings_reflects_credited_record(
        self, client: AsyncClient, registered_cadre: dict
    ):
        # 1. Create a submission
        sub_res = await client.post(
            "/api/jal-saheli/submissions",
            json={"observation_type": "farm_pond", "latitude": 23.0, "longitude": 74.0},
            headers=registered_cadre["headers"],
        )
        sub_id = sub_res.json()["id"]

        # 2. Insert real credited transaction directly into DB
        import uuid
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        from app.db.database import get_session
        async with get_session() as session:
            entry = EarningsLedger(
                id=txn_id,
                cadre_id=registered_cadre["cadre_id"],
                submission_id=sub_id,
                observation_type="farm_pond",
                type_label="Farm Pond",
                amount=25,
                status=EarningsStatus.CREDITED,
                method="UPI / Jan Dhan",
                note="Field cadre verification reward",
            )
            session.add(entry)
            await session.commit()

        # 3. Check ledger list
        list_res = await client.get(
            "/api/jal-saheli/earnings",
            headers=registered_cadre["headers"],
        )
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        found = next((it for it in items if it["id"] == txn_id), None)
        assert found is not None
        assert found["amount"] == 25
        assert found["amount_display"] == "₹25"
        assert found["status"] == "credited"

        # 4. Check summary aggregation
        sum_res = await client.get(
            "/api/jal-saheli/earnings/summary",
            headers=registered_cadre["headers"],
        )
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["total_credited"] == 25
        assert summary["total_credited_display"] == "₹25"
        assert summary["transaction_count"] == 1
        assert len(summary["by_type"]) == 1
        assert summary["by_type"][0]["observation_type"] == "farm_pond"
        assert summary["by_type"][0]["total_amount"] == 25

        # 5. Check profile total earnings reflects this
        prof_res = await client.get(
            "/api/jal-saheli/profile",
            headers=registered_cadre["headers"],
        )
        assert prof_res.status_code == 200
        assert prof_res.json()["stats"]["total_earnings_raw"] == 25
        assert prof_res.json()["stats"]["total_earnings_display"] == "₹25"
