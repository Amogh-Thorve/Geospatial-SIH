import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { getRecommendation } from '../services/recommendationService';
import { listSubmissions } from '../services/geoAiService';
import { getDashboardSummary } from '../services/dashboardService';
import {
  CheckCircle2,
  BarChart,
  BrainCircuit,
  Loader2,
} from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recs, setRecs] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, submissions] = await Promise.all([getDashboardSummary(), listSubmissions()]);
      setSummary(dash);
      const analyzed = submissions.filter((s) => ['ANALYZED', 'VERIFIED', 'VERIFICATION_REQUIRED'].includes(s.status));
      const results = [];
      for (const item of analyzed.slice(0, 4)) {
        try {
          results.push({ id: item.id, location: item.location_label, ...(await getRecommendation(item.id)) });
        } catch {
          /* recommendation may not exist yet */
        }
      }
      setRecs(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const primary = recs[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & recommendations"
        subtitle="Rule-based recommendation engine driven by persisted Geo AI analysis."
      />
      <ConnectionBanner />

      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recommendations…
        </div>
      )}
      {error && <EmptyState title="Could not load analytics" message={error} action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded" onClick={load}>Retry</button>} />}

      {!loading && !error && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.kpis.slice(0, 4).map((card) => (
            <div key={card.id} className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.label}</span>
              <div className="text-2xl font-bold text-slate-900 mt-2">{card.value}</div>
              <p className="text-[11px] text-slate-500 mt-1">{card.change}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && !primary && (
        <EmptyState title="No recommendations yet" message="Run analysis on a submission to generate a recommendation." />
      )}

      {primary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                  {primary.provider}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{primary.intervention}</h3>
                <p className="text-xs text-slate-500">{primary.location} · {primary.id}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-emerald-600">{Math.round(primary.suitability * 100)}%</span>
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Suitability</span>
              </div>
            </div>
            <div className="space-y-2">
              {(primary.reasons || []).map((reason) => (
                <div key={reason} className="flex items-start space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-900 text-slate-100 rounded-sm space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <BrainCircuit className="w-4 h-4" />
                <span>Explainability ({primary.method})</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">{primary.explanation}</p>
            </div>
            <button type="button" onClick={() => navigate(`/submission-analysis?id=${primary.id}`)} className="text-xs font-semibold text-emerald-700">
              Open source submission
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Other scored sites</span>
              <BarChart className="w-4 h-4 text-slate-400" />
            </h4>
            {recs.map((row) => (
              <button key={row.id} type="button" onClick={() => navigate(`/submission-analysis?id=${row.id}`)} className="w-full text-left">
                <div className="flex justify-between font-semibold mb-1 text-xs">
                  <span>{row.id} · {row.intervention}</span>
                  <span>{Math.round(row.suitability * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.round(row.suitability * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
