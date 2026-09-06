/**
 * VerificationTimeline.jsx
 * Step-by-step visual audit trail showing the timeline of verification events:
 * 1. Observation Submitted
 * 2. Photo & Geotag Received
 * 3. AI Vision Analysis (GeoBrain-v3 92%)
 * 4. Sentinel-2 Satellite Audit (96%)
 * 5. Final Verification Decision (95%)
 * 6. Incentive Credited (₹25)
 *
 * Props:
 *   status        - string from SUBMISSION_STATES
 *   submissionId  - string (optional)
 *   reward        - number (default 25)
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

export default function VerificationTimeline({
  status,
  submissionId = 'GW-REF',
  reward = 25,
  location = null,
}) {
  // Determine state of each milestone
  const isSubmittedDone = status !== SUBMISSION_STATES.IDLE && status !== SUBMISSION_STATES.PHOTO_UPLOADED && status !== SUBMISSION_STATES.LOCATION_SET;
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
  const isAiRunning = status === SUBMISSION_STATES.PHOTO_RECEIVED || status === SUBMISSION_STATES.AI_PROCESSING;

  const isSatDone = [
    SUBMISSION_STATES.SATELLITE_COMPLETE,
    SUBMISSION_STATES.FINAL_VERIFICATION,
    SUBMISSION_STATES.VERIFIED,
    SUBMISSION_STATES.EARNINGS_ADDED,
  ].includes(status);
  const isSatRunning = status === SUBMISSION_STATES.AI_COMPLETE || status === SUBMISSION_STATES.SATELLITE_PROCESSING;

  const isVerifiedDone = [
    SUBMISSION_STATES.VERIFIED,
    SUBMISSION_STATES.EARNINGS_ADDED,
  ].includes(status);
  const isVerifiedRunning = status === SUBMISSION_STATES.SATELLITE_COMPLETE || status === SUBMISSION_STATES.FINAL_VERIFICATION;

  const isEarningsDone = status === SUBMISSION_STATES.EARNINGS_ADDED;
  const isEarningsRunning = status === SUBMISSION_STATES.VERIFIED;

  const locLabel = location?.label ? ` · ${location.label}` : '';

  const milestones = [
    {
      id: 'submitted',
      icon: Camera,
      title: 'Observation Submitted',
      description: 'Geotagged ground photo submitted from field by Jal Saheli cadre',
      detail: `Ref: ${submissionId}${locLabel}`,
      isDone: isSubmittedDone,
      isRunning: false,
    },
    {
      id: 'photo_received',
      icon: CheckCircle2,
      title: 'Photo Payload Accepted',
      description: 'Image hash validated, EXIF GPS coordinates authenticated',
      detail: 'SHA-256 Verified · Coordinate bounds within Maharashtra zone',
      isDone: isPhotoReceivedDone,
      isRunning: isPhotoReceivedRunning,
    },
    {
      id: 'ai',
      icon: Brain,
      title: 'GeoBrain-v3 AI Classification',
      description: 'Vision Transformer deep feature extraction & shoreline segmentation',
      detail: isAiDone ? '92% Confidence · Water Body feature confirmed' : 'Analyzing image textures & contours…',
      isDone: isAiDone,
      isRunning: isAiRunning,
    },
    {
      id: 'satellite',
      icon: Satellite,
      title: 'Sentinel-2 Satellite Audit',
      description: 'Copernicus multispectral pass cross-correlation (10m resolution)',
      detail: isSatDone ? '96% Confidence · NDWI +0.38 open water confirmed' : 'Querying coordinate tile…',
      isDone: isSatDone,
      isRunning: isSatRunning,
    },
    {
      id: 'verified',
      icon: ShieldCheck,
      title: 'Final Consensus Verified',
      description: 'Dual-engine synthesis exceeds 85% automated verification bar',
      detail: isVerifiedDone ? '95% Final Confidence Score · Approved ✓' : 'Synthesizing AI & satellite metrics…',
      isDone: isVerifiedDone,
      isRunning: isVerifiedRunning,
    },
    {
      id: 'earnings',
      icon: IndianRupee,
      title: 'Incentive Credited',
      description: `Direct cadre reward credited to Jan Dhan / UPI ledger`,
      detail: isEarningsDone ? `₹${reward} Disbursed via Direct Benefit Transfer` : 'Preparing payout ledger entry…',
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
            Verification Lifecycle Audit Trail
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Deterministic Demo Log
        </span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {milestones.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.id} className="relative group">
              {/* Timeline marker icon */}
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

              {/* Text content */}
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
                      In Progress
                    </span>
                  )}
                  {m.isDone && (
                    <span className="text-[9px] font-bold text-emerald-600">✓ Done</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {m.description}
                </p>
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
