"""
app/schemas/earnings.py
Earnings ledger request / response schemas.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.earnings import EarningsStatus


class EarningsLedgerItem(BaseModel):
    id: str
    submission_id: str
    observation_type: str | None
    type_label: str | None
    amount: int = Field(description="Reward amount in INR")
    amount_display: str = Field(description="Formatted e.g. ₹25")
    status: EarningsStatus
    method: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ByTypeBreakdown(BaseModel):
    observation_type: str
    type_label: str | None
    count: int
    total_amount: int


class EarningsSummary(BaseModel):
    total_credited: int = Field(description="Total INR credited to date")
    total_credited_display: str
    this_month_credited: int = Field(description="INR credited this calendar month")
    this_month_display: str
    pending_amount: int = Field(description="INR pending payment")
    pending_display: str
    transaction_count: int
    by_type: list[ByTypeBreakdown] = Field(default_factory=list)
