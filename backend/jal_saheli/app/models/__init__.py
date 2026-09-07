"""ORM model package. Import entities so metadata.create_all discovers them."""

from app.models.entities import (
    AnalysisResult,
    FeedbackRecord,
    JalSaheliProfile,
    JalSaheliSubmission,
    Recommendation,
    Submission,
    VerificationTask,
    WatershedFeature,
)

__all__ = [
    "AnalysisResult",
    "FeedbackRecord",
    "JalSaheliProfile",
    "JalSaheliSubmission",
    "Recommendation",
    "Submission",
    "VerificationTask",
    "WatershedFeature",
]
