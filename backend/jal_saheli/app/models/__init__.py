"""
app/models/__init__.py
All ORM models — imported here for Alembic metadata discovery.

Alembic env.py must do:
    from app.models import *   # noqa: F401, F403
    target_metadata = Base.metadata
"""

from app.models.profile import CadreProfile
from app.models.submission import Submission, SubmissionStatus, REWARD_SCHEDULE, OBSERVATION_TYPE_LABELS
from app.models.earnings import EarningsLedger, EarningsStatus
from app.models.verification import VerificationEvent

__all__ = [
    "CadreProfile",
    "Submission",
    "SubmissionStatus",
    "REWARD_SCHEDULE",
    "OBSERVATION_TYPE_LABELS",
    "EarningsLedger",
    "EarningsStatus",
    "VerificationEvent",
]
