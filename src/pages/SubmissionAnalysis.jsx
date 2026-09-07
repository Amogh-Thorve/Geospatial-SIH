import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import AnalysisCard from '../components/common/AnalysisCard';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { analyzeSubmission, getAnalysis, getSubmission, listSubmissions } from '../services/geoAiService';
import { getRecommendation } from '../services/recommendationService';
import { Loader2 } from 'lucide-react';

export default function SubmissionAnalysis() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedId = params.get('id');
  const [submissionId, setSubmissionId] = useState(requestedId);
  const [catalog, setCatalog] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSubmissions();
      setCatalog(list);
      const targetId = id || requestedId || list[0]?.id;
      if (!targetId) {
        setSubmission(null);
        setAnalysis(null);
        return;
      }
      setSubmissionId(targetId);
      const sub = await getSubmission(targetId);
      setSubmission(sub);
      try {
        const existing = await getAnalysis(targetId);
        setAnalysis(existing);
      } catch {
        setAnalysis(null);
      }
      try {
        setRecommendation(await getRecommendation(targetId));
      } catch {
        setRecommendation(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(requestedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  const xaiReasons = useMemo(() => {
    if (!analysis?.xai?.explanation) return [];
    return analysis.xai.explanation.map((text, idx) => ({
      id: idx,
      title: analysis.xai.important_features?.[idx]?.feature?.replaceAll('_', ' ') || `Factor ${idx + 1}`,
      description: text,
      weight: analysis.xai.important_features?.[idx]
        ? `${Math.round(analysis.xai.important_features[idx].importance * 100)}%`
        : 'Demo',
    }));
  }, [analysis]);

  const runAnalyze = async () => {
    if (!submissionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeSubmission(submissionId);
      setAnalysis(result);
      try {
        setRecommendation(await getRecommendation(submissionId));
      } catch {
        setRecommendation(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={submission ? `Submission Analysis — ${submission.id}` : 'Submission Analysis'}
        subtitle="Geo AI boundary (MockGeoAIProvider). NDVI/NDWI values are simulated unless real bands exist."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !submission}
              onClick={runAnalyze}
              className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold disabled:opacity-50"
            >
              {busy ? 'Analyzing…' : 'Run demo analysis'}
            </button>
            {analysis?.anomaly && (
              <button
                type="button"
                onClick={() => navigate('/verification')}
                className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold"
              >
                Open verification queue
              </button>
            )}
          </div>
        }
      />
      <ConnectionBanner />

      <div className="flex flex-wrap gap-2">
        {catalog.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/submission-analysis?id=${item.id}`)}
            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
              item.id === submissionId ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {item.id}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center py-16 justify-center text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analysis…
        </div>
      )}
      {error && (
        <EmptyState title="Could not load analysis" message={error} action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs" onClick={() => load(submissionId)}>Retry</button>} />
      )}

      {!loading && !error && !submission && (
        <EmptyState title="No submissions" message="Create a submission from Jal Saheli or the API first." />
      )}

      {!loading && submission && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white border border-slate-200 rounded-sm p-4">
            <div><span className="text-slate-500 block">Location</span><strong>{submission.location_label}</strong></div>
            <div><span className="text-slate-500 block">Coordinates</span><strong>{submission.coordinates}</strong></div>
            <div><span className="text-slate-500 block">Submitter</span><strong>{submission.submitter_name}</strong></div>
            <div><span className="text-slate-500 block">Captured</span><strong>{new Date(submission.captured_at).toLocaleString('en-IN')}</strong></div>
          </div>

          {!analysis && (
            <EmptyState
              title="No analysis yet"
              message="Run the demo Geo AI provider for this submission. This does not execute a trained model."
              action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs" onClick={runAnalyze}>Analyze</button>}
            />
          )}

          {analysis && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Classification" value={analysis.classification} change={`${Math.round(analysis.confidence * 100)}% confidence · ${analysis.provider}`} />
                <StatCard label="NDVI" value={analysis.ndvi ?? '—'} change={`${analysis.ndvi_source} value`} />
                <StatCard label="NDWI" value={analysis.ndwi ?? '—'} change={`${analysis.ndwi_source} value`} />
                <StatCard label="LULC" value={analysis.lulc} change={analysis.change_detection} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-sm p-4 text-xs">
                  <p className="text-slate-500 mb-1">Satellite match</p>
                  <div className="flex items-center gap-2">
                    <strong className="text-lg">{analysis.satellite_match}</strong>
                    <StatusBadge status={analysis.anomaly ? 'flagged' : 'verified'} text={analysis.anomaly ? 'Anomaly' : 'Clear'} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Srishti adapter is local/demo. No live satellite download.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-sm p-4 text-xs lg:col-span-2">
                  <p className="text-slate-500 mb-1">Recommended intervention</p>
                  <p className="text-lg font-bold">{recommendation?.intervention || analysis.recommendation || 'Not generated'}</p>
                  {recommendation && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Suitability {Math.round(recommendation.suitability * 100)}% · {recommendation.provider} · {recommendation.method}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AnalysisCard
                    title="Why was this classified?"
                    subtitle={`${analysis.xai?.method || 'rule-based-demo'} — not SHAP`}
                    reasons={xaiReasons}
                    confidenceLabel={`${Math.round(analysis.confidence * 100)}% (demo)`}
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-sm p-5 text-xs space-y-2">
                  <h4 className="font-bold mb-2">Technical metrics</h4>
                  {(analysis.xai?.important_features || []).map((f) => (
                    <div key={f.feature} className="flex justify-between border-b border-slate-100 py-1">
                      <span className="text-slate-500">{f.feature}</span>
                      <span className="font-medium">{f.importance}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 pt-2">Submission status: {analysis.submission_status}</p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
