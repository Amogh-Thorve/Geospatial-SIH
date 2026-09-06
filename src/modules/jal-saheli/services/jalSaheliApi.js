/**
 * jalSaheliApi.js
 * API abstraction layer for the Jal Saheli module.
 *
 * ALL data access from UI components goes through these functions.
 * Real backend integration point:
 *   Configurable via VITE_API_BASE_URL (defaults to in-memory session mode when unconfigured).
 *   Future backend routes live under: backend/jal_saheli/
 */

import { MOCK_PROFILE } from '../data/mockProfile';
import { MOCK_SUBMISSIONS, FORM_OBSERVATION_TYPES, buildVerificationTimeline } from '../data/mockSubmissions';
import { MOCK_EARNINGS_LEDGER, MOCK_EARNINGS_SUMMARY, REWARD_SCHEDULE } from '../data/mockEarnings';
import { DEMO_RESULT, generateSubmissionId } from '../utils/submissionFlow';

// Optional backend URL from environment
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

// Utility: simulate realistic network latency
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Fetch the currently active Jal Saheli profile.
 * In production: GET /api/jal-saheli/profile
 * @returns {Promise<object>}
 */
export async function getProfile() {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/profile`);
      if (res.ok) return await res.json();
    } catch {
      // Graceful fallback to session state if backend is unreachable
    }
  }
  await delay(180);
  return { ...MOCK_PROFILE, stats: { ...MOCK_PROFILE.stats }, accuracyHistory: [...MOCK_PROFILE.accuracyHistory] };
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

/**
 * Fetch all ground observation submissions for the current cadre.
 * In production: GET /api/jal-saheli/submissions
 * @returns {Promise<Array>}
 */
export async function getSubmissions() {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions`);
      if (res.ok) return await res.json();
    } catch {
      // Graceful fallback to session state
    }
  }
  await delay(200);
  return [...MOCK_SUBMISSIONS];
}

/**
 * Fetch a single submission by ID.
 * @param {string} submissionId
 * @returns {Promise<object|null>}
 */
export async function getSubmissionById(submissionId) {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }
  await delay(120);
  return MOCK_SUBMISSIONS.find((s) => s.id === submissionId) ?? null;
}

/**
 * Get available observation categories with their reward amounts.
 * @returns {Promise<Array>}
 */
export async function getObservationTypes() {
  await delay(100);
  return [...FORM_OBSERVATION_TYPES];
}

/**
 * Get verification timeline events for a submission.
 * @param {string} submissionId
 * @returns {Promise<Array>}
 */
export async function getVerificationTimeline(submissionId) {
  await delay(120);
  const submission = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
  if (!submission) return [];
  return buildVerificationTimeline(submission);
}

// ---------------------------------------------------------------------------
// Submission Pipeline
// ---------------------------------------------------------------------------

/**
 * Submit a new field observation.
 * In production: POST /api/jal-saheli/submissions
 *
 * @param {{ observationType, location, photoFile, notes }} payload
 * @returns {Promise<{ submissionId: string, receivedAt: string, observationType, location, hasPhoto: boolean }>}
 */
export async function submitObservation({ observationType, location, photoFile, notes }) {
  if (API_BASE_URL) {
    try {
      const formData = new FormData();
      if (photoFile) formData.append('photo', photoFile);
      formData.append('observationType', typeof observationType === 'object' ? observationType.id : observationType);
      if (location) formData.append('location', JSON.stringify(location));
      if (notes) formData.append('notes', notes);

      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback to local session ID generation
    }
  }

  await delay(300);
  const submissionId = generateSubmissionId();
  return {
    submissionId,
    receivedAt: new Date().toISOString(),
    observationType,
    location,
    notes: notes || '',
    hasPhoto: !!photoFile,
  };
}

