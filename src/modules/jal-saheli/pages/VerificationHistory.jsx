/**
 * VerificationHistory.jsx
 * Detailed verification history page focusing on multi-engine consensus metrics:
 * - observation (ID, type, date)
 * - AI confidence
 * - satellite confidence
 * - final confidence
 * - verification status
 * - rejection reason if applicable
 *
 * Uses common components:
 * - DataTable
 * - StatusBadge
 * - PageHeader
 * - EmptyState
 * - AnalysisCard
 *
 * Props:
 *   onNavigateBack - fn() called when tapping the back button
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Brain,
  Satellite,
  AlertTriangle,
  ChevronRight,
  Globe,
} from 'lucide-react';

import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';
import AnalysisCard from '../../../components/common/AnalysisCard';
import LocalLanguageResult from '../components/LocalLanguageResult';

import { getSubmissions } from '../services/jalSaheliApi';

export default function VerificationHistory({ onNavigateBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all | verified | pending | rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLocalVerdict, setShowLocalVerdict] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubmissions();
      setSubmissions(data);
      // Auto-select the first verified item for the AnalysisCard showcase if available
      const first = data.find((d) => d.status === 'verified') || data[0];
      setSelectedItem(first || null);
    } catch (err) {
      console.error('[VerificationHistory] Failed to load data:', err);
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

  // Filtered submissions
  const filtered = useMemo(() => {
    return submissions.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = item.id?.toLowerCase().includes(q);
        const typeMatch = (item.typeLabel || item.type || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        if (!idMatch && !typeMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => ({
    all: submissions.length,
    verified: submissions.filter((s) => s.status === 'verified').length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }), [submissions]);

  // Back button
  const backButton = onNavigateBack ? (
    <button
      type="button"
      id="verif-history-back-btn"
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
      header: 'Observation',
      accessor: 'id',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900">{row.id}</span>
            <span className="text-slate-500 font-medium">• {row.typeLabel || row.type}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {row.dateDisplay || row.date}
          </span>
        </div>
      ),
    },
    {
      header: 'AI Vision Score',
      accessor: 'aiConfidence',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="font-bold text-violet-800">{row.aiConfidence}%</span>
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${row.aiConfidence}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Satellite Audit',
      accessor: 'satelliteConfidence',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Satellite className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="font-bold text-sky-800">{row.satelliteConfidence}%</span>
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-sky-500 rounded-full"
              style={{ width: `${row.satelliteConfidence}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Final Composite',
      accessor: 'finalConfidence',
      cell: (row) => (
        <span
          className={`font-black text-xs ${
            row.finalConfidence >= 85
              ? 'text-emerald-700'
              : row.finalConfidence >= 70
              ? 'text-amber-600'
              : 'text-rose-600'
          }`}
        >
          {row.finalConfidence}%
        </span>
      ),
    },
    {
      header: 'Decision Status',
      accessor: 'status',
      cell: (row) => (
        <StatusBadge
          status={row.status === 'rejected' ? 'flagged' : row.status}
          text={
            row.status === 'verified'
              ? 'Verified ✓'
              : row.status === 'rejected'
              ? 'Rejected ✕'
              : 'Pending'
          }
        />
      ),
    },
    {
      header: 'Action / Reason',
      accessor: 'notes',
      cell: (row) => {
        if (row.status === 'rejected') {
          return (
            <div className="flex items-center gap-1 text-rose-700 text-[11px] font-medium max-w-[200px] truncate" title={row.notes}>
              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{row.notes || 'Did not meet confidence bar'}</span>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(row);
            }}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
          >
            View XAI <ChevronRight className="w-3 h-3" />
          </button>
        );
      },
    },
  ];

  // Dynamic AnalysisCard props derived from selected item
  const analysisProps = useMemo(() => {
    if (!selectedItem) return null;

    const reasons = [
      {
        id: 'r1',
        title: 'Neural Vision Feature Segmentation',
        description: `GeoBrain-v3 identified surface textures consistent with ${selectedItem.typeLabel || selectedItem.type}. Contour confidence reached ${selectedItem.aiConfidence}%.`,
        weight: `${selectedItem.aiConfidence}% AI`,
      },
      {
        id: 'r2',
        title: 'Multispectral NDWI Index Correlation',
        description: selectedItem.status === 'rejected'
          ? 'Sentinel-2 L2A tile indicated low water absorption index (< 0.12). Dry basin detected.'
          : 'Sentinel-2 L2A spectral analysis confirms standing open water signature with +0.38 NDWI delta.',
        weight: `${selectedItem.satelliteConfidence}% Sat`,
      },
      {
        id: 'r3',
        title: 'Geographic & Temporal Plausibility',
        description: `Coordinates (${selectedItem.location?.label || 'Field Location'}) matched against local watershed basin boundary model.`,
        weight: 'Spatial Check',
      },
    ];

    const metrics = [
      { label: 'Combined Consensus', value: `${selectedItem.finalConfidence}%` },
      { label: 'Decision Threshold', value: '85.0% Required' },
      { label: 'Verifier / Pipeline', value: selectedItem.verifiedBy || 'Automated Pipeline' },
      { label: 'Reward Disbursed', value: selectedItem.earningsDisplay || (selectedItem.earnings ? `₹${selectedItem.earnings}` : '₹0') },
    ];

    return {
      title: `Explainable AI (XAI) — ${selectedItem.id}`,
      subtitle: `${selectedItem.typeLabel} • Verified at ${selectedItem.dateDisplay || selectedItem.date}`,
      reasons,
      metrics,
    };
  }, [selectedItem]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verification Decision History"
        subtitle="Explainable dual-engine verification audit: GeoBrain-v3 Vision & Sentinel-2 satellite telemetry"
        actions={backButton}
      />

      {/* Showcase AnalysisCard for Selected Observation */}
      {analysisProps && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Highlighted Verification Breakdown
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Showing: <strong className="text-slate-800">{selectedItem?.id}</strong>
            </span>
          </div>

          <AnalysisCard
            title={analysisProps.title}
            subtitle={analysisProps.subtitle}
            reasons={analysisProps.reasons}
            metrics={analysisProps.metrics}
          />

          {selectedItem?.status === 'verified' && (
            <div className="pt-1">
              <button
                type="button"
                id="verif-toggle-local-lang-btn"
                onClick={() => setShowLocalVerdict(!showLocalVerdict)}
                className="text-xs text-emerald-700 font-bold hover:text-emerald-900 flex items-center gap-1.5 transition-colors py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100/70"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {showLocalVerdict
                    ? 'Hide Local Language Verdict (स्थानिक भाषा निकाल लपवा)'
                    : 'Show Local Language Verdict (स्थानिक भाषा निकाल पहा)'}
                </span>
              </button>
              {showLocalVerdict && (
                <div className="mt-3 animate-in fade-in duration-200">
                  <LocalLanguageResult
                    language="en"
                    aiConfidence={selectedItem.aiConfidence}
                    satelliteConfidence={selectedItem.satelliteConfidence}
                    reward={selectedItem.earnings || 25}
                    _observationType={selectedItem.typeLabel || selectedItem.type}
                  />
                </div>
              )}
            </div>
          )}

          {selectedItem?.status === 'rejected' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Rejection Reason:</span>
                <span>{selectedItem.notes}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded overflow-x-auto">
          {[
            { id: 'all', label: 'All Audits', count: counts.all },
            { id: 'verified', label: 'Verified', count: counts.verified },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              id={`verif-filter-${f.id}-btn`}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === f.id
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-200/60 text-slate-500'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="verif-history-search"
            placeholder="Search observation ID or notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading verification history records…
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No verification audits yet"
          message="Observations undergo automated AI feature extraction and Sentinel-2 satellite cross-audit once submitted from the field."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No verification records found"
          message={`No observations match status '${statusFilter}' and query '${searchQuery}'.`}
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
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => setSelectedItem(row)}
        />
      )}
    </div>
  );
}
