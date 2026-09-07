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
import { MOCK_SUBMISSION_DETAIL } from '../data/mockData';
import { AI_SUBMISSION_ANALYSIS } from '../data/aiMockData';
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

  // Live FastAPI Backend State (Person 2)
  const [satAnalysis, setSatAnalysis] = useState(null);
  const [apiStatus, setApiStatus]     = useState('loading');

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
      setSubmission(sub || MOCK_SUBMISSION_DETAIL);
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
      setSubmission(MOCK_SUBMISSION_DETAIL);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(requestedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  // Live backend call to FastAPI analyze-location endpoint
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/analyze-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: 13.2172,
            longitude: 79.1003
          }),
        });
        if (!res.ok) throw new Error('Non-200');
        const data = await res.json();
        console.log('[DEBUG] Live API Response for GW-1042:', data);
        setSatAnalysis(data);
        setApiStatus('live');
      } catch {
        setApiStatus('offline');
      }
    };
    fetchAnalysis();
  }, []);

  const ai = AI_SUBMISSION_ANALYSIS;
  const currentSub = submission || MOCK_SUBMISSION_DETAIL;

  const classification = satAnalysis
    ? { label: satAnalysis.prediction, confidence: satAnalysis.confidence }
    : (analysis ? { label: analysis.classification, confidence: Math.round(analysis.confidence * 100) } : ai.classification);

  const ndviDisplay = satAnalysis ? `${satAnalysis.ndvi_val}` : (analysis?.ndvi != null ? `${analysis.ndvi}` : ai.ndvi.change);
  const ndwiDisplay = satAnalysis ? `${satAnalysis.ndwi_val}` : (analysis?.ndwi != null ? `${analysis.ndwi}` : ai.ndwi.change);
  const matchDisplay = satAnalysis ? satAnalysis.satellite_match : (analysis?.satellite_match || ai.satelliteMatch.status);

  const xaiReasons = useMemo(() => {
    if (satAnalysis) {
      return [
        {
          id: 1,
          title: matchDisplay === 'MATCH' ? "Water Body Signature Confirmed" : "Spectral Mismatch Flagged",
          description: matchDisplay === 'MATCH'
            ? `Srishti LISS-III multispectral classification confirmed surface water signature (NDWI: ${ndwiDisplay}, NDVI: ${ndviDisplay}).`
            : `Srishti LISS-III multispectral classification detected raw soil/barren land (NDWI: ${ndwiDisplay}, NDVI: ${ndviDisplay}), indicating zero surface water retention at submission coordinates.`,
          weight: "High Impact"
        },
        {
          id: 2,
          title: "Satellite Evidence Analysis",
          description: "IRS-R2A LISS-III multispectral data (Srishti platform) cross-referenced against post-geotag reflectance baseline.",
          weight: "High Impact"
        },
        {
          id: 3,
          title: "Location Within Intervention Zone",
          description: "Geotagged coordinates fall inside Micro-Watershed Catchment Zone AP-CH-04B.",
          weight: "Medium Impact"
        }
      ];
    }
    if (!analysis?.xai?.explanation) return ai.xaiReasons;
    return analysis.xai.explanation.map((text, idx) => ({
      id: idx,
      title: analysis.xai.important_features?.[idx]?.feature?.replaceAll('_', ' ') || `Factor ${idx + 1}`,
      description: text,
      weight: analysis.xai.important_features?.[idx]
        ? `${Math.round(analysis.xai.important_features[idx].importance * 100)}%`
        : 'Demo',
    }));
  }, [satAnalysis, analysis, matchDisplay, ndwiDisplay, ndviDisplay, ai.xaiReasons]);

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
    <div className="space-y-6 p-6">
      <PageHeader
        title={currentSub ? `Submission Analysis — ${currentSub.id}` : 'Submission Analysis'}
        subtitle={currentSub.title || "Check Dam Construction — Sub-basin 4B"}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !currentSub}
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

      {error && !currentSub && (
        <EmptyState title="Could not load analysis" message={error} action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs" onClick={() => load(submissionId)}>Retry</button>} />
      )}

      {!loading && currentSub && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white border border-slate-200 rounded-sm p-4">
            <div><span className="text-slate-500 block">Location</span><strong>{currentSub.location || currentSub.location_label}</strong></div>
            <div><span className="text-slate-500 block">Coordinates</span><strong>{currentSub.coordinates}</strong></div>
            <div><span className="text-slate-500 block">Submitter</span><strong>{currentSub.submitter?.name || currentSub.submitter_name}</strong></div>
            <div><span className="text-slate-500 block">Captured</span><strong>{currentSub.timestamp || new Date(currentSub.captured_at).toLocaleString('en-IN')}</strong></div>
          </div>

          {/* Visual Evidence Section */}
          <h3 className="text-base font-bold text-slate-900 pt-2">Visual Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Field Geotagged Photo */}
            <div className="image-card bg-white border border-slate-200 rounded-sm p-4">
              <h4 className="font-semibold text-xs text-slate-800 mb-3">Field Geotagged Image</h4>
              <div className="h-44 rounded bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <p className="text-xs font-semibold text-slate-700">No field photo available for this submission</p>
                <small className="text-[11px] text-slate-400 mt-1">Submission {currentSub.id} contains geotag coordinates only</small>
              </div>
            </div>

            {/* IRS-R2A LISS-III Satellite View */}
            <div className="image-card bg-white border border-slate-200 rounded-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-xs text-slate-800">IRS-R2A LISS-III Satellite Image (Srishti Platform)</h4>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">🛰️ 24m Resolution</span>
              </div>
              <div className="relative w-full h-44 rounded overflow-hidden bg-slate-900">
                <img 
                  src="/srishti_scene.jpg" 
                  alt="Srishti LISS-III False Color Composite Scene" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-2 left-2 bg-slate-900/85 text-emerald-400 px-2.5 py-1 rounded text-[11px] font-mono">
                  📡 IRS-R2A L3 | Path: 101 / Row: 064 | Srishti GeoTIFF
                </div>
              </div>
            </div>

          </div>

          {/* AI Geospatial Analysis Cards */}
          <h3 className="text-base font-bold text-slate-900 pt-2">AI Geospatial Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label={`Classification ${apiStatus === 'live' ? '🟢 Live' : apiStatus === 'loading' ? '⏳' : '🟡 Mock'}`}
              value={classification.label} 
              trend={`${classification.confidence}% Confidence`} 
            />
            <StatCard 
              label={`NDVI Index ${apiStatus === 'live' ? '🟢 Live' : ''}`} 
              value={ndviDisplay} 
              trend={satAnalysis ? "Srishti LISS-III real NDVI" : (ai.ndvi.interpretation || "NDVI value")} 
            />
            <StatCard 
              label={`NDWI Index ${apiStatus === 'live' ? '🟢 Live' : ''}`} 
              value={ndwiDisplay} 
              trend={satAnalysis ? "Srishti LISS-III real NDWI" : (ai.ndwi.interpretation || "NDWI value")} 
            />
            <div className="border border-slate-200 rounded-sm p-4 bg-white flex flex-col justify-center">
              <small className="text-slate-500 mb-2 font-medium text-xs">Satellite Match {apiStatus === 'live' ? '🟢 Live' : ''}</small>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{matchDisplay}</span>
                <StatusBadge status={matchDisplay === 'MATCH' ? 'verified' : 'flagged'} />
              </div>
              <small className="mt-2 text-slate-400 text-[11px]">{classification.confidence}% Confidence</small>
            </div>
          </div>

          {/* Explainable AI (XAI) & Technical Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AnalysisCard 
                title="Why was this classified?"
                subtitle="Explainable AI reasoning for this decision"
                reasons={xaiReasons}
                confidenceText={`AI Confidence ${classification.confidence}%`}
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-sm p-5 text-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Technical Metrics</h4>
              <div className="space-y-2">
                {(ai.technicalMetrics || []).map((metric, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="text-slate-500">{metric.label}</span>
                    <span className="font-semibold text-slate-800">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
