/**
 * VerificationQueue.jsx
 *
 * GeoWise — Autonomous Triage & Field Verification Queue
 * SIH 2026 | Problem Statement 26015
 *
 * OWNERSHIP: Exclusively owned by the Verification workflow module.
 * DO NOT import from this file in any other page or shared component.
 *
 * ─── DATA ARCHITECTURE ────────────────────────────────────────────────────────
 * The page is built against a clean VerificationCase data contract (see
 * verificationMockData.js for the typedef). The useVerificationCases() hook
 * is the ONLY integration point between the UI and the data source.
 *
 * DEVELOPMENT: hook returns VERIFICATION_CASES from verificationMockData.js
 * PRODUCTION:  replace hook body with real fetch() — UI stays unchanged
 *
 * TODO: BACKEND INTEGRATION
 *   1. Deploy backend with: GET /api/verification/cases → VerificationCase[]
 *   2. Replace useVerificationCases() body with real fetch()
 *   3. Delete verificationMockData.js
 *   4. No other changes required — the UI depends only on the contract
 *
 * Real endpoint shape expected:
 *   GET {VITE_VERIFICATION_API_URL}/api/verification/cases
 *   Response: VerificationCase[] (see typedef in verificationMockData.js)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import {
  RefreshCw, Search, Filter, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, MapPin, Clock, Sparkles,
  Loader2, SortDesc, ShieldAlert, Activity, Users,
  ClipboardCheck, AlertOctagon, ArrowRight, Target, FileCheck,
} from 'lucide-react';

// ─── TEMPORARY DEVELOPMENT DATA ───────────────────────────────────────────────
// This import is the ONLY place mock data enters the module.
// Remove this import and update useVerificationCases() for production.
import { VERIFICATION_CASES } from '../data/verificationMockData';
// ──────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// DATA HOOK — single integration boundary
// Swap this body for real fetch() when backend is ready.
// The return contract must remain: { cases, loading, error, refresh }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TODO: BACKEND INTEGRATION — replace this entire function body.
 *
 * Production implementation should:
 *   const [cases, setCases] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 *   const refresh = useCallback(async () => {
 *     setLoading(true); setError(null);
 *     try {
 *       const res = await fetch(`${import.meta.env.VITE_VERIFICATION_API_URL}/api/verification/cases`);
 *       if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
 *       const json = await res.json();
 *       setCases(Array.isArray(json) ? json : (json.data ?? json.cases ?? []));
 *     } catch (e) { setError(e.message); }
 *     finally { setLoading(false); }
 *   }, []);
 *   useEffect(() => { refresh(); }, [refresh]);
 *   return { cases, loading, error, refresh };
 */
