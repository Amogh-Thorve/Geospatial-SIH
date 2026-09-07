"""
tests/test_earnings_notifications.py
Comprehensive test suite for Phase 9: Real Earnings & Notification System.

Covers:
  - verified earning
  - rejected submission
  - pending submission
  - duplicate verification (idempotency)
  - notification failure (non-blocking fault tolerance)
  - language selection (English, Hindi, Marathi)
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy import select, func

from app.models.earnings import EarningsLedger, EarningsStatus
from app.models.profile import CadreProfile
from app.models.submission import Submission, SubmissionStatus
from app.services.earnings_policy import EarningsEligibilityResult, StandardEarningsPolicy
from app.services.earnings_service import EarningsService, process_submission_earnings
from app.services.notification_service import (
    NotificationEvent,
    NotificationService,
    get_notification_service,
)
from app.utils.telegram_i18n import format_notification, get_msg


@pytest.mark.asyncio
class TestEarningsPolicy:
    """Tests for EarningsPolicy business rules and eligibility."""

    def test_verified_submission_eligible(self):
        policy = StandardEarningsPolicy()
        sub = Submission(
            id="GW-TEST01",
            cadre_id="CAD-100",
            observation_type="farm_pond",
            type_label="Farm Pond",
            status=SubmissionStatus.VERIFIED,
        )
        result = policy.evaluate(sub)
        assert result.is_eligible is True
        assert result.amount == 25
        assert "Verified Farm Pond observation" in result.reason

    def test_rejected_submission_not_eligible(self):
        policy = StandardEarningsPolicy()
        sub = Submission(
            id="GW-TEST02",
            cadre_id="CAD-100",
            observation_type="check_dam",
            status=SubmissionStatus.REJECTED,
        )
        result = policy.evaluate(sub)
        assert result.is_eligible is False
        assert result.amount == 0
        assert "only 'verified' observations qualify" in result.reason

    def test_pending_submission_not_eligible(self):
        policy = StandardEarningsPolicy()
        sub = Submission(
            id="GW-TEST03",
            cadre_id="CAD-100",
            observation_type="borewell",
            status=SubmissionStatus.PENDING,
        )
        result = policy.evaluate(sub)
        assert result.is_eligible is False
        assert result.amount == 0

    def test_unknown_observation_type_fallback(self):
        policy = StandardEarningsPolicy()
        sub = Submission(
            id="GW-TEST04",
            cadre_id="CAD-100",
            observation_type="uncommon_tank",
            type_label="Uncommon Tank",
            status=SubmissionStatus.VERIFIED,
        )
        result = policy.evaluate(sub)
        assert result.is_eligible is True
        assert result.amount == 15  # Fallback to other rate (15)


@pytest.mark.asyncio
class TestEarningsServiceIdempotency:
    """Tests for EarningsService ledger management and duplicate protection."""

    async def test_duplicate_verification_cannot_create_duplicate_earnings(
        self, client: AsyncClient, registered_cadre: dict
    ):
        """
        Processing earnings multiple times for the same submission must return
        the existing record and never insert duplicate rows or inflate balances.
        """
        from app.db.database import get_session

        # 1. Create submission
        create_res = await client.post(
            "/api/jal-saheli/submissions",
            json={"observation_type": "farm_pond", "latitude": 24.5, "longitude": 73.5},
            headers=registered_cadre["headers"],
        )
        assert create_res.status_code == 201
        sub_id = create_res.json()["id"]

        async with get_session() as session:
            sub = (await session.execute(select(Submission).where(Submission.id == sub_id))).scalar_one()
            sub.status = SubmissionStatus.VERIFIED

            # First run: should create new ledger entry
            service = EarningsService()
            entry_1, is_new_1 = await service.process_submission_earnings(sub, session)
            assert entry_1 is not None
            assert is_new_1 is True
            assert entry_1.amount == 25
            assert entry_1.status == EarningsStatus.CREDITED
            await session.commit()

        # Check DB has exactly 1 entry
        async with get_session() as session:
            count_q = select(func.count(EarningsLedger.id)).where(EarningsLedger.submission_id == sub_id)
            count = (await session.execute(count_q)).scalar_one()
            assert count == 1

            # Second run: duplicate processing attempt
            sub_reload = (await session.execute(select(Submission).where(Submission.id == sub_id))).scalar_one()
            entry_2, is_new_2 = await service.process_submission_earnings(sub_reload, session)
            assert entry_2 is not None
            assert is_new_2 is False
            assert entry_2.id == entry_1.id
            assert entry_2.amount == entry_1.amount
            await session.commit()

        # Check DB still has strictly 1 entry
        async with get_session() as session:
            count = (await session.execute(count_q)).scalar_one()
            assert count == 1


@pytest.mark.asyncio
class TestLifecycleNotifications:
    """Tests for notification dispatch across verified, pending, and rejected states."""

    async def test_verified_earning_dispatches_notifications(self):
        """Verified submission triggers verification_completed and earning_recorded notifications."""
        notif = NotificationService()
        cadre = CadreProfile(
            id="CAD-NOTIF1",
            name="Asha Tai",
            phone="+919876543210",
            telegram_user_id=12345678,
            preferred_language="en",
        )
        sub = Submission(
            id="GW-NOTIF01",
            cadre_id="CAD-NOTIF1",
            observation_type="farm_pond",
            type_label="Farm Pond",
            status=SubmissionStatus.VERIFIED,
        )

        with patch("app.integrations.telegram_client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"status": "delivered", "chat_id": 12345678}

            # 1. Dispatch VERIFICATION_COMPLETED
            ok1 = await notif.notify(
                cadre=cadre,
                event=NotificationEvent.VERIFICATION_COMPLETED,
                submission=sub,
                context={
                    "status": "verified",
                    "ai_score": 92.0,
                    "sat_score": 95.0,
                    "final_score": 93.8,
                    "amount": 25,
                },
            )
            assert ok1 is True
            assert mock_send.call_count == 1
            sent_text1 = mock_send.call_args[0][1]
            assert "Observation Verified" in sent_text1
            assert "GW-NOTIF01" in sent_text1
            assert "₹25" in sent_text1

            # 2. Dispatch EARNING_RECORDED
            ok2 = await notif.notify(
                cadre=cadre,
                event=NotificationEvent.EARNING_RECORDED,
                submission=sub,
                context={"amount": 25, "txn_id": "TXN-998877"},
            )
            assert ok2 is True
            assert mock_send.call_count == 2
            sent_text2 = mock_send.call_args[0][1]
            assert "DBT Incentive Credited" in sent_text2
            assert "₹25" in sent_text2
            assert "TXN-998877" in sent_text2

    async def test_rejected_submission_notification(self):
        """Rejected submission triggers submission_rejected notification with reason."""
        notif = NotificationService()
        cadre = CadreProfile(
            id="CAD-NOTIF2",
            name="Radha Bai",
            phone="+919876543211",
            telegram_user_id=87654321,
            preferred_language="en",
        )
        sub = Submission(
            id="GW-REJ01",
            cadre_id="CAD-NOTIF2",
            observation_type="borewell",
            status=SubmissionStatus.REJECTED,
        )

        with patch("app.integrations.telegram_client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"status": "delivered", "chat_id": 87654321}

            ok = await notif.notify(
                cadre=cadre,
                event=NotificationEvent.SUBMISSION_REJECTED,
                submission=sub,
                context={"reason": "AI detected domestic indoor scene instead of borewell"},
            )
            assert ok is True
            sent_text = mock_send.call_args[0][1]
            assert "Submission Rejected" in sent_text
            assert "GW-REJ01" in sent_text
            assert "domestic indoor scene" in sent_text
            assert "Earnings: ₹0" in sent_text

    async def test_pending_submission_notification(self):
        """Pending submission triggers submission_pending notification requiring manual review."""
        notif = NotificationService()
        cadre = CadreProfile(
            id="CAD-NOTIF3",
            name="Meena Devi",
            phone="+919876543212",
            telegram_user_id=11223344,
            preferred_language="en",
        )
        sub = Submission(
            id="GW-PEN01",
            cadre_id="CAD-NOTIF3",
            observation_type="check_dam",
            status=SubmissionStatus.PENDING,
        )

        with patch("app.integrations.telegram_client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"status": "delivered", "chat_id": 11223344}

            ok = await notif.notify(
                cadre=cadre,
                event=NotificationEvent.SUBMISSION_PENDING,
                submission=sub,
                context={"reason": "Conflicting evidence between on-ground photo and satellite imagery"},
            )
            assert ok is True
            sent_text = mock_send.call_args[0][1]
            assert "Submission Pending Review" in sent_text
            assert "GW-PEN01" in sent_text
            assert "Requires manual review" in sent_text

    async def test_notification_failure_does_not_crash_caller(self):
        """
        When Telegram dispatch encounters network errors or API failures,
        notify() returns False and NEVER raises an exception.
        """
        notif = NotificationService()
        cadre = CadreProfile(
            id="CAD-FAIL1",
            name="Sunita",
            phone="+919876543213",
            telegram_user_id=99999999,
            preferred_language="en",
        )

        with patch("app.integrations.telegram_client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = ConnectionResetError("Connection reset by Telegram peer")

            # Must return False and not raise
            res = await notif.notify(
                cadre=cadre,
                event=NotificationEvent.SUBMISSION_RECEIVED,
                context={"sub_id": "GW-FAIL01", "type_label": "Check Dam"},
            )
            assert res is False


@pytest.mark.asyncio
class TestMultiLanguageSelection:
    """Tests for localized notification formatting in English, Hindi, and Marathi."""

    def test_language_selection_english(self):
        msg_earning = format_notification(
            "notif_earning_recorded",
            lang="en",
            sub_id="GW-EN01",
            amount=25,
            txn_id="TXN-EN01",
        )
        assert "DBT Incentive Credited" in msg_earning
        assert "₹25" in msg_earning
        assert "GW-EN01" in msg_earning

        msg_pending = format_notification(
            "notif_submission_pending",
            lang="en",
            sub_id="GW-EN02",
            reason="Cloud cover",
        )
        assert "Submission Pending Review" in msg_pending
        assert "Requires manual review" in msg_pending

    def test_language_selection_hindi(self):
        msg_earning = format_notification(
            "notif_earning_recorded",
            lang="hi",
            sub_id="GW-HI01",
            amount=25,
            txn_id="TXN-HI01",
        )
        assert "डीबीटी प्रोत्साहन राशि जमा" in msg_earning
        assert "₹25" in msg_earning
        assert "जन धन" in msg_earning

        msg_rejected = format_notification(
            "notif_submission_rejected",
            lang="hi",
            sub_id="GW-HI02",
            reason="चित्र में जल संरचना नहीं मिली",
        )
        assert "अवलोकन अस्वीकृत" in msg_rejected
        assert "चित्र में जल संरचना नहीं मिली" in msg_rejected

    def test_language_selection_marathi(self):
        msg_earning = format_notification(
            "notif_earning_recorded",
            lang="mr",
            sub_id="GW-MR01",
            amount=20,
            txn_id="TXN-MR01",
        )
        assert "डीबीटी प्रोत्साहन रक्कम जमा" in msg_earning
        assert "₹20" in msg_earning
        assert "जलसंधारणातील योगदानाबद्दल धन्यवाद" in msg_earning

        msg_pending = format_notification(
            "notif_submission_pending",
            lang="mr",
            sub_id="GW-MR02",
            reason="मानवी पडताळणी आवश्यक",
        )
        assert "निरीक्षण पुनरावलोकनासाठी प्रलंबित" in msg_pending
        assert "मानवी पुनरावलोकन आवश्यक आहे" in msg_pending

    async def test_cadre_language_respected_in_dispatch(self):
        """NotificationService correctly routes to cadre's preferred_language."""
        notif = NotificationService()
        cadre_mr = CadreProfile(
            id="CAD-MR1",
            name="Anandi Tai",
            phone="+919876543214",
            telegram_user_id=77777777,
            preferred_language="mr",
        )

        with patch("app.integrations.telegram_client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"status": "delivered", "chat_id": 77777777}

            await notif.notify(
                cadre=cadre_mr,
                event=NotificationEvent.PROCESSING_STARTED,
                context={"sub_id": "GW-MR99"},
            )
            sent_text = mock_send.call_args[0][1]
            assert "पडताळणी प्रक्रियेत आहे" in sent_text
            assert "GeoBrain-v3 AI" in sent_text
            assert "Sentinel-2" in sent_text
