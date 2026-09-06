/**
 * JalSaheliDashboard.jsx
 * Main entry-point page for the Jal Saheli module.
 *
 * Layout (top → bottom):
 *   1. PageHeader with quick navigation group & "Submit Observation" CTA
 *   2. Profile card (full)
 *   3. 4 clickable stat cards: Accuracy | Verified | Pending | Earnings
 *   4. Two-column grid: AccuracyScore (left) + EarningsCard (right)
 *   5. Recent Submissions list with SubmissionCard rows and "View All" link
 *   6. Interactive lifecycle pipeline banner
 *
 * Subpages handled seamlessly:
 *   - 'submit'        → SubmitObservation
 *   - 'history'       → SubmissionHistory
 *   - 'verifications' → VerificationHistory
 *   - 'earnings'      → Earnings
 *
 * Data flows through jalSaheliApi.js — no direct mock imports here.
 * Routing is NOT modified here.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Brain,
  Satellite,
  IndianRupee,
  RefreshCw,
  ChevronRight,
  Clock,
  ShieldCheck,
  ListFilter,
} from 'lucide-react';

import PageHeader  from '../../../components/common/PageHeader';
import StatCard    from '../../../components/common/StatCard';
import EmptyState  from '../../../components/common/EmptyState';

import JalSaheliProfile     from '../components/JalSaheliProfile';
import AccuracyScore        from '../components/AccuracyScore';
import EarningsCard         from '../components/EarningsCard';
import SubmissionCard       from '../components/SubmissionCard';
import SubmitObservation    from './SubmitObservation';
import SubmissionHistory    from './SubmissionHistory';
import VerificationHistory  from './VerificationHistory';
import Earnings             from './Earnings';

import { getProfile, getSubmissions, getEarningsSummary } from '../services/jalSaheliApi';

// ---------------------------------------------------------------------------
// Sub-component: Pipeline lifecycle banner
// ---------------------------------------------------------------------------

const PIPELINE_STEPS = [
  { id: 'submit',       icon: Camera,       label: 'Photo',    sub: 'Geotagged upload', color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
  { id: 'verifications',icon: Brain,        label: 'AI Vision',sub: 'GeoBrain-v3',      color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100 hover:border-violet-300' },
  { id: 'verifications',icon: Satellite,    label: 'Satellite',sub: 'Sentinel-2 audit', color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-100 hover:border-sky-300' },
  { id: 'verifications',icon: ShieldCheck,  label: 'Verified', sub: 'Officer triage',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
  { id: 'earnings',     icon: IndianRupee,  label: 'Earnings', sub: 'Direct incentive', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
];

function PipelineBanner({ onStepClick }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Verification &amp; Incentive Lifecycle
        </p>
        <span className="text-[10px] text-slate-400 font-medium">Click step to explore view</span>
      </div>
      <div className="flex items-stretch gap-1 sm:gap-2 overflow-x-auto pb-1">
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label + i}>
              <button
                type="button"
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`flex flex-col items-center justify-center px-3 py-2.5 rounded border text-center shrink-0 min-w-[72px] cursor-pointer transition-all ${step.bg}`}
              >
                <Icon className={`w-4 h-4 ${step.color} mb-1`} />
                <span className={`text-[11px] font-bold ${step.color}`}>{step.label}</span>
                <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{step.sub}</span>
              </button>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex items-center text-slate-300 shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function JalSaheliDashboard({
  onNavigateToSubmit,
  onNavigateToHistory,
  onNavigateToVerifications,
  onNavigateToEarnings,
}) {
  const [internalView, setInternalView] = useState('dashboard');
  const [profile, setProfile]           = useState(null);
  const [submissions, setSubmissions]   = useState([]);
  const [earningsSummary, setEarnings]  = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s, e] = await Promise.all([
        getProfile(),
        getSubmissions(),
        getEarningsSummary(),
      ]);
      setProfile(p);
      setSubmissions(s);
      setEarnings(e);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('[JalSaheliDashboard] load error:', err);
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

  // Navigation handlers supporting both external router callbacks and internal state
  const handleGoToSubmit = useCallback(() => {
    if (onNavigateToSubmit) onNavigateToSubmit();
    else setInternalView('submit');
  }, [onNavigateToSubmit]);

  const handleGoToHistory = useCallback(() => {
    if (onNavigateToHistory) onNavigateToHistory();
    else setInternalView('history');
  }, [onNavigateToHistory]);

  const handleGoToVerifications = useCallback(() => {
    if (onNavigateToVerifications) onNavigateToVerifications();
    else setInternalView('verifications');
  }, [onNavigateToVerifications]);

  const handleGoToEarnings = useCallback(() => {
    if (onNavigateToEarnings) onNavigateToEarnings();
    else setInternalView('earnings');
  }, [onNavigateToEarnings]);

  const handleNavigateBack = useCallback(() => {
    setInternalView('dashboard');
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-slate-100 rounded-sm" />
        <div className="h-32 bg-slate-100 rounded-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-sm" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-48 bg-slate-100 rounded-sm" />
          <div className="h-48 bg-slate-100 rounded-sm" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <EmptyState
        title="Could not load dashboard"
        message={error}
        action={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        }
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Subpages rendering
  // ---------------------------------------------------------------------------

  if (internalView === 'submit') {
    return <SubmitObservation onNavigateBack={handleNavigateBack} />;
  }

  if (internalView === 'history') {
    return <SubmissionHistory onNavigateBack={handleNavigateBack} />;
  }

  if (internalView === 'verifications') {
    return <VerificationHistory onNavigateBack={handleNavigateBack} />;
  }

  if (internalView === 'earnings') {
    return <Earnings onNavigateBack={handleNavigateBack} />;
  }

  const stats = profile?.stats || {};
  const accuracyHistory = profile?.accuracyHistory || [];
  const recent = submissions.slice(0, 5);

  // Pending and verified counts from live submissions list
  const livePending  = submissions.filter(s => s.status === 'pending').length;
  const liveVerified = submissions.filter(s => s.status === 'verified').length;
  const displayPending  = livePending  || stats.pendingCount || 0;
  const displayVerified = liveVerified || stats.verifiedCount || 0;

  // ---------------------------------------------------------------------------
  // Header action button group
  // ---------------------------------------------------------------------------

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <button
        id="jal-saheli-history-nav-btn"
        onClick={handleGoToHistory}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
        title="View all field submissions"
      >
        <ListFilter className="w-3.5 h-3.5 text-slate-500" />
        History
      </button>

      <button
        id="jal-saheli-verifications-nav-btn"
        onClick={handleGoToVerifications}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
        title="View AI & satellite verification audits"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
        Verifications
      </button>

      <button
        id="jal-saheli-earnings-nav-btn"
        onClick={handleGoToEarnings}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
        title="View earnings & DBT ledger"
      >
        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
        Earnings
      </button>

      <button
        id="jal-saheli-submit-cta"
        onClick={handleGoToSubmit}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
      >
        <Camera className="w-3.5 h-3.5 shrink-0" />
        Submit Observation
      </button>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render Dashboard
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* 1. Header */}
      <PageHeader
        title="Jal Saheli — Field Worker Hub"
        subtitle="Community water monitoring • Photo → AI → Satellite → Verified → Earnings"
        actions={headerActions}
      />

      {/* 2. Profile card */}
      <JalSaheliProfile profile={profile} />

      {/* 3. Four clickable stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Accuracy */}
        <div
          onClick={handleGoToVerifications}
          className="bg-white p-5 border border-slate-200 rounded-sm shadow-xs cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
          title="Click to view verification decisions"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Accuracy Rate
            </span>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded group-hover:bg-emerald-100 transition-colors">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 tracking-tight">
            {stats.accuracyRate != null ? `${stats.accuracyRate}%` : 'N/A'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              {stats.accuracyRate != null ? (
                <>
                  <span className="text-emerald-600 font-semibold">●</span>
                  <span>{stats.accuracyRate >= 90 ? 'Excellent tier' : stats.accuracyRate >= 75 ? 'Good tier' : 'Needs Review'}</span>
                </>
              ) : (
                <span className="text-slate-400">Pending verifications</span>
              )}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Audits <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Verified */}
        <div
          onClick={handleGoToVerifications}
          className="cursor-pointer group"
          title="Click to view verified reports"
        >
          <StatCard
            label="Verified Reports"
            value={displayVerified.toString()}
            change={`${stats.rejectedCount || 0} rejected`}
            trend="up"
            icon="CheckCircle2"
          />
        </div>

        {/* Pending */}
        <div
          onClick={handleGoToHistory}
          className="bg-white p-5 border border-slate-200 rounded-sm shadow-xs cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all group"
          title="Click to view pending submissions"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-700 transition-colors">
              Pending Review
            </span>
            <div className="p-2 bg-amber-50 border border-amber-100 rounded group-hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600 tracking-tight">
            {displayPending}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Awaiting triage</span>
            <span className="text-[10px] text-amber-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Queue <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Earnings */}
        <div
          onClick={handleGoToEarnings}
          className="bg-white p-5 border border-slate-200 rounded-sm shadow-xs cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
          title="Click to view earnings ledger"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Total Earnings
            </span>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded group-hover:bg-emerald-100 transition-colors">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 tracking-tight">
            {stats.totalEarningsDisplay}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="text-[10px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">DBT Settled</span>
            <span className="text-[10px] text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Ledger <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 4. Accuracy + Earnings detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AccuracyScore
          accuracyRate={stats.accuracyRate}
          accuracyDisplay={stats.accuracyRateDisplay}
          history={accuracyHistory}
        />
        {earningsSummary && (
          <EarningsCard
            summary={earningsSummary}
            onViewAll={handleGoToEarnings}
          />
        )}
      </div>

      {/* 5. Recent submissions with View All link and clickable rows */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Submissions</span>
            <span className="text-[11px] text-slate-400 font-medium">• {submissions.length} recorded</span>
          </div>
          <button
            type="button"
            id="jal-saheli-view-all-history-btn"
            onClick={handleGoToHistory}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
          >
            <span>View All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            message="Tap 'Submit Observation' to record your first water feature."
            action={
              <button
                onClick={handleGoToSubmit}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
              >
                Submit Observation
              </button>
            }
          />
        ) : (
          <div>
            {recent.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                onClick={handleGoToHistory}
              />
            ))}
            {submissions.length > 5 && (
              <div className="pt-3 border-t border-slate-100 mt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoToHistory}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  + {submissions.length - 5} more in history. Tap to view full log
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Lifecycle pipeline banner */}
      <PipelineBanner onStepClick={(view) => {
        if (view === 'submit') handleGoToSubmit();
        else if (view === 'verifications') handleGoToVerifications();
        else if (view === 'earnings') handleGoToEarnings();
      }} />

    </div>
  );
}