function useVerificationCases() {
  // DEVELOPMENT: mock data is static — no async needed
  const refresh = useCallback(() => {
    // TODO: BACKEND INTEGRATION — implement real refetch here
  }, []);

  return {
    cases: VERIFICATION_CASES,
    loading: false,
    error: null,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITY FUNCTIONS — no state, no side effects
// ─────────────────────────────────────────────────────────────────────────────

/** Priority display metadata */
function getPriorityMeta(priority) {
  switch (priority) {
    case 'HIGH':         return { label: 'HIGH',         stripe: 'border-l-rose-500',   badge: 'high',    dot: 'bg-rose-500' };
    case 'MEDIUM':       return { label: 'MEDIUM',       stripe: 'border-l-amber-500',  badge: 'medium',  dot: 'bg-amber-500' };
    case 'LOW':          return { label: 'LOW',           stripe: 'border-l-slate-400',  badge: 'low',     dot: 'bg-slate-400' };
    case 'AUTO_CLEARED': return { label: 'AUTO-CLEARED', stripe: 'border-l-emerald-500',badge: 'verified',dot: 'bg-emerald-500' };
    default:             return { label: priority,        stripe: 'border-l-slate-300',  badge: 'info',    dot: 'bg-slate-400' };
  }
}

/** Status display metadata */
function getStatusMeta(status) {
  switch (status) {
    case 'PENDING':          return { label: 'Pending',          badge: 'pending'  };
    case 'ASSIGNED':         return { label: 'Assigned',         badge: 'info'     };
    case 'IN_FIELD':         return { label: 'In Field',         badge: 'warning'  };
    case 'REQUIRES_REVIEW':  return { label: 'Requires Review',  badge: 'flagged'  };
    case 'AUTO_CLEARED':     return { label: 'Auto-Cleared',     badge: 'verified' };
    case 'VERIFIED':         return { label: 'Verified',         badge: 'verified' };
    case 'REJECTED':         return { label: 'Rejected',         badge: 'high'     };
    default:                 return { label: status,             badge: 'info'     };
  }
}

/** Confidence colour class */
function confidenceColor(pct) {
  if (pct < 65)  return { text: 'text-rose-700',   bar: 'bg-rose-500',   bg: 'bg-rose-50'   };
  if (pct < 80)  return { text: 'text-amber-700',  bar: 'bg-amber-500',  bg: 'bg-amber-50'  };
  return           { text: 'text-emerald-700', bar: 'bg-emerald-500', bg: 'bg-emerald-50' };
}

/** Risk severity label + colour (high risk = red) */
function getRiskMeta(score) {
  if (score >= 80) return { label: 'Critical', text: 'text-rose-700',   bg: 'bg-rose-100  border-rose-300'  };
  if (score >= 60) return { label: 'High',     text: 'text-amber-700',  bg: 'bg-amber-100 border-amber-300' };
  if (score >= 40) return { label: 'Medium',   text: 'text-sky-700',    bg: 'bg-sky-100   border-sky-300'   };
  return             { label: 'Low',     text: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
}

/** Format timestamp as relative age string */
function formatAge(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const h    = Math.floor(diff / 3_600_000);
  if (h < 1)  return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

/** Derive summary counts — all from data, nothing hard-coded */
function computeSummary(cases) {
  return {
    total:       cases.length,
    high:        cases.filter(c => c.priority === 'HIGH').length,
    pending:     cases.filter(c => ['PENDING', 'REQUIRES_REVIEW'].includes(c.status)).length,
    autocleared: cases.filter(c => c.status === 'AUTO_CLEARED').length,
    inField:     cases.filter(c => c.status === 'IN_FIELD').length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT / FILTER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2, AUTO_CLEARED: 3 };

const SORT_OPTIONS = [
  { value: 'priority',    label: 'Highest Priority First' },
  { value: 'risk',        label: 'Highest Risk First'     },
  { value: 'confidence',  label: 'Lowest Confidence First'},
  { value: 'newest',      label: 'Newest First'           },
];

function applyFilters(cases, { search, priority, status, sort }) {
  let result = cases;

  if (priority !== 'All') {
    result = result.filter(c => c.priority === priority);
  }
  if (status !== 'All') {
    result = result.filter(c => c.status === status);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.intervention.toLowerCase().includes(q) ||
      c.location.village.toLowerCase().includes(q) ||
      c.location.district.toLowerCase().includes(q) ||
      c.location.state.toLowerCase().includes(q)
    );
  }

  return [...result].sort((a, b) => {
    switch (sort) {
      case 'risk':       return b.riskScore - a.riskScore;
      case 'confidence': return a.aiConfidence - b.aiConfidence;
      case 'newest':     return new Date(b.submittedAt) - new Date(a.submittedAt);
      case 'priority':
      default:           return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE-LOCAL SUB-COMPONENTS (not exported — private to this page)
// ─────────────────────────────────────────────────────────────────────────────

// ── Summary metric chip ───────────────────────────────────────────────────────
function MetricChip({ icon: Icon, label, value, colorClass }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${colorClass}`}>
      <div className="p-1.5 rounded bg-white/20 shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80 whitespace-nowrap">{label}</div>
        <div className="text-xl font-bold leading-none tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ── AI Confidence bar ─────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const c = confidenceColor(value);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-16 bg-slate-200 rounded-full h-1.5 shrink-0">
        <div className={`h-1.5 rounded-full ${c.bar} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold ${c.text} tabular-nums shrink-0`}>{value}%</span>
    </div>
  );
}

// ── Risk score pill ───────────────────────────────────────────────────────────
function RiskPill({ score }) {
  const { label, text, bg } = getRiskMeta(score);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${bg} ${text}`}>
      <Target className="w-2.5 h-2.5 shrink-0" />{score}<span className="opacity-60 font-medium">/100</span>
      <span className="ml-0.5 opacity-70">·{label}</span>
    </span>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const { badge, label, dot } = getPriorityMeta(priority);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wide ${
      badge === 'high'     ? 'bg-rose-50    text-rose-700    border-rose-300    ring-1 ring-rose-200'  :
      badge === 'medium'   ? 'bg-amber-50   text-amber-700   border-amber-300'  :
      badge === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-300':
                             'bg-slate-100  text-slate-700   border-slate-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── Triage explanation banner ─────────────────────────────────────────────────
function TriageBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-sm text-xs text-sky-800">
      <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold">Autonomous Triage Active — </span>
        Submissions are automatically ranked using AI confidence, satellite cross-validation, intervention impact, and evidence consistency.
        Cases the AI cannot confidently verify are escalated for human field verification.
        Auto-cleared cases have passed all automated checks and require no field visit.
      </div>
    </div>
  );
}

// ── Filter/search bar ─────────────────────────────────────────────────────────
function FilterBar({ search, onSearch, priority, onPriority, status, onStatus, sort, onSort, disabled }) {
  const ctrl = `bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-700
    focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-colors`;

  return (
    <div className="p-3.5 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="vq-search"
          type="text"
          placeholder="Search by case ID, location, or intervention…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          disabled={disabled}
          className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800
            placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full disabled:opacity-50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />

        <select id="vq-priority" value={priority} onChange={e => onPriority(e.target.value)} disabled={disabled} className={ctrl}>
          <option value="All">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="AUTO_CLEARED">Auto-Cleared</option>
        </select>

        <select id="vq-status" value={status} onChange={e => onStatus(e.target.value)} disabled={disabled} className={ctrl}>
          <option value="All">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_FIELD">In Field</option>
          <option value="REQUIRES_REVIEW">Requires Review</option>
          <option value="AUTO_CLEARED">Auto-Cleared</option>
        </select>

        <div className="flex items-center gap-1.5">
          <SortDesc className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select id="vq-sort" value={sort} onChange={e => onSort(e.target.value)} disabled={disabled} className={ctrl}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── "Why was this prioritized?" reasons list ──────────────────────────────────
function TriageReasons({ triageReason, reasons, priority }) {
  const iconClass =
    priority === 'HIGH'         ? 'text-rose-500' :
    priority === 'MEDIUM'       ? 'text-amber-500' :
    priority === 'AUTO_CLEARED' ? 'text-emerald-500' :
                                   'text-slate-400';
  const ReasonIcon =
    priority === 'AUTO_CLEARED' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="space-y-3">
      {triageReason && (
        <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-slate-300 pl-3">
          {triageReason}
        </p>
      )}
      {reasons && reasons.length > 0 && (
        <div className="space-y-1.5">
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <ReasonIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${iconClass}`} />
              <span className="text-[11px] text-slate-700 leading-snug">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Case card (collapsed + expandable) ───────────────────────────────────────
function CaseCard({ caseItem, expanded, onToggle }) {
  const pm     = getPriorityMeta(caseItem.priority);
  const sm     = getStatusMeta(caseItem.status);
  const age    = formatAge(caseItem.submittedAt);
  const isHigh = caseItem.priority === 'HIGH';

  return (
    <div className={`bg-white border border-slate-200 rounded-sm shadow-xs border-l-4 ${pm.stripe} overflow-hidden`}>
      {/* ── Collapsed row ── */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        aria-expanded={expanded}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: identity */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={caseItem.priority} />
              <span className="text-[11px] font-mono font-bold text-slate-500">{caseItem.id}</span>
              {isHigh && (
                <span className="flex items-center gap-1 text-[10px] text-rose-600 font-bold uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Urgent
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-slate-900 truncate" title={caseItem.title}>
              {caseItem.title}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-600">
                {caseItem.intervention}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {caseItem.location.village}, {caseItem.location.district}, {caseItem.location.state}
              </span>
              {age && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {age}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: metrics + status + toggle */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* AI confidence */}
            <div className="space-y-0.5">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Confidence</div>
              <ConfidenceBar value={caseItem.aiConfidence} />
            </div>

            {/* Risk score */}
            <div className="space-y-0.5">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Risk</div>
              <RiskPill score={caseItem.riskScore} />
            </div>

            {/* Status */}
            <div className="space-y-0.5">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
              <StatusBadge status={sm.badge} text={sm.label} />
            </div>

            {/* Officer */}
            <div className="space-y-0.5 hidden lg:block">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Officer</div>
              <span className={`text-[11px] font-semibold ${caseItem.assignedOfficer ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                {caseItem.assignedOfficer ?? 'Unassigned'}
              </span>
            </div>

            {/* Toggle */}
            <button
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-[11px] font-semibold transition-colors whitespace-nowrap ${
                expanded
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              onClick={e => { e.stopPropagation(); onToggle(); }}
              aria-label={expanded ? 'Collapse case detail' : 'Expand case detail'}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Close' : 'Review'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Why prioritized? */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                    Why Was This Prioritized?
                  </h4>
                </div>
                <TriageReasons
                  triageReason={caseItem.triageReason}
                  reasons={caseItem.reasons}
                  priority={caseItem.priority}
                />
              </div>

              {/* Recommended action — prominent */}
              <div className={`flex items-start gap-2.5 p-3 rounded border ${
                caseItem.priority === 'HIGH'   ? 'bg-rose-50    border-rose-200 '   :
                caseItem.priority === 'MEDIUM' ? 'bg-amber-50   border-amber-200 '  :
                caseItem.priority === 'AUTO_CLEARED' ? 'bg-emerald-50 border-emerald-200' :
                                                  'bg-slate-100  border-slate-200 '
              }`}>
                <FileCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                  caseItem.priority === 'HIGH'   ? 'text-rose-600'    :
                  caseItem.priority === 'MEDIUM' ? 'text-amber-600'   :
                  caseItem.priority === 'AUTO_CLEARED' ? 'text-emerald-600' :
                                                   'text-slate-500'
                }`} />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                    Recommended Action
                  </div>
                  <div className="text-xs font-bold text-slate-800">{caseItem.recommendedAction}</div>
                </div>
              </div>
            </div>

            {/* Right: case metadata detail */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Case Details</h4>
              <div className="space-y-2">
                {[
                  ['Case ID',      caseItem.id,                     'font-mono'],
                  ['Intervention', caseItem.intervention,           ''],
                  ['Village',      caseItem.location.village,       ''],
                  ['District',     caseItem.location.district,      ''],
                  ['State',        caseItem.location.state,         ''],
                  ['Submitted',    caseItem.submittedAt ? new Date(caseItem.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null, ''],
                  ['AI Confidence',caseItem.aiConfidence !== undefined ? `${caseItem.aiConfidence}%` : null, ''],
                  ['Risk Score',   caseItem.riskScore !== undefined ? `${caseItem.riskScore} / 100` : null, ''],
                  ['Status',       getStatusMeta(caseItem.status).label, ''],
                  ['Assigned Officer', caseItem.assignedOfficer ?? 'Unassigned', ''],
                ].map(([label, value, extra]) =>
                  value ? (
                    <div key={label} className="flex justify-between items-baseline gap-4 py-1 border-b border-slate-200 last:border-0">
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">{label}</span>
                      <span className={`text-[11px] text-slate-800 font-semibold text-right ${extra}`}>{value}</span>
                    </div>
                  ) : null
                )}
              </div>

              {/* Geo link — links to existing /map route (no shared file modification) */}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/map"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded transition-colors"
                  title="Open GIS Map — case auto-centering requires backend integration"
                >
                  <MapPin className="w-3 h-3" /> View on GIS Map
                </a>
                <a
                  href="/submissions"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded transition-colors"
                >
                  <ArrowRight className="w-3 h-3" /> View Submission
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  'Srishti Imagery', 'Drishti Photos', 'Data Fusion',
  'AI Analysis', 'Autonomous Triage', 'Verification Queue',
  'Officer Assignment', 'Closed-Loop Feedback',
];

export default function VerificationQueue() {
  const { cases, loading, error, refresh } = useVerificationCases();

  // Local UI state — never substitutes for real server data
  const [search, setSearch]         = useState('');
  const [priority, setPriority]     = useState('All');
  const [status, setStatus]         = useState('All');
  const [sort, setSort]             = useState('priority');
  const [expandedId, setExpandedId] = useState(null);
  const [isRefreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    // Small visual delay so the spinner is perceptible even with mock data
    setTimeout(() => setRefreshing(false), 400);
  };

  const summary         = useMemo(() => computeSummary(cases), [cases]);
  const processedCases  = useMemo(
    () => applyFilters(cases, { search, priority, status, sort }),
    [cases, search, priority, status, sort]
  );

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <PageHeader
        title="Field Verification Queue"
        subtitle="Autonomous triage prioritizes submissions that require human field verification — GeoWise Pipeline Stage 6"
        actions={
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded">
                {processedCases.length} / {cases.length} cases
              </span>
            )}
            <button
              id="vq-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* ── Pipeline Stage Breadcrumb ── */}
      <div className="flex items-center gap-1 text-[10px] font-medium overflow-x-auto pb-0.5 select-none whitespace-nowrap">
        {PIPELINE_STAGES.map((stage, i, arr) => (
          <React.Fragment key={stage}>
            <span className={`px-2 py-0.5 rounded transition-colors ${
              stage === 'Verification Queue'
                ? 'bg-emerald-700 text-white font-bold'
                : 'text-slate-400'
            }`}>
              {stage}
            </span>
            {i < arr.length - 1 && <span className="text-slate-300 px-0.5">›</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── Triage Summary ── */}
      <div className="flex flex-wrap gap-3">
        <MetricChip icon={Activity}      label="Total Cases"   value={summary.total}       colorClass="bg-slate-700    border-slate-600    text-slate-100"    />
        <MetricChip icon={AlertOctagon}  label="High Priority" value={summary.high}        colorClass="bg-rose-700     border-rose-600     text-rose-50"      />
        <MetricChip icon={ClipboardCheck}label="Pending"       value={summary.pending}     colorClass="bg-amber-600    border-amber-500    text-amber-50"     />
        <MetricChip icon={Users}         label="In Field"      value={summary.inField}     colorClass="bg-sky-700      border-sky-600      text-sky-50"       />
        <MetricChip icon={CheckCircle2}  label="Auto-Cleared"  value={summary.autocleared} colorClass="bg-emerald-700  border-emerald-600  text-emerald-50"   />
      </div>

      {/* ── Triage Explanation Banner ── */}
      <TriageBanner />

      {/* ── Filter/Search Bar ── */}
      <FilterBar
        search={search}    onSearch={setSearch}
        priority={priority} onPriority={setPriority}
        status={status}     onStatus={setStatus}
        sort={sort}         onSort={setSort}
        disabled={loading}
      />

      {/* ── Content Area ── */}

      {loading && (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-sm">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mr-2" />
          <span className="text-sm text-slate-500">Loading verification queue…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-14 bg-white border border-rose-200 rounded-sm text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Failed to Load Queue</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <EmptyState
          title="No Verification Cases"
          message="The verification queue is empty. No interventions are currently awaiting review."
        />
      )}

      {!loading && !error && cases.length > 0 && processedCases.length === 0 && (
        <EmptyState
          title="No Matching Cases"
          message="No cases match the current search or filter criteria. Try adjusting your filters."
        />
      )}

      {!loading && !error && processedCases.length > 0 && (
        <div className="space-y-2">
          {processedCases.map(c => (
            <CaseCard
              key={c.id}
              caseItem={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))}
        </div>
      )}

      {/* ── Footer note — data source transparency ── */}
      {!loading && !error && (
        <div className="text-[10px] text-slate-400 text-center py-2 italic">
          {/* TODO: BACKEND INTEGRATION — remove this note when real data is wired */}
          Development view — displaying mock data from verificationMockData.js. Replace useVerificationCases() with real fetch() when backend is available.
        </div>
      )}
    </div>
  );
}
