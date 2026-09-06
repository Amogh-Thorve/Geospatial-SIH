import React from 'react';

const statusStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  flagged: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  pending: 'bg-sky-50 text-sky-700 border-sky-200'
};

export default function StatusBadge({ status, text }) {
  const normalizedKey = (status || text || 'info').toLowerCase();
  const style = statusStyles[normalizedKey] || statusStyles.info;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {text || status}
    </span>
  );
}
