"""Pydantic API schemas. Database models are never returned directly."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BhuvanStatusBlock(BaseModel):
    enabled: bool = False
    configured: bool = False
    reachable: bool = False
    status: str = "UNAVAILABLE"
    service_url: str | None = None
    layer: str | None = None
    crs: str | None = None
    version: str | None = None
    format: str | None = None
    provider_type: str = "WMS"
    reason: str | None = None
    metadata: dict[str, object] | None = None


class HealthComponent(BaseModel):
    status: str
    required: bool = False
    detail: str | None = None


class DashboardKpi(BaseModel):
    id: str
    label: str
    value: str
    change: str
    trend: str = "up"
    status: str = "info"
    icon: str = "MapPin"


class DashboardAlert(BaseModel):
    id: str
    title: str
    location: str
    submission_id: str
    priority: str
    time: str
    description: str


class DashboardActivity(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    time: str
    status: str


class DashboardSummary(BaseModel):
    provider: str = "demo"
    kpis: list[DashboardKpi]
    alerts: list[DashboardAlert]
    activity: list[DashboardActivity]
    system_status: list[dict[str, str]]
    totals: dict[str, int]


class SubmissionCreate(BaseModel):
    title: str
    location_label: str
    district: str = ""
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    classification: str | None = None
    photo_url: str | None = None
    submitter_name: str = "Jal Saheli"
    source: str = "drishti"
    notes: str | None = None


class SubmissionOut(BaseModel):
    id: str
    title: str
    location_label: str
    district: str
    lat: float
    lng: float
    status: str
    classification: str | None = None
    photo_url: str | None = None
    captured_at: datetime
    submitter_name: str
    source: str
    notes: str | None = None
    coordinates: str


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class XaiBlock(BaseModel):
    confidence: float | None = None
    important_features: list[FeatureImportance]
    explanation: list[str]
    method: str = "satellite-lookup"


class AnalysisOut(BaseModel):
    submission_id: str
    status: str
    provider: str
    classification: str
    confidence: float | None = None
    satellite_match: str
    ndvi: float | None = None
    ndwi: float | None = None
    ndvi_source: str = "unknown"
    ndwi_source: str = "unknown"
    lulc: str
    change_detection: str
    anomaly: bool
    xai: XaiBlock
    recommendation: str | None = None
    satellite_imagery_provider: str | None = None
    satellite_imagery_type: str | None = None
    bhuvan: dict[str, object] | None = None
    photo_url: str | None = None
    location: str | None = None
    coordinates: str | None = None
    captured_at: datetime | None = None
    submission_status: str | None = None


class GisFeatureProperties(BaseModel):
    id: str
    name: str
    type: str
    location: str
    status: str
    confidence: float | None = None
    description: str
    priority: str
    submission_id: str | None = None


class GisFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    provider: str = "demo-local"
    features: list[dict]


class VerificationTaskOut(BaseModel):
    id: str
    submission_id: str
    status: str
    priority: str
    reason: str
    confidence: float | None = None
    ai_confidence: int | None = None
    assigned_officer: str | None = None
    lat: float
    lng: float
    notes: str | None = None
    title: str
    intervention: str
    location: dict[str, str]
    submitted_at: datetime
    triage_reason: str
    reasons: list[str]
    recommended_action: str
    risk_score: int | None = None


class VerificationPatch(BaseModel):
    status: str | None = None
    assigned_officer: str | None = None
    notes: str | None = None
    outcome_label: str | None = None


class RecommendationOut(BaseModel):
    submission_id: str
    intervention: str
    suitability: float | None = None
    reasons: list[str]
    important_features: list[FeatureImportance]
    explanation: str
    provider: str
    method: str = "label-mapping"


class JalSaheliProfileOut(BaseModel):
    id: str
    name: str
    role: str
    village: str
    phone: str
    badge: str
    jal_credits: int
    stats: dict[str, int | str]
    accuracy_history: list[dict] = Field(default_factory=list)
    provider: str = "demo"


class JalSaheliSubmissionCreate(BaseModel):
    observation_type: str = "water_body"
    type_label: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    location_label: str = "Field location"
    notes: str | None = None
    photo_url: str | None = None
    channel: str = "web"
    title: str | None = None


class JalSaheliSubmissionOut(BaseModel):
    id: str
    core_submission_id: str | None = None
    observation_type: str
    type_label: str
    status: str
    channel: str
    credits: int
    lat: float | None = None
    lng: float | None = None
    location_label: str
    notes: str | None = None
    photo_url: str | None = None
    created_at: datetime
    earnings: int = 0
    earnings_display: str = "0 Jal Credits"


class JalSaheliEarningsOut(BaseModel):
    total_credits: int
    transaction_count: int
    ledger: list[dict]
    note: str = "Jal Credits are a non-monetary stewardship score. They have no cash value."
    provider: str = "demo"
