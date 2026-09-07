"""
app/services/earnings_policy.py
Defines the business policy and rules governing cadre incentive eligibility and amounts.

Flow:
    Verification Outcome
            ↓
       Eligibility
            ↓
     Earnings Policy
            ↓
      Earning Record
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging

from app.models.submission import Submission, SubmissionStatus, REWARD_SCHEDULE

logger = logging.getLogger("jal_saheli.services.earnings_policy")


@dataclass(frozen=True)
class EarningsEligibilityResult:
    """Result of an earnings policy evaluation."""
    is_eligible: bool
    amount: int
    reason: str


class EarningsPolicy(ABC):
    """Abstract interface for calculating earnings eligibility and amounts."""

    @abstractmethod
    def evaluate(self, submission: Submission) -> EarningsEligibilityResult:
        """
        Evaluate if a submission is eligible for earnings and calculate the amount.
        """
        pass


class StandardEarningsPolicy(EarningsPolicy):
    """
    Standard policy for Jal Saheli field cadre incentives:
    - Only VERIFIED submissions are eligible.
    - Base amount is determined by REWARD_SCHEDULE for the observation type.
    - REJECTED, PENDING, or PROCESSING observations receive 0.
    """

    def __init__(self, reward_schedule: dict[str, int] | None = None) -> None:
        self.reward_schedule = reward_schedule or REWARD_SCHEDULE

    def evaluate(self, submission: Submission) -> EarningsEligibilityResult:
        # Check verification status
        if submission.status != SubmissionStatus.VERIFIED:
            return EarningsEligibilityResult(
                is_eligible=False,
                amount=0,
                reason=f"Submission status is {submission.status.value}, only 'verified' observations qualify for incentives."
            )

        # Lookup base amount for observation type
        obs_type = submission.observation_type or "other"
        amount = self.reward_schedule.get(obs_type, self.reward_schedule.get("other", 15))

        if amount <= 0:
            return EarningsEligibilityResult(
                is_eligible=False,
                amount=0,
                reason=f"No reward allocated for observation type '{obs_type}'."
            )

        type_name = submission.type_label or obs_type.replace("_", " ").title()
        return EarningsEligibilityResult(
            is_eligible=True,
            amount=amount,
            reason=f"Verified {type_name} observation (base incentive ₹{amount})."
        )
