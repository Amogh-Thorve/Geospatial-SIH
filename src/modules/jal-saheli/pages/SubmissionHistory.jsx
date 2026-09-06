/**
 * SubmissionHistory.jsx
 * Full audit log of ground observations submitted by the Jal Saheli field cadre.
 *
 * Requirements:
 * - date
 * - observation type
 * - location
 * - status
 * - earnings
 *
 * Filters:
 * - All
 * - Verified
 * - Pending
 * - Rejected
 *
 * Reuses existing common components:
 * - DataTable
 * - StatusBadge
 * - PageHeader
 * - EmptyState
 *
 * Props:
 *   onNavigateBack - fn() called when tapping the back button to Dashboard
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  MapPin,
} from 'lucide-react';

import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';

import { getSubmissions } from '../services/jalSaheliApi';

export default function SubmissionHistory({ onNavigateBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all | verified | pending | rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubmissions();
      setSubmissions(data);
    } catch (err) {
      console.error('[SubmissionHistory] Failed to load submissions:', err);
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

  // Filtered & searched submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Status filter
      if (activeFilter !== 'all') {
        if (activeFilter === 'verified' && sub.status !== 'verified') return false;
        if (activeFilter === 'pending' && sub.status !== 'pending') return false;
        if (activeFilter === 'rejected' && sub.status !== 'rejected') return false;
      }

      // 2. Search query (id, type, location label)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = sub.id?.toLowerCase().includes(q);
        const typeMatch = (sub.typeLabel || sub.type || '').toLowerCase().includes(q);
        const locMatch = (sub.location?.label || '').toLowerCase().includes(q);
        if (!idMatch && !typeMatch && !locMatch) return false;
      }

      return true;
    });
  }, [submissions, activeFilter, searchQuery]);

  // Status counts
  const counts = useMemo(() => {
    const all = submissions.length;
    const verified = submissions.filter((s) => s.status === 'verified').length;
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const rejected = submissions.filter((s) => s.status === 'rejected').length;
    return { all, verified, pending, rejected };
  }, [submissions]);

  // Back button for PageHeader actions
  const backButton = onNavigateBack ? (
    <button
      type="button"
      id="sub-history-back-btn"
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

  // DataTable columns
  const columns = [
    {
      header: 'Observation ID',
      accessor: 'id',
      className: 'w-[140px]',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.id}</span>
          <span className="text-[10px] text-slate-400 capitalize">
            via {row.channel === 'telegram' ? 'Telegram' : 'Web Form'}
          </span>
        </div>
      ),
    },
    {
      header: 'Date & Time',
      accessor: 'date',
      className: 'w-[160px]',
      cell: (row) => (
        <div>
          <span className="font-medium text-slate-800 block">
            {row.dateDisplay || row.date}
          </span>
          <span className="text-[10px] text-slate-400">
            {row.timeDisplay || 'Recorded'}
          </span>
        </div>
      ),
    },
    {
      header: 'Observation Type',
      accessor: 'typeLabel',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">
            {row.typeLabel || row.type}
          </span>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: 'location',
      cell: (row) => (
        <span className="text-slate-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          {row.location?.label || 'Field Location'}
        </span>
      ),
    },
    {
      header: 'Verification Status',
      accessor: 'status',
      cell: (row) => (
        <StatusBadge
          status={row.status === 'rejected' ? 'flagged' : row.status}
          text={
            row.status === 'verified'
              ? 'Verified'
              : row.status === 'rejected'
              ? 'Rejected'
              : 'Pending'
          }
        />
      ),
    },
    {
      header: 'Earnings',
      accessor: 'earnings',
      className: 'text-right w-[110px]',
      cell: (row) => (
        <span
          className={`font-bold text-xs ${
            row.earnings > 0 ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {row.earnings > 0 ? row.earningsDisplay || `₹${row.earnings}` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field Observation History"
        subtitle="Complete audit log of ground entries, verification outcomes & earned incentives"
        actions={backButton}
      />

      {/* Metric quick chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Submissions
            </span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {counts.all}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Verified
            </span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">
              {counts.verified}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pending Triage
            </span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">
              {counts.pending}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rejected
            </span>
            <span className="text-xl font-black text-rose-600 mt-0.5 block">
              {counts.rejected}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'verified', label: 'Verified', count: counts.verified },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              id={`filter-${f.id}-btn`}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === f.id
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-200/60 text-slate-500'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="sub-history-search"
            placeholder="Search ID, type, village…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading submission history records…
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No observations recorded yet"
          message="You have not submitted any field observations yet. Submit your first water feature observation to start building your verification history."
        />
      ) : filteredSubmissions.length === 0 ? (
        <EmptyState
          title="No submissions match your filter"
          message={`No records found under '${activeFilter}' filter${searchQuery ? ` with query '${searchQuery}'` : ''}.`}
          action={
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSubmissions}
          onRowClick={(row) => setSelectedSub(row)}
        />
      )}

      {/* Row detail drawer/modal if a row is selected */}
      {selectedSub && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="bg-white rounded-sm border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Submission Details</span>
                <h3 className="text-base font-bold text-slate-900">{selectedSub.id}</h3>
              </div>
              <StatusBadge
                status={selectedSub.status === 'rejected' ? 'flagged' : selectedSub.status}
                text={selectedSub.status}
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Observation Type</span>
                <span className="font-bold text-slate-800">{selectedSub.typeLabel || selectedSub.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-800">{selectedSub.location?.label || 'Field Location'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Submitted Date</span>
                <span className="font-medium text-slate-800">{selectedSub.dateDisplay} {selectedSub.timeDisplay}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">AI Confidence</span>
                <span className="font-bold text-violet-700">{selectedSub.aiConfidence}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Satellite Confidence</span>
                <span className="font-bold text-sky-700">{selectedSub.satelliteConfidence}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Final Composite Score</span>
                <span className="font-bold text-emerald-700">{selectedSub.finalConfidence}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Reward Disbursed</span>
                <span className="font-bold text-emerald-700">₹{selectedSub.earnings}</span>
              </div>
              {selectedSub.notes && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1">Notes / Analysis</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-relaxed">
                    "{selectedSub.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
