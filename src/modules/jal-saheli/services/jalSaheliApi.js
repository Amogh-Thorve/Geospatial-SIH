/**
 * jalSaheliApi.js
 * Jal Saheli module talks to the GeoWise API through this file.
 * Local mock files remain as schema references only.
 */

import { apiRequest } from '../../../services/api';
import {
  getEarnings as fetchEarningsLive,
  getProfile as fetchProfileLive,
  getSubmissions as fetchSubmissionsLive,
  submitObservation as postObservationLive,
} from '../../../services/jalSaheliService';
import { FORM_OBSERVATION_TYPES, buildVerificationTimeline } from '../data/mockSubmissions';
import { REWARD_SCHEDULE } from '../data/mockEarnings';
import { generateSubmissionId } from '../utils/submissionFlow';

function mapProfile(data) {
  const stats = data.stats || {};
  const initials = (data.name || 'JS')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return {
    id: data.id,
    name: data.name,
    initials,
    role: data.role,
    village: data.village,
    phone: data.phone,
    badge: data.badge,
    memberSince: '2024',
    jalCredits: data.jal_credits,
    stats: {
      totalSubmissions: stats.totalSubmissions ?? 0,
      verifiedCount: stats.verifiedCount ?? 0,
      pendingCount: stats.pendingCount ?? 0,
      rejectedCount: stats.rejectedCount ?? 0,
      accuracyRate: stats.accuracyRate ?? 0,
      accuracyRateDisplay: stats.accuracyRateDisplay ?? '0%',
      totalEarningsRaw: data.jal_credits,
      totalEarningsDisplay: `${data.jal_credits} Jal Credits`,
    },
    accuracyHistory: data.accuracy_history || [],
    provider: data.provider,
  };
}

function mapSubmission(row) {
  const status = (row.status || 'PENDING').toLowerCase();
  return {
    ...row,
    type: row.observation_type,
    typeLabel: row.type_label,
    date: row.created_at,
    location: { label: row.location_label, lat: row.lat, lng: row.lng },
    status,
    earnings: row.credits,
    earningsDisplay: row.earnings_display || `${row.credits} Jal Credits`,
    photoUrl: row.photo_url,
    coreSubmissionId: row.core_submission_id,
  };
}

export async function getProfile() {
  return mapProfile(await fetchProfileLive());
}

export async function getSubmissions() {
  const rows = await fetchSubmissionsLive();
  return Array.isArray(rows) ? rows.map(mapSubmission) : [];
}

export async function getSubmissionById(submissionId) {
  const rows = await getSubmissions();
  return rows.find((s) => s.id === submissionId) ?? null;
}

export async function getObservationTypes() {
  return [...FORM_OBSERVATION_TYPES];
}

export async function getVerificationTimeline(submissionId) {
  const submission = await getSubmissionById(submissionId);
  if (!submission) return [];
  return buildVerificationTimeline(submission);
}

export async function submitObservation({ observationType, location, photoFile, notes }) {
  const created = await postObservationLive({
    observationType,
    location,
    notes,
    channel: 'web',
  });
  return {
    submissionId: created.core_submission_id || created.id,
    jalSaheliId: created.id,
    receivedAt: created.created_at,
    observationType,
    location,
    notes: notes || '',
    hasPhoto: !!photoFile,
    status: created.status,
    provider: str = "GeoWise API"
  };
}

export async function analyzeObservation(submissionId) {
  const analysis = await apiRequest(`/api/submissions/${submissionId}/analysis`);
  return {
    submissionId,
    confidence: Math.round((analysis.confidence || 0) * 100),
    confidenceDisplay: `${Math.round((analysis.confidence || 0) * 100)}%`,
    classification: analysis.classification,
    provider: analysis.provider,
  };
}

export async function verifySatellite(submissionId) {
  const analysis = await apiRequest(`/api/submissions/${submissionId}/analysis`);
  return {
    submissionId,
    confidence: Math.round((analysis.confidence || 0) * 100),
    confidenceDisplay: `${Math.round((analysis.confidence || 0) * 100)}%`,
    result: analysis.satellite_match,
    provider: 'Srishti local adapter (demo)',
  };
}

export async function getVerificationResult(submissionId) {
  const analysis = await apiRequest(`/api/submissions/${submissionId}/analysis`);
  return {
    submissionId,
    status: analysis.submission_status,
    finalConfidence: Math.round((analysis.confidence || 0) * 100),
    finalConfidenceDisplay: `${Math.round((analysis.confidence || 0) * 100)}%`,
    reward: 0,
    rewardDisplay: 'Jal Credits after officer verification',
    resultText: analysis.change_detection,
  };
}

export function recordSubmission() {
  // Persistence is handled by the backend. Kept as a no-op for existing callers.
}

export async function getEarnings() {
  const data = await fetchEarningsLive();
  return (data.ledger || []).map((row) => ({
    ...row,
    amountDisplay: row.amountDisplay || `${row.amount} Jal Credits`,
    method: row.method || 'non-monetary stewardship score',
  }));
}

export async function getEarningsSummary() {
  const data = await fetchEarningsLive();
  return {
    totalCredited: data.total_credits,
    totalCreditedDisplay: `${data.total_credits} Jal Credits`,
    transactionCount: data.transaction_count,
    thisMonthAmount: data.total_credits,
    thisMonthDisplay: `${data.total_credits} Jal Credits`,
    byType: [],
    note: data.note,
    provider: data.provider,
  };
}

export function getRewardForType(typeId) {
  return REWARD_SCHEDULE[typeId] ?? 20;
}

export { generateSubmissionId };
