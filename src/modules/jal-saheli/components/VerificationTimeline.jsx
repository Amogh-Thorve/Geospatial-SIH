/**
 * VerificationTimeline.jsx
 * Audit trail built from persisted backend analysis (no fabricated metrics).
 *
 * Props:
 *   status        - string from SUBMISSION_STATES
 *   submissionId  - string (optional)
 *   reward        - number | null (only shown when backend provides a reward)
 *   location      - location object (optional)
 *   analysis      - verification result / analysis object from API (optional)
 */

import React from 'react';
import {
  Camera,
  CheckCircle2,
  Brain,
  Satellite,
  ShieldCheck,
  IndianRupee,
  Loader2,
  Clock,
} from 'lucide-react';
import { SUBMISSION_STATES } from '../utils/submissionFlow';
import {
  formatConfidenceLabel,
  formatNdviNdwi,
  formatSatelliteSourceLabel,
} from '../utils/analysisDisplay';

function confidenceDetail(confidence) {
  const label = formatConfidenceLabel(confidence);
  return label === 'Confidence unavailable' ? label : label.replace('Confidence: ', '');
}

export default function VerificationTimeline({
  status,
  submissionId = 'GW-REF',
  reward = null,
  location = null,
  analysis = null,
}) {
  const isSubmittedDone =
    status !== SUBMISSION_STATES.IDLE &&
    status !== SUBMISSION_STATES.PHOTO_UPLOADED &&
    status !== SUBMISSION_STATES.LOCATION_SET;
  const isPhotoReceivedDone = isSubmittedDone && status !== SUBMISSION_STATES.SUBMITTED;
  const isPhotoReceivedRunning = status === SUBMISSION_STATES.SUBMITTED;

  const isAiDone = [
    SUBMISSION_STATES.AI_COMPLETE,
    SUBMISSION_STATES.SATELLITE_PROCESSING,
    SUBMISSION_STATES.SATELLITE_COMPLETE,
    SUBMISSION_STATES.FINAL_VERIFICATION,
    SUBMISSION_STATES.VERIFIED,
    SUBMISSION_STATES.EARNINGS_ADDED,
  ].includes(status);
  const isAiRunning =
    status === SUBMISSION_STATES.PHOTO_RECEIVED || status === SUBMISSION_STATES.AI_PROCESSING;

  const isSatDone = [
    SUBMISSION_STATES.SATELLITE_COMPLETE,
    SUBMISSION_STATES.FINAL_VERIFICATION,
    SUBMISSION_STATES.VERIFIED,
    SUBMISSION_STATES.EARNINGS_ADDED,
  ].includes(status);
  const isSatRunning =
    status === SUBMISSION_STATES.AI_COMPLETE || status === SUBMISSION_STATES.SATELLITE_PROCESSING;

  const isVerifiedDone = [
    SUBMISSION_STATES.VERIFIED,
    SUBMISSION_STATES.EARNINGS_ADDED,
  ].includes(status);
  const isVerifiedRunning =
    status === SUBMISSION_STATES.SATELLITE_COMPLETE ||
    status === SUBMISSION_STATES.FINAL_VERIFICATION;

  const isEarningsDone = status === SUBMISSION_STATES.EARNINGS_ADDED;
  const isEarningsRunning = status === SUBMISSION_STATES.VERIFIED;

  const locLabel = location?.label ? ` · ${location.label}` : '';
  const provider = analysis?.provider || 'Unavailable';
  const lulc = analysis?.lulc || analysis?.classification || 'Unavailable';
  const aiConfDetail = isAiDone
    ? `${confidenceDetail(analysis?.aiConfidence)} · LULC: ${lulc}`
    : 'Running backend Geo AI…';
  const satSource = formatSatelliteSourceLabel(analysis) || 'Local satellite grid';
  const satDetail = isSatDone
    ? `Source: ${satSource} · NDVI ${formatNdviNdwi(analysis?.ndvi)} · NDWI ${formatNdviNdwi(analysis?.ndwi)}${
        analysis?.satelliteMatch ? ` · ${analysis.satelliteMatch}` : ''
      }`
    : 'Querying local satellite grid…';
  const verifyDetail = isVerifiedDone
    ? [
        analysis?.status ? `Status: ${analysis.status}` : null,
        analysis?.satelliteMatch ? `Discrepancy: ${analysis.satelliteMatch}` : null,
        analysis?.recommendation ? `Recommendation: ${analysis.recommendation}` : null,
        analysis?.changeDetection || null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Analysis stored'
    : 'Awaiting backend verification…';
  const hasReward = reward != null && reward > 0;
  const earningsDetail = isEarningsDone
    ? hasReward
      ? `₹${reward} credited`
      : 'No DBT reward from backend'
    : hasReward
    ? 'Preparing payout…'
    : 'No incentive recorded';

  const milestones = [
    {
      id: 'submitted',
      icon: Camera,
      title: 'Observation submitted',
      description: 'Geotagged ground photo sent to unified backend',
      detail: `Ref: ${submissionId}${locLabel}`,
      isDone: isSubmittedDone,
      isRunning: false,
    },
    {
      id: 'photo_received',
      icon: CheckCircle2,
      title: 'Submission accepted',
      description: 'Payload received and queued for Geo AI analysis',
      detail: isPhotoReceivedDone ? 'Stored for analysis' : 'Accepting submission…',
      isDone: isPhotoReceivedDone,
      isRunning: isPhotoReceivedRunning,
    },
    {
      id: 'ai',
      icon: Brain,
      title: 'Geo AI analysis',
      description: provider !== 'Unavailable' ? `Provider: ${provider}` : 'Backend Geo AI pipeline',
      detail: aiConfDetail,
      isDone: isAiDone,
      isRunning: isAiRunning,
    },
    {
      id: 'satellite',
      icon: Satellite,
      title: 'Satellite grid lookup',
      description: 'Local satellite_lookup.npz (not live Bhuvan/Srishti)',
      detail: satDetail,
      isDone: isSatDone,
      isRunning: isSatRunning,
    },
    {
      id: 'verified',
      icon: ShieldCheck,
      title: 'Verification outcome',
      description: 'Persisted analysis from unified backend',
      detail: verifyDetail,
      isDone: isVerifiedDone,
      isRunning: isVerifiedRunning,
    },
    {
      id: 'earnings',
      icon: IndianRupee,
      title: 'Incentive',
      description: hasReward
        ? 'Direct cadre reward when returned by backend'
        : 'No monetary reward unless backend provides one',
      detail: earningsDetail,
      isDone: isEarningsDone,
      isRunning: isEarningsRunning,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Verification audit trail
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">API-backed</span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {milestones.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.id} className="relative group">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                  m.isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : m.isRunning
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {m.isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : m.isRunning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon className="w-2.5 h-2.5" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs font-bold ${
                      m.isDone
                        ? 'text-slate-900'
                        : m.isRunning
                        ? 'text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.title}
                  </p>
                  {m.isRunning && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded animate-pulse">
                      In progress
                    </span>
                  )}
                  {m.isDone && (
                    <span className="text-[9px] font-bold text-emerald-600">✓ Done</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>
                <p
                  className={`text-[10px] font-medium font-mono ${
                    m.isDone ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {m.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
