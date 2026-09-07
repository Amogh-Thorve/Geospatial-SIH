"""Demo seed data. Clearly labelled local/demo records — not live government feeds."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.contracts import AnalysisStatus, SubmissionStatus, VerificationStatus
from app.models.entities import (
    AnalysisResult,
    JalSaheliProfile,
    JalSaheliSubmission,
    Recommendation,
    Submission,
    VerificationTask,
    WatershedFeature,
)
from app.services.xai import build_xai

logger = logging.getLogger("geowise.seed")

NOW = datetime(2026, 9, 6, 8, 0, tzinfo=UTC)


def _sub(
    sid: str,
    title: str,
    location: str,
    district: str,
    lat: float,
    lng: float,
    status: str,
    classification: str,
    submitter: str,
    captured: datetime,
    notes: str,
) -> Submission:
    return Submission(
        id=sid,
        title=title,
        location_label=location,
        district=district,
        lat=lat,
        lng=lng,
        status=status,
        classification=classification,
        photo_url=None,
        captured_at=captured,
        submitter_name=submitter,
        source="drishti",
        notes=notes,
        created_at=captured,
    )


async def seed_if_empty(session: AsyncSession) -> None:
    count = await session.scalar(select(func.count()).select_from(Submission))
    if count:
        return

    logger.info("Seeding GeoWise demo dataset")

    submissions = [
        _sub(
            "GW-1042",
            "Check Dam Construction — Sub-basin 4B",
            "Palamaner Mandal, Chittoor",
            "Chittoor",
            13.6288,
            79.4192,
            SubmissionStatus.VERIFICATION_REQUIRED,
            "Check Dam",
            "Asha Patil",
            datetime(2026, 9, 5, 9, 2, tzinfo=UTC),
            "Ground photo claims check dam completion.",
        ),
        _sub(
            "GW-1048",
            "Farm Pond Excavation",
            "Anantapur Sector 7B",
            "Anantapur",
            14.6819,
            77.6006,
            SubmissionStatus.ANALYZED,
            "Farm Pond",
            "Ramesh Kumar",
            datetime(2026, 9, 4, 11, 10, tzinfo=UTC),
            "Farm pond excavation reported.",
        ),
        _sub(
            "GW-1044",
            "Contour Trench Site",
            "Kurnool micro-watershed",
            "Kurnool",
            15.9129,
            79.7400,
            SubmissionStatus.VERIFICATION_REQUIRED,
            "Contour Trench",
            "K. Reddy",
            datetime(2026, 9, 5, 6, 40, tzinfo=UTC),
            "Works reported; satellite demo layer is weak.",
        ),
        _sub(
            "GW-1012",
            "Percolation Tank - Kadapa",
            "Rayachoti Block",
            "Kadapa",
            14.4673,
            78.8242,
            SubmissionStatus.VERIFIED,
            "Percolation Tank",
            "Asha Patil",
            datetime(2026, 8, 30, 8, 0, tzinfo=UTC),
            "Verified percolation tank.",
        ),
        _sub(
            "GW-1043",
            "Farm Pond — Nellore",
            "Nellore",
            "Nellore",
            14.4426,
            79.9865,
            SubmissionStatus.VERIFIED,
            "Farm Pond",
            "Sita Devi",
            datetime(2026, 9, 2, 7, 15, tzinfo=UTC),
            "Verified farm pond.",
        ),
        _sub(
            "GW-1050",
            "Pond Desilting Report",
            "West Godavari",
            "West Godavari",
            17.0005,
            81.8040,
            SubmissionStatus.PENDING,
            "Pond Desilting",
            "Community cadre",
            datetime(2026, 9, 6, 4, 20, tzinfo=UTC),
            "Jal Saheli desilting observation.",
        ),
    ]
    session.add_all(submissions)
    await session.flush()

    analyses = [
        ("GW-1042", 0.61, "MISMATCH", 0.28, 0.12, "Built-up / structure", True, "Limited water signature vs claimed completion."),
        ("GW-1048", 0.87, "MATCH", 0.41, 0.33, "Agriculture / excavated pond", False, "Seasonal surface-water extent increased (demo)."),
        ("GW-1044", 0.42, "UNCERTAIN", 0.18, 0.05, "Treated slope", True, "Weak soil-disturbance signature."),
        ("GW-1012", 0.84, "MATCH", 0.36, 0.38, "Waterbody / recharge", False, "NDWI peak consistent with recharge tank (demo)."),
        ("GW-1043", 0.88, "MATCH", 0.39, 0.31, "Agriculture / pond", False, "Verified pond extent in demo series."),
    ]
    for sid, conf, match, ndvi, ndwi, lulc, anomaly, change in analyses:
        payload = {
            "classification": next(s.classification for s in submissions if s.id == sid),
            "confidence": conf,
            "anomaly": anomaly,
        }
        xai = build_xai(payload)
        session.add(
            AnalysisResult(
                submission_id=sid,
                status=AnalysisStatus.COMPLETED,
                provider="MockGeoAIProvider",
                classification=payload["classification"] or "",
                confidence=conf,
                satellite_match=match,
                ndvi=ndvi,
                ndwi=ndwi,
                ndvi_source="simulated",
                ndwi_source="simulated",
                lulc=lulc,
                change_detection=change,
                anomaly=anomaly,
                xai_json=json.dumps(xai),
                explanation=" ".join(xai["explanation"]),
                created_at=NOW,
            )
        )
        session.add(
            Recommendation(
                submission_id=sid,
                intervention="Farm Pond" if "Pond" in (payload["classification"] or "") else payload["classification"] or "Farm Pond",
                suitability=round(min(0.94, conf + 0.12), 2),
                reasons_json=json.dumps(
                    [
                        "High runoff potential in the demo terrain profile",
                        "Suitable soil / slope combination for water harvesting",
                        "Similar interventions succeeded historically in the demo record set",
                    ]
                ),
                important_features_json=json.dumps(xai["important_features"]),
                explanation=" ".join(xai["explanation"]),
                provider="DemoRecommendationEngine",
                created_at=NOW,
            )
        )

    session.add_all(
        [
            VerificationTask(
                id="VQ-1042",
                submission_id="GW-1042",
                status=VerificationStatus.PENDING,
                priority="HIGH",
                reason="Demo spectral mismatch versus claimed check dam completion.",
                confidence=0.61,
                assigned_officer=None,
                lat=13.6288,
                lng=79.4192,
                created_at=NOW,
                updated_at=NOW,
            ),
            VerificationTask(
                id="VQ-1044",
                submission_id="GW-1044",
                status=VerificationStatus.ASSIGNED,
                priority="HIGH",
                reason="Low-confidence contour trench signature in demo change layer.",
                confidence=0.42,
                assigned_officer="Officer P. Rao",
                lat=15.9129,
                lng=79.7400,
                created_at=NOW,
                updated_at=NOW,
            ),
        ]
    )

    features = [
        ("GW-1042", "Check Dam", "flagged", "Chittoor", "flagged", 13.6288, 79.4192, 0.61, "HIGH"),
        ("GW-1043", "Farm Pond", "intervention", "Nellore", "verified", 14.4426, 79.9865, 0.88, "LOW"),
        ("GW-1044", "Contour Trench Site", "flagged", "Kurnool", "flagged", 15.9129, 79.7400, 0.42, "HIGH"),
        ("GW-1045", "Krishna River Segment", "waterbody", "Vijayawada", "monitored", 16.5062, 80.6480, 0.95, "LOW"),
        ("GW-1046", "Community Well Report", "jal-saheli", "Visakhapatnam", "pending", 17.6868, 83.2185, 0.67, "MEDIUM"),
        ("GW-1048", "Farm Pond", "intervention", "Anantapur", "verified", 14.6819, 77.6006, 0.87, "LOW"),
        ("GW-1049", "Afforestation Block", "flagged", "Kadapa", "flagged", 14.4701, 78.8302, 0.38, "HIGH"),
        ("GW-1050", "Pond Desilting Report", "jal-saheli", "West Godavari", "pending", 17.0005, 81.8040, 0.71, "MEDIUM"),
        ("GW-1012", "Percolation Tank", "intervention", "Kadapa", "verified", 14.4673, 78.8242, 0.84, "LOW"),
        ("GW-1052", "Sileru Reservoir Edge", "waterbody", "Alluri Sitharama Raju", "monitored", 18.1124, 83.4091, 0.90, "LOW"),
    ]
    for sid, name, ftype, loc, status, lat, lng, conf, pri in features:
        session.add(
            WatershedFeature(
                id=sid if sid.startswith("GW-1045") or sid.startswith("GW-1046") or sid.startswith("GW-1049") or sid.startswith("GW-1052") else sid,
                submission_id=sid if sid not in {"GW-1045", "GW-1046", "GW-1049", "GW-1052"} else None,
                name=name,
                feature_type=ftype,
                location=loc,
                status=status,
                lat=lat,
                lng=lng,
                confidence=conf,
                description=f"Local demo GIS feature for {name}.",
                priority=pri,
            )
        )

    profile = JalSaheliProfile(
        id="JS-001",
        name="Asha Patil",
        role="Lead Jal Saheli · Community Water Champion",
        village="Palamaner, Chittoor District, AP",
        phone="+91 98765 43210",
        badge="Platinum Verifier",
        jal_credits=274,
    )
    session.add(profile)
    session.add_all(
        [
            JalSaheliSubmission(
                id="JS-S-1012",
                profile_id="JS-001",
                core_submission_id="GW-1012",
                observation_type="percolation_tank",
                type_label="Percolation Tank",
                status=SubmissionStatus.VERIFIED,
                channel="web",
                credits=25,
                lat=14.4673,
                lng=78.8242,
                location_label="Rayachoti Block",
                notes="Verified recharge structure.",
                created_at=datetime(2026, 8, 30, 8, 0, tzinfo=UTC),
            ),
            JalSaheliSubmission(
                id="JS-S-1042",
                profile_id="JS-001",
                core_submission_id="GW-1042",
                observation_type="check_dam",
                type_label="Check Dam",
                status=SubmissionStatus.VERIFICATION_REQUIRED,
                channel="web",
                credits=0,
                lat=13.6288,
                lng=79.4192,
                location_label="Palamaner Mandal",
                notes="Awaiting officer verification.",
                created_at=datetime(2026, 9, 5, 9, 2, tzinfo=UTC),
            ),
        ]
    )
    await session.commit()
    logger.info("Demo dataset seeded")
