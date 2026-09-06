/**
 * Earnings.jsx
 * Comprehensive cadre incentive earnings ledger & financial breakdown:
 * - total earnings
 * - current month earnings
 * - pending earnings
 * - transaction history
 * - reward amount
 * - status
 *
 * Uses common components:
 * - DataTable
 * - StatusBadge
 * - PageHeader
 * - EmptyState
 *
 * Props:
 *   onNavigateBack - fn() called when tapping the back button
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  IndianRupee,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  Wallet,
  Building,
} from 'lucide-react';

import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';

import { getEarnings, getEarningsSummary } from '../services/jalSaheliApi';

export default function Earnings({ onNavigateBack }) {
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | credited | pending

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([getEarnings(), getEarningsSummary()]);
      setLedger(l);
      setSummary(s);
    } catch (err) {
      console.error('[Earnings] Failed to load earnings data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadData();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Filtered ledger
  const filteredLedger = useMemo(() => {
    return ledger.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = t.id?.toLowerCase().includes(q);
        const subMatch = t.submissionId?.toLowerCase().includes(q);
        const typeMatch = (t.typeLabel || t.type || '').toLowerCase().includes(q);
        const noteMatch = (t.note || '').toLowerCase().includes(q);
        if (!idMatch && !subMatch && !typeMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [ledger, statusFilter, searchQuery]);

  // Back button
  const backButton = onNavigateBack ? (
    <button
      type="button"
      id="earnings-back-btn"
      onClick={onNavigateBack}
      className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold hover:text-slate-900 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
    </button>
  ) : (
    <button
      type="button"
      onClick={loadData}
      className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold hover:text-slate-900 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" /> Refresh
    </button>
  );

  // Table columns
  const columns = [
    {
      header: 'Transaction ID',
      accessor: 'id',
      className: 'w-[160px]',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{row.id}</span>
          <span className="text-[10px] text-slate-400">Ref: {row.submissionId}</span>
        </div>
      ),
    },
    {
      header: 'Date Credited',
      accessor: 'date',
      cell: (row) => (
        <div>
          <span className="font-medium text-slate-800 block">
            {row.dateDisplay || row.date}
          </span>
          <span className="text-[10px] text-slate-400">{row.method || 'UPI / DBT'}</span>
        </div>
      ),
    },
    {
      header: 'Verified Feature',
      accessor: 'typeLabel',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block">
            {row.typeLabel || row.type}
          </span>
          {row.note && (
            <span className="text-[10px] text-slate-500 max-w-[200px] truncate block">
              {row.note}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Disbursement Status',
      accessor: 'status',
      cell: (row) => (
        <StatusBadge
          status={row.status === 'credited' ? 'verified' : 'pending'}
          text={row.status === 'credited' ? 'Credited ✓' : 'Processing'}
        />
      ),
    },
    {
      header: 'Reward Amount',
      accessor: 'amount',
      className: 'text-right w-[130px]',
      cell: (row) => (
        <span className="font-black text-sm text-emerald-700">
          {row.amountDisplay || `₹${row.amount}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cadre Incentive & Earnings Ledger"
        subtitle="Direct Benefit Transfer (DBT) records for verified groundwater & surface water observations"
        actions={backButton}
      />

      {/* 4 Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Earnings */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Earnings
            </span>
            <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {summary ? summary.totalCreditedDisplay : '₹0'}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Lifetime Verified Payouts
          </span>
        </div>

        {/* Current Month */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              This Month
            </span>
            <div className="w-8 h-8 rounded bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {summary ? summary.thisMonthDisplay : '₹0'}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
            Active Cycle ({new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
          </span>
        </div>

        {/* Pending Payouts */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Payouts
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {summary ? summary.pendingDisplay : '₹0'}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Awaiting verification pass
          </span>
        </div>

        {/* Total Transactions */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Transactions
            </span>
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {ledger.length}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Settled via Jan Dhan / UPI
          </span>
        </div>
      </div>

      {/* Direct Benefit Transfer Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950">
              Direct Cadre Incentive Disbursement Channel
            </h4>
            <p className="text-[11px] text-emerald-700">
              Incentives credited immediately upon dual-engine verification (GeoBrain-v3 + Sentinel-2).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="bg-white border border-emerald-300 text-emerald-800 font-bold px-2.5 py-1 rounded">
            DBT: UPI / Jan Dhan Cadre Channel
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'credited', label: 'Credited' },
            { id: 'pending', label: 'Pending' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              id={`earnings-filter-${f.id}-btn`}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="earnings-search"
            placeholder="Search TXN ID or feature…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading transaction ledger records…
        </div>
      ) : ledger.length === 0 ? (
        <EmptyState
          title="No transactions recorded yet"
          message="Incentive payouts will be recorded and credited here after your submitted field observations are verified."
        />
      ) : filteredLedger.length === 0 ? (
        <EmptyState
          title="No transactions match your filter"
          message={`No transactions match '${statusFilter}' filter with query '${searchQuery}'.`}
          action={
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredLedger} />
      )}
    </div>
  );
}
