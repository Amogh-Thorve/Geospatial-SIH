"""SQLAlchemy ORM entities for the GeoWise local MVP."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    location_label: Mapped[str] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(120), default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="PENDING")
    classification: Mapped[str | None] = mapped_column(String(120), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitter_name: Mapped[str] = mapped_column(String(160), default="Jal Saheli")
    source: Mapped[str] = mapped_column(String(40), default="drishti")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    analysis: Mapped[AnalysisResult | None] = relationship(
        back_populates="submission", uselist=False, cascade="all, delete-orphan"
    )
    verification_tasks: Mapped[list[VerificationTask]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list[Recommendation]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )
    feedback: Mapped[list[FeedbackRecord]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), unique=True)
    status: Mapped[str] = mapped_column(String(40), default="QUEUED")
    provider: Mapped[str] = mapped_column(String(80), default="MockGeoAIProvider")
    classification: Mapped[str] = mapped_column(String(120), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    satellite_match: Mapped[str] = mapped_column(String(40), default="UNKNOWN")
    ndvi: Mapped[float | None] = mapped_column(Float, nullable=True)
    ndwi: Mapped[float | None] = mapped_column(Float, nullable=True)
    ndvi_source: Mapped[str] = mapped_column(String(40), default="simulated")
    ndwi_source: Mapped[str] = mapped_column(String(40), default="simulated")
    lulc: Mapped[str] = mapped_column(String(120), default="")
    change_detection: Mapped[str] = mapped_column(String(255), default="")
    anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    xai_json: Mapped[str] = mapped_column(Text, default="{}")
    explanation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    submission: Mapped[Submission] = relationship(back_populates="analysis")


class VerificationTask(Base):
    __tablename__ = "verification_tasks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"))
    status: Mapped[str] = mapped_column(String(40), default="PENDING")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    reason: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    assigned_officer: Mapped[str | None] = mapped_column(String(160), nullable=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    submission: Mapped[Submission] = relationship(back_populates="verification_tasks")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"))
    intervention: Mapped[str] = mapped_column(String(160))
    suitability: Mapped[float] = mapped_column(Float)
    reasons_json: Mapped[str] = mapped_column(Text, default="[]")
    important_features_json: Mapped[str] = mapped_column(Text, default="[]")
    explanation: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(80), default="DemoRecommendationEngine")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    submission: Mapped[Submission] = relationship(back_populates="recommendations")


class FeedbackRecord(Base):
    __tablename__ = "feedback_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"))
    predicted_label: Mapped[str] = mapped_column(String(160), default="")
    verified_label: Mapped[str] = mapped_column(String(160), default="")
    outcome: Mapped[str] = mapped_column(String(40))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    submission: Mapped[Submission] = relationship(back_populates="feedback")


class WatershedFeature(Base):
    __tablename__ = "watershed_features"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    submission_id: Mapped[str | None] = mapped_column(ForeignKey("submissions.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    feature_type: Mapped[str] = mapped_column(String(40))
    location: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")


class JalSaheliProfile(Base):
    __tablename__ = "jal_saheli_profiles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(160))
    village: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(40), default="")
    badge: Mapped[str] = mapped_column(String(80), default="")
    jal_credits: Mapped[int] = mapped_column(Integer, default=0)


class JalSaheliSubmission(Base):
    __tablename__ = "jal_saheli_submissions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("jal_saheli_profiles.id"))
    core_submission_id: Mapped[str | None] = mapped_column(ForeignKey("submissions.id"), nullable=True)
    observation_type: Mapped[str] = mapped_column(String(80))
    type_label: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="PENDING")
    channel: Mapped[str] = mapped_column(String(40), default="web")
    credits: Mapped[int] = mapped_column(Integer, default=0)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_label: Mapped[str] = mapped_column(String(160), default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