/**
 * Fetch AI analysis result for an observation.
 * In production: GET /api/jal-saheli/submissions/:id/ai-result
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
export async function analyzeObservation(submissionId) {
  await delay(100);
  return {
    submissionId,
    confidence: DEMO_RESULT.aiConfidence,
    confidenceDisplay: DEMO_RESULT.aiConfidenceDisplay,
    classification: DEMO_RESULT.aiClassification,
  };
}

/**
 * Fetch satellite verification result for an observation.
 * In production: GET /api/jal-saheli/submissions/:id/satellite-result
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
export async function verifySatellite(submissionId) {
  await delay(100);
  return {
    submissionId,
    confidence: DEMO_RESULT.satelliteConfidence,
    confidenceDisplay: DEMO_RESULT.satelliteConfidenceDisplay,
    result: DEMO_RESULT.satelliteResult,
  };
}

/**
 * Fetch final verification decision.
 * In production: GET /api/jal-saheli/submissions/:id/verification
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
export async function getVerificationResult(submissionId) {
  await delay(100);
  const found = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
  if (found?.verificationResult) {
    return found.verificationResult;
  }
  return {
    submissionId,
    status: DEMO_RESULT.status,
    finalConfidence: DEMO_RESULT.finalConfidence,
    finalConfidenceDisplay: DEMO_RESULT.finalConfidenceDisplay,
    reward: DEMO_RESULT.reward,
    rewardDisplay: DEMO_RESULT.rewardDisplay,
    resultText: DEMO_RESULT.resultText,
  };
}

/**
 * Record a verified submission in the local in-memory session store.
 * Updates MOCK_SUBMISSIONS, MOCK_EARNINGS_LEDGER, MOCK_EARNINGS_SUMMARY, and MOCK_PROFILE
 * so that dashboard, history, and earnings reflect the newly verified report immediately.
 *
 * @param {object} submission
 */
