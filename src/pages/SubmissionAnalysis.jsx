import React from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import AnalysisCard from '../components/common/AnalysisCard';
import StatCard from '../components/common/StatCard';
import { MOCK_SUBMISSION_DETAIL } from '../data/mockData';
import { AI_SUBMISSION_ANALYSIS } from '../data/aiMockData';

const SubmissionAnalysis = () => {
  const submission = MOCK_SUBMISSION_DETAIL;
  const ai = AI_SUBMISSION_ANALYSIS;

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
        <div className="image-card" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px' }}>
          <h4>Field Geotagged Image</h4>
          <img 
            src={submission.groundPhotoUrl} 
            alt="Ground level" 
            style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }} 
          />
        </div>
        <div className="image-card" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px' }}>
          <h4>Sentinel-2 Satellite Image</h4>
          <img 
            src={submission.satelliteImageUrl} 
            alt="Satellite View" 
            style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }} 
          />
        </div>
      </div>

      {/* AI Analysis Section */}
      <h3 style={{ marginBottom: '16px' }}>AI Geospatial Analysis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard 
          label="Classification" 
          value={ai.classification.label} 
          trend={`${ai.classification.confidence}% Confidence`} 
        />
        <StatCard 
          label="NDVI Change" 
          value={ai.ndvi.change} 
          trend={ai.ndvi.interpretation} 
        />
        <StatCard 
          label="NDWI Change" 
          value={ai.ndwi.change} 
          trend={ai.ndwi.interpretation} 
        />
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <small style={{ color: '#666', marginBottom: '8px' }}>Satellite Match</small>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{ai.satelliteMatch.status}</span>
            <StatusBadge status={ai.satelliteMatch.statusText} />
          </div>
          <small style={{ marginTop: '8px', color: '#888' }}>{ai.satelliteMatch.confidence}% Confidence</small>
        </div>
      </div>

      {/* Explainable AI (XAI) & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <AnalysisCard 
          title="Why was this classified?"
          subtitle="Explainable AI reasoning for this decision"
          reasons={ai.xaiReasons}
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
