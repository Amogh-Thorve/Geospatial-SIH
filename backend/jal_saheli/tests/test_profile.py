"""
tests/test_profile.py
Tests for GET /api/jal-saheli/profile.
Ensures profile reads real DB data and aggregates real counts (no fake/mock data).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestProfileEndpoint:
    @pytest.mark.asyncio
    async def test_get_profile_new_cadre_zero_stats(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """A new cadre must have 0 observations, 0 earnings, and None accuracy."""
        res = await client.get(
            "/api/jal-saheli/profile",
            headers=registered_cadre["headers"],
        )
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == registered_cadre["cadre_id"]
        assert data["name"] == registered_cadre["name"]
        assert data["phone"] == registered_cadre["phone"]
        assert data["village"] == "Kalyanpur"
        assert "stats" in data

        stats = data["stats"]
        assert stats["total_submissions"] == 0
        assert stats["verified_count"] == 0
        assert stats["pending_count"] == 0
        assert stats["rejected_count"] == 0
        assert stats["accuracy_rate"] is None
        assert stats["total_earnings_raw"] == 0
        assert stats["total_earnings_display"] == "₹0"
