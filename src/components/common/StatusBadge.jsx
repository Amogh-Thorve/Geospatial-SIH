import React from 'react';

/**
 * StatusBadge — generic semantic status indicator.
 *
 * Props:
 *   status — string — key used to pick a style (case-insensitive)
 *   text   — string — display label (falls back to status if omitted)
 *
 * Supported status keys:
 *   success, verified, active
 *   warning, medium, pending, in-review
 *   high, danger, critical, flagged, rejected
 *   low, neutral, info
 *   (unknown keys fall back to info styling)
 */
const statusStyles = {
  // Green — success / verified / active
  success:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  verified:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',

  // Amber — warning / medium priority / pending / in-review
  warning:   'bg-amber-50  text-amber-700  border-amber-200',
  medium:    'bg-amber-50  text-amber-700  border-amber-200',
  pending:   'bg-amber-50  text-amber-700  border-amber-200',
  'in-review': 'bg-amber-50 text-amber-700 border-amber-200',

  // Rose / Red — high priority / danger / critical / flagged / rejected
  high:      'bg-rose-50   text-rose-700   border-rose-200',
  danger:    'bg-rose-50   text-rose-700   border-rose-200',
  critical:  'bg-rose-50   text-rose-700   border-rose-200',
  flagged:   'bg-rose-50   text-rose-700   border-rose-200',
  rejected:  'bg-rose-50   text-rose-700   border-rose-200',

  // Slate — low priority / neutral
  low:       'bg-slate-100 text-slate-600  border-slate-200',
  neutral:   'bg-slate-100 text-slate-600  border-slate-200',

  // Sky — info / general
  info:      'bg-sky-50    text-sky-700    border-sky-200',
};

export default function StatusBadge({ status, text }) {
  const key = (status || text || 'info').toLowerCase().replace(/\s+/g, '-');
  const style = statusStyles[key] ?? statusStyles.info;
  const label = text || status || 'Info';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${style}`}
      aria-label={`Status: ${label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" aria-hidden="true" />
      {label}
    </span>
  );
}
