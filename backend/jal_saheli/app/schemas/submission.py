"""
app/schemas/submission.py
Submission request / response schemas.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.submission import SubmissionStatus


# ── Location sub-schema ───────────────────────────────────────────────────────

class LocationSchema(BaseModel):
    lat: float | None = None
    lng: float | None = None
    label: str | None = None


# ── Verification sub-schema ───────────────────────────────────────────────────

class VerificationDetail(BaseModel):
    ai_confidence: float | None = Field(default=None, description="AI engine confidence 0–100")
    satellite_confidence: float | None = Field(default=None, description="Satellite engine confidence 0–100")
    final_confidence: float | None = Field(default=None, description="Weighted final confidence 0–100")
    verified_by: str | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None


# ── Submission response ───────────────────────────────────────────────────────

class SubmissionResponse(BaseModel):
    id: str
    cadre_id: str
    observation_type: str
    type_label: str | None
    description: str | None
    channel: str
    latitude: float | None
    longitude: float | None
    location_label: str | None
    location: LocationSchema
    photo_url: str | None
    capture_time: datetime | None
    status: SubmissionStatus
    verification: VerificationDetail
    reward_amount: int = Field(description="Expected or actual reward in INR")
    earnings_credited: bool = Field(description="True if earnings have been credited")
    created_at: datetime
    updated_at: datetime | None

    # Frontend compatibility aliases
    type: str | None = Field(default=None, description="Alias for observation_type")
    notes: str | None = Field(default=None, description="Alias for description")
    earnings: int | None = Field(default=None, description="Alias for reward_amount")
    earnings_display: str | None = Field(default=None, description="Formatted earnings string e.g. ₹25")
    date: str | None = Field(default=None, description="ISO date string")
    date_display: str | None = Field(default=None, description="Human readable date string e.g. Sep 07, 2026")
    time_display: str | None = Field(default=None, description="Human readable time string e.g. 10:30 AM")

    model_config = {"from_attributes": True}


# ── Verification history item ─────────────────────────────────────────────────

class VerificationHistoryItem(BaseModel):
    submission_id: str
    observation_type: str
    type_label: str | None
    status: SubmissionStatus
    ai_confidence: float | None
    satellite_confidence: float | None
    final_confidence: float | None
    rejection_reason: str | None
    verified_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Status-only response ──────────────────────────────────────────────────────

class SubmissionStatusResponse(BaseModel):
    id: str
    status: SubmissionStatus
    ai_confidence: float | None
    satellite_confidence: float | None
    final_confidence: float | None
    updated_at: datetime | None