export function recordSubmission(submission) {
  if (!submission || !submission.id) return;

  const rewardAmount = typeof submission.reward === 'number' ? submission.reward : (submission.earnings || 25);
  const typeId = submission.type || 'water_body';
  const typeLabel = submission.typeLabel || 'Water Body';

  const subRecord = {
    id: submission.id,
    submitterId: submission.submitterId || MOCK_PROFILE.id,
    type: typeId,
    typeLabel,
    date: submission.date || new Date().toISOString().split('T')[0],
    dateDisplay: submission.dateDisplay || new Date().toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }),
    timeDisplay: submission.timeDisplay || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    location: submission.location || { label: 'Field Location', lat: null, lng: null },
    photoUrl: submission.photoUrl || submission.photo?.previewUrl || null,
    channel: submission.channel || 'web',
    status: submission.status || 'verified',
    aiConfidence: submission.aiConfidence ?? 92,
    satelliteConfidence: submission.satelliteConfidence ?? 96,
    finalConfidence: submission.finalConfidence ?? 95,
    earnings: rewardAmount,
    earningsDisplay: `₹${rewardAmount}`,
    verifiedBy: submission.status === 'verified' ? 'Automated Pipeline (GeoBrain + Sentinel-2)' : null,
    verifiedAt: submission.verifiedAt || new Date().toISOString(),
    notes: submission.notes || 'Dual-engine consensus verified.',
    verificationResult: submission.verificationResult || null,
  };

  // 1. Update MOCK_SUBMISSIONS
  const existingIdx = MOCK_SUBMISSIONS.findIndex((s) => s.id === subRecord.id);
  if (existingIdx >= 0) {
    MOCK_SUBMISSIONS[existingIdx] = { ...MOCK_SUBMISSIONS[existingIdx], ...subRecord };
  } else {
    MOCK_SUBMISSIONS.unshift(subRecord);
  }

  // 2. Update MOCK_EARNINGS_LEDGER & MOCK_EARNINGS_SUMMARY
  if (subRecord.status === 'verified' && rewardAmount > 0) {
    const existingTxn = MOCK_EARNINGS_LEDGER.find((t) => t.submissionId === subRecord.id);
    if (!existingTxn) {
      const newTxn = {
        id: `TXN-${Date.now().toString().slice(-6)}`,
        submissionId: subRecord.id,
        type: subRecord.type,
        typeLabel: subRecord.typeLabel,
        date: subRecord.date,
        dateDisplay: subRecord.dateDisplay,
        amount: rewardAmount,
        amountDisplay: `₹${rewardAmount}`,
        status: 'credited',
        method: 'UPI / Jan Dhan',
        note: 'Cadre incentive for verified observation',
      };
      MOCK_EARNINGS_LEDGER.unshift(newTxn);

      // Recalculate summary
      MOCK_EARNINGS_SUMMARY.totalCredited = MOCK_EARNINGS_LEDGER.reduce(
        (sum, t) => sum + (t.status === 'credited' ? t.amount : 0),
        0
      );
      MOCK_EARNINGS_SUMMARY.totalCreditedDisplay = `₹${MOCK_EARNINGS_SUMMARY.totalCredited.toLocaleString('en-IN')}`;
      MOCK_EARNINGS_SUMMARY.transactionCount = MOCK_EARNINGS_LEDGER.length;
      MOCK_EARNINGS_SUMMARY.thisMonthAmount += rewardAmount;
      MOCK_EARNINGS_SUMMARY.thisMonthDisplay = `₹${MOCK_EARNINGS_SUMMARY.thisMonthAmount.toLocaleString('en-IN')}`;

      // Recalculate breakdown by type
      const countsByType = {};
      MOCK_EARNINGS_LEDGER.forEach((t) => {
        const key = t.typeLabel || t.type;
        if (!countsByType[key]) {
          countsByType[key] = { type: key, total: 0, count: 0, color: 'emerald' };
        }
        countsByType[key].total += t.amount;
        countsByType[key].count += 1;
      });
      MOCK_EARNINGS_SUMMARY.byType = Object.values(countsByType);
    }
  }

  // 3. Update MOCK_PROFILE stats
  if (MOCK_PROFILE?.stats) {
    MOCK_PROFILE.stats.totalSubmissions = MOCK_SUBMISSIONS.length;
    MOCK_PROFILE.stats.verifiedCount = MOCK_SUBMISSIONS.filter((s) => s.status === 'verified').length;
    MOCK_PROFILE.stats.pendingCount = MOCK_SUBMISSIONS.filter((s) => s.status === 'pending').length;
    MOCK_PROFILE.stats.rejectedCount = MOCK_SUBMISSIONS.filter((s) => s.status === 'rejected').length;

    if (MOCK_PROFILE.stats.totalSubmissions > 0) {
      MOCK_PROFILE.stats.accuracyRate = Math.round(
        (MOCK_PROFILE.stats.verifiedCount / MOCK_PROFILE.stats.totalSubmissions) * 100
      );
      MOCK_PROFILE.stats.accuracyRateDisplay = `${MOCK_PROFILE.stats.accuracyRate}%`;
    }

    MOCK_PROFILE.stats.totalEarningsRaw = MOCK_EARNINGS_SUMMARY.totalCredited;
    MOCK_PROFILE.stats.totalEarningsDisplay = MOCK_EARNINGS_SUMMARY.totalCreditedDisplay;

    if (subRecord.finalConfidence && Array.isArray(MOCK_PROFILE.accuracyHistory)) {
      MOCK_PROFILE.accuracyHistory.push({
        label: subRecord.id,
        score: subRecord.finalConfidence,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

/**
 * Fetch full earnings ledger for current cadre.
 * In production: GET /api/jal-saheli/earnings
 * @returns {Promise<Array>}
 */
export async function getEarnings() {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/earnings`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }
  await delay(180);
  return [...MOCK_EARNINGS_LEDGER];
}

/**
 * Fetch earnings summary (totals, type breakdown).
 * In production: GET /api/jal-saheli/earnings/summary
 * @returns {Promise<object>}
 */
export async function getEarningsSummary() {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jal-saheli/earnings/summary`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }
  await delay(150);
  return { ...MOCK_EARNINGS_SUMMARY };
}

/**
 * Look up reward amount for an observation type id.
 * @param {string} typeId
 * @returns {number}
 */
export function getRewardForType(typeId) {
  return REWARD_SCHEDULE[typeId] ?? 20;
}
