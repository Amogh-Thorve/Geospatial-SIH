import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.models.submission import Submission, SubmissionStatus
from app.services.verification_service import run_full_verification

class MockAIRes:
    def __init__(self, confidence, status="AI_OK"):
        self.res = {"confidence": confidence, "status": status}
    
class MockSatRes:
    def __init__(self, confidence, status="SATELLITE_OK"):
        self.res = {"satellite_confidence": confidence, "status": status}

@pytest.fixture
def mock_submission():
    return Submission(
        id="GW-TEST-001",
        cadre_id="cadre_1",
        observation_type="water_body",
    )

@pytest.fixture
def mock_db():
    db = AsyncMock()
    # mock exist_er scalar_one_or_none for ledger check
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=mock_result)
    db.flush = AsyncMock()
    db.add = MagicMock()
    return db

@pytest.mark.asyncio
async def test_rule_1_provider_unavailable(mock_submission, mock_db):
    with patch("app.services.verification_service.analyze_submission", return_value=MockAIRes(0, "AI_UNAVAILABLE").res), \
         patch("app.services.verification_service.verify_submission", return_value=MockSatRes(80).res):
        
        res = await run_full_verification(mock_submission, mock_db)
        
        assert res["status"] == SubmissionStatus.PROCESSING.value
        assert "Provider unavailable" in res["resultText"]
        assert mock_submission.status == SubmissionStatus.PROCESSING # Because PENDING mapped to PROCESSING

@pytest.mark.asyncio
async def test_rule_2_ai_rejected(mock_submission, mock_db):
    with patch("app.services.verification_service.analyze_submission", return_value=MockAIRes(20).res), \
         patch("app.services.verification_service.verify_submission", return_value=MockSatRes(90).res):
        
        res = await run_full_verification(mock_submission, mock_db)
        
        assert res["status"] == SubmissionStatus.REJECTED.value
        assert "strongly indicates the photo does not match" in res["resultText"]
        assert mock_submission.status == SubmissionStatus.REJECTED

@pytest.mark.asyncio
async def test_rule_3_conflicting_evidence(mock_submission, mock_db):
    with patch("app.services.verification_service.analyze_submission", return_value=MockAIRes(80).res), \
         patch("app.services.verification_service.verify_submission", return_value=MockSatRes(30).res):
        
        res = await run_full_verification(mock_submission, mock_db)
        
        assert res["status"] == SubmissionStatus.PROCESSING.value
        assert "Conflicting evidence" in res["resultText"]

@pytest.mark.asyncio
async def test_rule_4_dual_confirmation(mock_submission, mock_db):
    with patch("app.services.verification_service.analyze_submission", return_value=MockAIRes(75).res), \
         patch("app.services.verification_service.verify_submission", return_value=MockSatRes(85).res):
        
        res = await run_full_verification(mock_submission, mock_db)
        
        assert res["status"] == SubmissionStatus.VERIFIED.value
        assert "Dual-engine consensus verified" in res["resultText"]

@pytest.mark.asyncio
async def test_rule_5_default_mediocre(mock_submission, mock_db):
    with patch("app.services.verification_service.analyze_submission", return_value=MockAIRes(50).res), \
         patch("app.services.verification_service.verify_submission", return_value=MockSatRes(50).res):
        
        res = await run_full_verification(mock_submission, mock_db)
        
        assert res["status"] == SubmissionStatus.PROCESSING.value
        assert "Evidence is inconclusive" in res["resultText"]
