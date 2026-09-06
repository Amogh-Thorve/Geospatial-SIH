/**
 * SubmissionCard.jsx
 * Renders a single submission record as a compact row card.
 * Used in the "Recent Submissions" list on the dashboard.
 *
 * Props:
 *   submission   — one entry from MOCK_SUBMISSIONS (required)
 *   onClick      — optional callback when the card is clicked
 */

import React from 'react';
import { MapPin, Satellite, Brain, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import StatusBadge from '../../../components/common/StatusBadge';

// Channel icon
const channelIcon = {
  telegram: <Send className="w-3 h-3 text-sky-500" />,
  web: <Brain className="w-3 h-3 text-violet-500" />,
};

// Status colour map for earnings value
const earningsColor = {
  verified: 'text-emerald-700',
  pending: 'text-amber-600',
  rejected: 'text-slate-400 line-through',
};

// Status icon
function StatusIcon({ status }) {
  if (status === 'verified') return <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
  if (status === 'rejected') return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
}

export default function SubmissionCard({ submission, onClick }) {
  if (!submission) return null;

  const {
    id,
    typeLabel,
    dateDisplay,
    timeDisplay,
    location,
    status,
    aiConfidence,
    satelliteConfidence,
    earningsDisplay,
    channel,
  } = submission;

  const isClickable = !!onClick;

  return (
    <div
      onClick={isClickable ? () => onClick(submission) : undefined}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 border-b border-slate-100 last:border-0 ${isClickable ? 'cursor-pointer hover:bg-slate-50 rounded transition-colors -mx-1 px-1' : ''}`}
    >
      {/* Left: type + date + location */}
      <div className="flex items-start gap-3 min-w-0">
        {/* Channel icon pill */}
        <div className="mt-0.5 p-1.5 bg-slate-100 rounded shrink-0" title={channel}>
          {channelIcon[channel] || <Send className="w-3 h-3 text-slate-400" />}
        </div>

        <div className="min-w-0">
          {/* ID + type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900">{id}</span>
            <span className="text-xs text-slate-600 font-medium">• {typeLabel}</span>
          </div>
          {/* Date + location */}
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 flex-wrap">
            <span>{dateDisplay}{timeDisplay ? `, ${timeDisplay}` : ''}</span>
            {location?.label && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {location.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: confidences + status + earnings */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        {/* AI confidence */}
        {aiConfidence != null && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500" title="AI Confidence">
            <Brain className="w-3 h-3 text-violet-400 shrink-0" />
            {aiConfidence}%
          </span>
        )}

        {/* Satellite confidence */}
        {satelliteConfidence != null && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500" title="Satellite Confidence">
            <Satellite className="w-3 h-3 text-sky-400 shrink-0" />
            {satelliteConfidence}%
          </span>
        )}

        {/* Status */}
        <div className="flex items-center gap-1">
          <StatusIcon status={status} />
          <StatusBadge status={status} text={status.charAt(0).toUpperCase() + status.slice(1)} />
        </div>

        {/* Earnings */}
        <span className={`text-xs font-bold w-12 text-right ${earningsColor[status] || 'text-slate-700'}`}>
          {earningsDisplay}
        </span>
      </div>
    </div>
  );
}
