import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import AnalysisCard from '../components/common/AnalysisCard';
import { MOCK_SUBMISSION_DETAIL } from '../data/mockData';
import {
  CheckCircle,
  Flag,
  Sparkles,
  MapPin,
  Calendar,
  UserCheck,
  Activity,
  Layers,
  Image as ImageIcon,
  Check,
  AlertOctagon
} from 'lucide-react';

export default function SubmissionAnalysis() {
  const submission = MOCK_SUBMISSION_DETAIL;
  const [userDecision, setUserDecision] = useState(null); // 'verified' | 'flagged' | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Submission Analysis — ${submission.id}`}
        subtitle={`${submission.title} • Geotag: ${submission.coordinates}`}
        actions={
          <div className="flex items-center space-x-2">
            <StatusBadge status="verified" text="AI Confidence 91%" />
            <StatusBadge status="warning" text="Satellite MATCH" />
          </div>
        }
      />

      {/* Verification Action Banner */}
      {userDecision && (
        <div className={`p-4 rounded-sm border flex items-center justify-between text-xs font-semibold ${
          userDecision === 'verified'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {userDecision === 'verified' ? <Check className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            <span>Decision recorded: {submission.id} marked as {userDecision.toUpperCase()} by District Officer.</span>
          </div>
          <button
            onClick={() => setUserDecision(null)}
            className="underline text-[11px] font-medium hover:opacity-80"
          >
            Reset Decision
          </button>
        </div>
      )}

      {/* Main Grid: Photo vs Satellite Comparison + Meta Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Audit & Metrics (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ground Photo vs Satellite Image Placeholders */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Multi-Spectral Visual Evidence Audit
              </h3>
              <span className="text-xs text-slate-500 font-medium">Timestamp: {submission.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ground Geotagged Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Field Geotagged Image</span>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Camera App EXIF</span>
                </div>
                <div className="relative h-56 bg-slate-800 rounded border border-slate-300 overflow-hidden group">
                  <img
                    src={submission.groundPhotoUrl}
                    alt="Ground submission"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 text-white px-2 py-1 rounded text-[10px] font-mono">
                    Geotagged: {submission.coordinates}
                  </div>
                </div>
              </div>

              {/* Sentinel-2 Satellite Composite Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Sentinel-2 L2A Tile</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    Match Confidence 91%
                  </span>
                </div>
                <div className="relative h-56 bg-slate-900 rounded border border-slate-300 overflow-hidden group">
                  <img
                    src={submission.satelliteImageUrl}
                    alt="Satellite view"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 text-emerald-400 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Band 8 (NIR) / Band 4 (Red)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Classification Metrics Panel */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              Spectral & ML Model Output Parameters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">Classification</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{submission.classification}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">AI Confidence</span>
                <span className="text-sm font-bold text-emerald-700 mt-1 block">{submission.confidence}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">NDVI Change</span>
                <span className="text-sm font-bold text-emerald-700 mt-1 block">{submission.ndviChange}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">NDWI Water Delta</span>
                <span className="text-sm font-bold text-sky-700 mt-1 block">{submission.ndwiChange}</span>
              </div>
            </div>
          </div>

          {/* Explainable AI (XAI) Card */}
          <AnalysisCard
            title="Why this was classified"
            subtitle="Feature attribution breakdown generated by GeoWise Vision Model"
            reasons={submission.xaiReasons}
            metrics={submission.technicalMetrics}
          />
        </div>

        {/* Right Sidebar: Submitter Info & Actions */}
        <div className="space-y-6">
          {/* Action Control Panel */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Officer Triage Controls
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review AI analysis and field submitter credentials before taking action.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setUserDecision('verified')}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Verify Intervention</span>
              </button>

              <button
                onClick={() => setUserDecision('flagged')}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs"
              >
                <Flag className="w-4 h-4" />
                <span>Flag for Re-Inspection</span>
              </button>

              <button
                onClick={() => alert("Showing full neural network layer weights and Sentinel-2 spectral curve analysis.")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>View Extended XAI</span>
              </button>
            </div>
          </div>

          {/* Submitter Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Submitter Profile</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                {submission.submitter.badge}
              </span>
            </h3>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Name:</span>
                <span className="font-bold text-slate-900">{submission.submitter.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-semibold text-slate-800">{submission.submitter.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-mono text-slate-700">{submission.submitter.phone}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500 font-medium">Reputation Score:</span>
                <span className="font-bold text-emerald-700">{submission.submitter.reputationScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
