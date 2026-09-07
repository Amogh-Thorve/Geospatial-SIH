import React from 'react';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import AlertCard from '../components/common/AlertCard';
import MapPanel from '../components/maps/MapPanel';
import StatusBadge from '../components/common/StatusBadge';
import {
  MOCK_KPIS,
  MOCK_ALERTS,
  MOCK_MAP_MARKERS,
  MOCK_VERIFICATION_QUEUE,
  MOCK_RECENT_ACTIVITY,
  MOCK_SYSTEM_STATUS,
} from '../data/mockData';
import {
  ArrowRight,
  RefreshCw,
  FileText,
  CheckCircle,
  ChevronRight,
  Activity,
  Satellite,
  BrainCircuit,
  ShieldCheck,
  Map,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Maps activity type to a small icon component */
const activityIconMap = {
  verification: CheckCircle,
  submission:   FileText,
  alert:        Activity,
  satellite:    Satellite,
};

/** Platform workflow steps */
const WORKFLOW_STEPS = [
  { label: 'Submission',           detail: 'Jal Saheli field photo + geotag via Telegram bot' },
  { label: 'AI Analysis',          detail: 'GeoBrain computer vision + spectral classification' },
  { label: 'Satellite Comparison', detail: 'Sentinel-2 NDVI/NDWI cross-validation' },
  { label: 'Verification',         detail: 'District officer triage and sign-off' },
  { label: 'Intervention',         detail: 'Verified data feeds watershed planning models' },
];

export default function CommandCenter() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Command Center"
        subtitle="Real-time watershed intelligence overview and priority triage for Andhra Pradesh"
        actions={
          <button
            type="button"
            disabled
            title="Satellite sync is not connected in this demo."
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Satellite Sync (Demo)</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi) => (
          <StatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Main Grid: Map (2 cols) + Right Panels (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Map Panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              Regional Geospatial Overview
            </h3>
            <button
              type="button"
              onClick={() => navigate('/gis-map')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <MapPanel markers={MOCK_MAP_MARKERS} height="h-[480px]" />
        </div>

        {/* Right Column Panels */}
        <div className="space-y-5">
          {/* Priority Alerts */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
                Priority Alerts ({MOCK_ALERTS.length})
              </h3>
              <button
                type="button"
                onClick={() => navigate('/verification')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                View Queue
              </button>
            </div>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {MOCK_ALERTS.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>

          {/* Recent Submissions Stream */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                Recent Ground Submissions
              </h3>
              <button
                type="button"
                onClick={() => navigate('/submission-analysis')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Inspect
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {MOCK_VERIFICATION_QUEUE.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{item.id}</span>
                      <span className="text-[11px] text-slate-500">· {item.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.location} · {item.submitter}</p>
                  </div>
                  <StatusBadge status={item.priority} text={item.priority} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform Workflow + Operational Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Workflow (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            Platform Workflow
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0" role="list" aria-label="Platform workflow steps">
            {WORKFLOW_STEPS.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className="flex-1 min-w-0" role="listitem">
                  <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{step.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug sm:pl-7 hidden sm:block">{step.detail}</p>
                  </div>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight
                    className="w-4 h-4 text-slate-300 shrink-0 rotate-90 sm:rotate-0 mx-1"
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Operational Status (1 col) */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            Operational Status
          </h3>
          <ul className="space-y-3" role="list" aria-label="System operational status">
            {MOCK_SYSTEM_STATUS.map((service) => (
              <li key={service.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{service.label}</p>
                  <p className="text-[11px] text-slate-500">{service.note}</p>
                </div>
                <StatusBadge status="success" text="Online" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            Recent Activity
          </h3>
        </div>
        <ul className="divide-y divide-slate-100" role="list" aria-label="Recent system activity">
          {MOCK_RECENT_ACTIVITY.map((event) => {
            const Icon = activityIconMap[event.type] ?? Activity;
            return (
              <li key={event.id} className="py-2.5 flex items-start gap-3 hover:bg-slate-50 px-1 rounded">
                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">{event.title}</p>
                    <StatusBadge status={event.status} text={event.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{event.detail}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{event.time}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
