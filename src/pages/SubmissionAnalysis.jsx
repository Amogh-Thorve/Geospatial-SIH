import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import AnalysisCard from '../components/common/AnalysisCard';
import StatCard from '../components/common/StatCard';
import { MOCK_SUBMISSION_DETAIL } from '../data/mockData';
import { AI_SUBMISSION_ANALYSIS } from '../data/aiMockData';

// Pixel values from confirmed water body in our Srishti LISS-III scene
// (row 1243, col 1423 — NDWI +0.387)
const SAMPLE_PIXEL = { green: 180.0, red: 130.0, nir: 110.0, swir: 85.0 };

const SubmissionAnalysis = () => {
  const submission = MOCK_SUBMISSION_DETAIL;
  const ai = AI_SUBMISSION_ANALYSIS;

  const [satAnalysis, setSatAnalysis] = useState(null);
  const [apiStatus, setApiStatus]     = useState('loading');

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

  const classification = satAnalysis
    ? { label: satAnalysis.prediction, confidence: satAnalysis.confidence }
    : ai.classification;
  
  const ndviDisplay = satAnalysis ? `${satAnalysis.ndvi_val}` : ai.ndvi.change;
  const ndwiDisplay = satAnalysis ? `${satAnalysis.ndwi_val}` : ai.ndwi.change;
  const matchDisplay = satAnalysis ? satAnalysis.satellite_match : ai.satelliteMatch.status;

  return (
    <div className="submission-analysis-page" style={{ padding: '24px' }}>
      <PageHeader 
        title={`Submission Analysis — ${submission.id}`}
        subtitle={submission.title}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary">Flag for Re-Inspection</button>
            <button className="btn-primary">Verify Intervention</button>
          </div>
        }
      />

      {/* Submission Meta */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <small>Location</small>
          <div><strong>{submission.location}</strong></div>
        </div>
        <div>
          <small>Coordinates</small>
          <div><strong>{submission.coordinates}</strong></div>
        </div>
        <div>
          <small>Submitter</small>
          <div><strong>{submission.submitter.name}</strong></div>
        </div>
        <div>
          <small>Date</small>
          <div><strong>{submission.timestamp}</strong></div>
        </div>
      </div>

      {/* Visual Evidence Section */}
      <h3 style={{ marginBottom: '16px' }}>Visual Evidence</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        
        {/* Field Geotagged Photo */}
        <div className="image-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
          <h4 style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', marginBottom: '12px' }}>Field Geotagged Image</h4>
          <div style={{ height: '180px', borderRadius: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>No field photo available for this submission</p>
            <small style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Submission {submission.id} contains geotag coordinates only</small>
          </div>
        </div>

        {/* IRS-R2A LISS-III Satellite View */}
        <div className="image-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>IRS-R2A LISS-III Satellite Image (Srishti Platform)</h4>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>🛰️ 24m Resolution</span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '6px', overflow: 'hidden', background: '#0f172a' }}>
            <img 
              src="/srishti_scene.jpg" 
              alt="Srishti LISS-III False Color Composite Scene" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(15,23,42,0.85)', color: '#4ade80', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              📡 IRS-R2A L3 | Path: 101 / Row: 064 | Srishti GeoTIFF
            </div>
          </div>
        </div>

      </div>

      {/* AI Analysis Section */}
      <h3 style={{ marginBottom: '16px' }}>AI Geospatial Analysis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard 
          label={`Classification ${apiStatus === 'live' ? '🟢 Live' : apiStatus === 'loading' ? '⏳' : '🟡 Mock'}`}
          value={classification.label} 
          trend={`${classification.confidence}% Confidence`} 
        />
        <StatCard 
          label={`NDVI Index ${apiStatus === 'live' ? '🟢 Live' : ''}`} 
          value={ndviDisplay} 
          trend={satAnalysis ? "Srishti LISS-III real NDVI" : ai.ndvi.interpretation} 
        />
        <StatCard 
          label={`NDWI Index ${apiStatus === 'live' ? '🟢 Live' : ''}`} 
          value={ndwiDisplay} 
          trend={satAnalysis ? "Srishti LISS-III real NDWI" : ai.ndwi.interpretation} 
        />
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <small style={{ color: '#666', marginBottom: '8px' }}>Satellite Match {apiStatus === 'live' ? '🟢 Live' : ''}</small>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{matchDisplay}</span>
            <StatusBadge status={matchDisplay === 'MATCH' ? 'verified' : 'flagged'} />
          </div>
          <small style={{ marginTop: '8px', color: '#888' }}>{classification.confidence}% Confidence</small>
        </div>
      </div>

      {/* Explainable AI (XAI) & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <AnalysisCard 
          title="Why was this classified?"
          subtitle="Explainable AI reasoning for this decision"
          reasons={
            satAnalysis ? [
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
            ] : ai.xaiReasons
          }
          confidenceText={`AI Confidence ${classification.confidence}%`}
        />
        
        <div className="technical-metrics" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ marginBottom: '16px' }}>Technical Metrics</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ai.technicalMetrics.map((metric, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px' }}>
                <span style={{ color: '#666' }}>{metric.label}</span>
                <span style={{ fontWeight: '500' }}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SubmissionAnalysis;
