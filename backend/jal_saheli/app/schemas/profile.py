"""
app/schemas/profile.py
Cadre profile response schemas.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProfileStats(BaseModel):
    total_submissions: int = Field(description="Total observations submitted")
    verified_count: int = Field(description="Verified observations")
    pending_count: int = Field(description="Pending / processing observations")
    rejected_count: int = Field(description="Rejected observations")
    accuracy_rate: float | None = Field(
        default=None, description="Accuracy rate as percentage (0–100), null if no resolved submissions"
    )
    total_earnings_raw: int = Field(description="Total earnings in INR (integer)")
    total_earnings_display: str = Field(description="Formatted earnings string e.g. ₹475")


class ProfileResponse(BaseModel):
    id: str
    name: str
    phone: str
    village: str | None
    telegram_handle: str | None
    member_since: str = Field(description="ISO date string of registration")
    stats: ProfileStats

    model_config = {"from_attributes": True}
