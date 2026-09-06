/**
 * AccuracyScore.jsx
 * Displays the Jal Saheli's accuracy rate as an SVG progress ring
 * plus a sparkline-style bar chart of recent per-submission accuracy scores.
 *
 * Requirements:
 * - When data is unavailable or user has no verifications: show "Accuracy unavailable" / "Not enough data".
 * - Never fabricate or hardcode 94%.
 *
 * Props:
 *   accuracyRate     — number | null (e.g. 95)
 *   accuracyDisplay  — string | null (e.g. '95%')
 *   history          — array of { label, score } (oldest → newest)
 */

import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

function scoreColor(rate) {
  if (rate == null) return { ring: 'text-slate-300', bg: 'bg-slate-300', label: 'text-slate-500', badge: 'bg-slate-50 border-slate-200 text-slate-600' };
  if (rate >= 90) return { ring: 'text-emerald-600', bg: 'bg-emerald-600', label: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
  if (rate >= 75) return { ring: 'text-amber-500', bg: 'bg-amber-500', label: 'text-amber-700', badge: 'bg-amber-50 border-amber-200 text-amber-700' };
  return { ring: 'text-rose-500', bg: 'bg-rose-500', label: 'text-rose-700', badge: 'bg-rose-50 border-rose-200 text-rose-700' };
}

export default function AccuracyScore({
  accuracyRate = null,
  accuracyDisplay = null,
  history = [],
}) {
  const hasData = typeof accuracyRate === 'number' && !isNaN(accuracyRate);
  const colors = scoreColor(hasData ? accuracyRate : null);
  const maxScore = 100;

  // SVG ring parameters
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const safeRate = hasData ? Math.min(Math.max(accuracyRate, 0), 100) : 0;
  const filled = (safeRate / maxScore) * circumference;
  const gap = circumference - filled;

  const displayVal = hasData ? (accuracyDisplay || `${accuracyRate}%`) : 'N/A';

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className={`w-4 h-4 shrink-0 ${hasData ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Accuracy Score</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${colors.badge}`}>
          {!hasData ? 'Not enough data' : accuracyRate >= 90 ? 'Excellent' : accuracyRate >= 75 ? 'Good' : 'Needs Review'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG ring */}
        <div className="shrink-0 relative w-20 h-20">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            {/* Track */}
            <circle cx="40" cy="40" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
            {/* Progress */}
            {hasData && (
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${gap}`}
                className={colors.ring}
                stroke="currentColor"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-base font-bold leading-none ${colors.label}`}>
              {displayVal}
            </span>
          </div>
        </div>

        {/* Details or Sparkline */}
        <div className="flex-1 min-w-0 w-full">
          {!hasData || history.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Accuracy score pending verification</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calculated automatically once observations undergo AI and satellite verification.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2">
                Last {history.length} verified submissions
              </p>
              <div className="flex items-end gap-1 h-10">
                {history.map((entry, i) => {
                  const heightPct = Math.round((entry.score / 100) * 40);
                  const isLast = i === history.length - 1;
                  return (
                    <div
                      key={entry.label || i}
                      className="flex-1 relative group"
                      style={{ height: '40px', display: 'flex', alignItems: 'flex-end' }}
                      title={`${entry.label}: ${entry.score}%`}
                    >
                      <div
                        className={`w-full rounded-sm transition-opacity ${
                          isLast ? colors.bg : 'bg-slate-300'
                        } ${isLast ? '' : 'group-hover:bg-slate-400'}`}
                        style={{ height: `${heightPct}px`, minHeight: '4px' }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Older → Newer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
