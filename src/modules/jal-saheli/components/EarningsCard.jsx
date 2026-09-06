/**
 * EarningsCard.jsx
 * Shows total credited cadre earnings, current-cycle amount, and observation type breakdown.
 *
 * Props:
 *   summary    — MOCK_EARNINGS_SUMMARY shape from data/mockEarnings.js (required)
 *   compact    — boolean, renders a minimal balance-only view (optional)
 *   onViewAll  — fn() to navigate to full earnings ledger
 */

import React from 'react';
import { IndianRupee, TrendingUp, Info } from 'lucide-react';

const colorMap = {
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-400',
  blue: 'bg-blue-400',
  amber: 'bg-amber-400',
  violet: 'bg-violet-400',
};

export default function EarningsCard({ summary, compact = false, onViewAll }) {
  if (!summary) return null;

  const {
    totalCreditedDisplay = '₹0',
    thisMonthDisplay = '₹0',
    transactionCount = 0,
    byType = [],
  } = summary;

  const currentMonthYear = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  if (compact) {
    return (
      <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
        <div className="p-1.5 bg-emerald-100 rounded text-emerald-700">
          <IndianRupee className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Cadre Balance</p>
          <p className="text-base font-bold text-emerald-800 leading-tight">{totalCreditedDisplay}</p>
        </div>
      </div>
    );
  }

  const hasByType = Array.isArray(byType) && byType.length > 0;
  const maxTotal = hasByType ? Math.max(...byType.map((t) => t.total || 0), 1) : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cadre Earnings</span>
        </div>
        {onViewAll && (
          <button
            type="button"
            id="earnings-card-view-ledger-btn"
            onClick={onViewAll}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
          >
            View Ledger →
          </button>
        )}
      </div>

      {/* Two headline figures */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-sm">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Credited</p>
          <p className="text-xl font-bold text-emerald-800 mt-0.5">{totalCreditedDisplay}</p>
          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5" />
            {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">This Month</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{thisMonthDisplay}</p>
          <p className="text-[10px] text-slate-400 mt-1">{currentMonthYear}</p>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">By Observation Type</p>
        {!hasByType ? (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>No credited transactions yet. Direct incentives disburse after verification.</span>
          </div>
        ) : (
          byType.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 w-28 shrink-0 truncate">{item.type}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${colorMap[item.color] || 'bg-emerald-500'}`}
                  style={{ width: `${Math.round(((item.total || 0) / maxTotal) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700 w-10 text-right shrink-0">
                ₹{item.total}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
