import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import AnalysisCard from '../components/common/AnalysisCard';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { analyzeSubmission, getAnalysis, getGeoAiHealth, getSubmission, listSubmissions } from '../services/geoAiService';
import { getRecommendation } from '../services/recommendationService';
import { Loader2 } from 'lucide-react';

function formatConfidence(value) {
  if (value == null || Number.isNaN(Number(value))) return 'Not produced';
  const numeric = Number(value);
  if (numeric <= 1) return `${Math.round(numeric * 100)}%`;
  return `${Math.round(numeric)}%`;
}

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
  const [geoError, setGeoError] = useState(null);
  const [geoHealth, setGeoHealth] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGeoAiHealth().then(setGeoHealth).catch(() => setGeoHealth(null));
  }, []);

  const load = async (id) => {
    setLoading(true);
    setError(null);
    setGeoError(null);
    try {
      const list = await listSubmissions();
      setCatalog(list);
      const targetId = id || requestedId || list[0]?.id;
      if (!targetId) {
        setSubmission(null);
        setAnalysis(null);
        setRecommendation(null);
        return;
      }
      setSubmissionId(targetId);
      const sub = await getSubmission(targetId);
      setSubmission(sub);
      try {
        const existing = await getAnalysis(targetId);
        setAnalysis(existing);
      } catch (err) {
        setAnalysis(null);
        if (err.status && err.status !== 404) setGeoError(err.message);
      }
      try {
        setRecommendation(await getRecommendation(targetId));
      } catch {
        setRecommendation(null);
      }
    } catch (err) {
      setError(err.message);
      setSubmission(null);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(requestedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  const unavailable = analysis && (analysis.status === 'UNAVAILABLE' || analysis.satellite_match === 'UNAVAILABLE');
  const hasResult = analysis && !unavailable && analysis.ndvi != null;

  const xaiReasons = useMemo(() => {
    if (!analysis?.xai?.explanation?.length) return [];
    return analysis.xai.explanation.map((text, idx) => ({
      id: idx,
      title: analysis.xai.important_features?.[idx]?.feature?.replaceAll('_', ' ') || `Lookup note ${idx + 1}`,
      description: text,
      weight: analysis.xai.important_features?.[idx]
        ? `${Math.round(analysis.xai.important_features[idx].importance * 100)}%`
        : analysis.xai.method,
    }));
  }, [analysis]);

  const runAnalyze = async () => {
    if (!submissionId) return;
    setBusy(true);
    setGeoError(null);
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
      setGeoError(err.message || 'Geo AI unavailable');
      setAnalysis(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={submission ? `Submission Analysis — ${submission.id}` : 'Submission Analysis'}
        subtitle={submission?.title || 'Run Geo AI on a persisted submission'}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !submission}
              onClick={runAnalyze}
              className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold disabled:opacity-50"
            >
              {busy ? 'Analyzing…' : 'Run Geo AI analysis'}
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

      {catalog.length > 0 && (
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
      )}

      {loading && (
        <div className="flex items-center py-16 justify-center text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analysis…
        </div>
      )}

      {error && (
        <EmptyState
          title="Could not load submission"
          message={error}
          action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs" onClick={() => load(submissionId)}>Retry</button>}
        />
      )}

      {!loading && !error && !submission && (
        <EmptyState title="No submissions" message="Create a geo-tagged submission before running Geo AI." />
      )}

      {!loading && submission && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white border border-slate-200 rounded-sm p-4">
            <div><span className="text-slate-500 block">Location</span><strong>{submission.location_label}</strong></div>
            <div><span className="text-slate-500 block">Coordinates</span><strong>{submission.coordinates}</strong></div>
            <div><span className="text-slate-500 block">Submitter</span><strong>{submission.submitter_name}</strong></div>
            <div><span className="text-slate-500 block">Captured</span><strong>{submission.captured_at ? new Date(submission.captured_at).toLocaleString('en-IN') : '—'}</strong></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-sm p-3">
              <span className="text-slate-500 block">Bhuvan WMS</span>
              <strong>
                {geoHealth?.bhuvan?.reachable
                  ? 'Connected'
                  : geoHealth?.bhuvan?.enabled
                  ? 'Unavailable'
                  : 'Disabled'}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-sm p-3">
              <span className="text-slate-500 block">LULC source</span>
              <strong>{analysis?.lulc_source || 'Local satellite grid when analyzed'}</strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-sm p-3">
              <span className="text-slate-500 block">Bhuvan LULC API</span>
              <strong>
                {geoHealth?.bhuvan_lulc?.configured
                  ? 'Configured (token required)'
                  : geoHealth?.bhuvan_lulc?.enabled
                  ? 'Enabled — token missing'
                  : 'Disabled'}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-sm p-3">
              <span className="text-slate-500 block">Index source</span>
              <strong>{analysis?.ndvi_source || 'satellite_lookup.npz when analyzed'}</strong>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 pt-2">Visual Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="image-card bg-white border border-slate-200 rounded-sm p-4">
              <h4 className="font-semibold text-xs text-slate-800 mb-3">Field Geotagged Image</h4>
              {submission.photo_url ? (
                <img src={submission.photo_url} alt="Field photo" className="h-44 w-full object-cover rounded" />
              ) : (
                <div className="h-44 rounded bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <p className="text-xs font-semibold text-slate-700">No field photo available for this submission</p>
                  <small className="text-[11px] text-slate-400 mt-1">Submission {submission.id} contains geotag coordinates only</small>
                </div>
              )}
            </div>
            <div className="image-card bg-white border border-slate-200 rounded-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-xs text-slate-800">Offline LISS-III lookup scene (static product)</h4>
                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">240 m NPZ grid</span>
              </div>
              <div className="relative w-full h-44 rounded overflow-hidden bg-slate-900">
                <img
                  src="/srishti_scene.jpg"
                  alt="Static scene overview used to build satellite_lookup.npz"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-slate-900/85 text-emerald-400 px-2.5 py-1 rounded text-[11px] font-mono">
                  {analysis?.satellite_imagery_provider === 'Bhuvan'
                    ? 'Bhuvan WMS imagery (indices from local grid)'
                    : 'Local satellite grid — Bhuvan not used for this analysis'}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 pt-2">AI Geospatial Analysis</h3>
          {geoError && (
            <EmptyState title="Geo AI unavailable" message={geoError} />
          )}
          {!geoError && !analysis && (
            <EmptyState
              title="No analysis yet"
              message="Run Geo AI analysis to look up NDVI, NDWI, and LULC from the local satellite grid."
            />
          )}
          {unavailable && (
            <EmptyState
              title="Geo AI unavailable"
              message={analysis.change_detection || 'SATELLITE DATA UNAVAILABLE for these coordinates.'}
            />
          )}
          {hasResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Classification"
                value={analysis.classification || analysis.lulc}
                trend={`${formatConfidence(analysis.confidence)} confidence`}
              />
              <StatCard
                label="NDVI Index"
                value={`${analysis.ndvi}`}
                trend={analysis.ndvi_source}
              />
              <StatCard
                label="NDWI Index"
                value={`${analysis.ndwi}`}
                trend={analysis.ndwi_source}
              />
              <div className="border border-slate-200 rounded-sm p-4 bg-white flex flex-col justify-center">
                <small className="text-slate-500 mb-2 font-medium text-xs">Satellite Match</small>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{analysis.satellite_match}</span>
                  <StatusBadge status={analysis.satellite_match === 'MATCH' ? 'verified' : 'flagged'} />
                </div>
                <small className="mt-2 text-slate-400 text-[11px]">{analysis.change_detection}</small>
              </div>
            </div>
          )}

          {hasResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {xaiReasons.length ? (
                  <AnalysisCard
                    title="Why was this classified?"
                    subtitle={analysis.xai?.method || 'Lookup metadata (not SHAP/LIME)'}
                    reasons={xaiReasons}
                    confidenceText={`Confidence ${formatConfidence(analysis.confidence)}`}
                  />
                ) : (
                  <EmptyState title="No model explanation" message="SHAP/LIME are not executed. Lookup metadata is shown when present." />
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-sm p-5 text-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Recommendation</h4>
                {recommendation ? (
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Intervention</span>
                      <span className="font-semibold text-slate-800">{recommendation.intervention}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Suitability</span>
                      <span className="font-semibold text-slate-800">
                        {recommendation.suitability == null ? 'Not scored' : recommendation.suitability}
                      </span>
                    </div>
                    <p className="text-slate-600">{recommendation.explanation}</p>
                  </div>
                ) : (
                  <p className="text-slate-500">No recommendation stored for this submission.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
