import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import AlertCard from '../components/common/AlertCard';
import MapPanel from '../components/maps/MapPanel';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { getDashboardSummary, listSubmissions } from '../services/dashboardService';
import { getGisFeatures, featuresToLocations } from '../services/gisService';
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
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const activityIconMap = {
  verification: CheckCircle,
  submission: FileText,
  alert: Activity,
  satellite: Satellite,
};

const WORKFLOW_STEPS = [
  { label: 'Submission', detail: 'Jal Saheli geo-tagged field photo' },
  { label: 'AI Analysis', detail: 'Ved Random Forest + local satellite_lookup.npz' },
  { label: 'Satellite comparison', detail: 'Local NPZ grid; optional Bhuvan WMS when BHUVAN_ENABLED' },
  { label: 'Verification', detail: 'Autonomous triage → officer queue' },
  { label: 'Intervention', detail: 'Rule-based recommendation + feedback store' },
];

export default function CommandCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [recent, setRecent] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, gis, submissions] = await Promise.all([
        getDashboardSummary(),
        getGisFeatures(),
        listSubmissions(),
      ]);
      setSummary(dash);
      setMarkers(
        featuresToLocations(gis).map((loc) => ({
          id: loc.id,
          lat: loc.lat,
          lng: loc.lng,
          title: loc.name,
          district: loc.location,
          type: loc.type === 'flagged' ? 'flagged' : loc.type === 'jal-saheli' ? 'jal-saheli' : loc.status === 'verified' ? 'verified' : 'water-body',
          typeLabel: loc.type,
          submitter: loc.submitter || '',
          date: '',
          confidence: loc.confidence != null ? `${Math.round(loc.confidence * 100)}%` : null,
          status: loc.status,
          description: loc.description,
        })),
      );
      setRecent(submissions.slice(0, 4));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Operational watershed intelligence for the Andhra Pradesh pilot region."
        actions={
          <button
            type="button"
            onClick={load}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      <ConnectionBanner />

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading dashboard…
        </div>
      )}

      {error && (
        <EmptyState
          title="Command Center could not load"
          message={error}
          action={
            <button type="button" onClick={load} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold">
              Retry
            </button>
          }
        />
      )}

      {!loading && !error && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {summary.kpis.map((kpi) => (
              <StatCard key={kpi.id} {...kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Map className="w-3.5 h-3.5 text-slate-500" />
                  Regional geospatial overview
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/gis-map')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>Full GIS map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <MapPanel markers={markers} height="h-[480px]" />
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Priority cases ({summary.alerts.length})
                  </h3>
                  <button type="button" onClick={() => navigate('/verification')} className="text-[11px] font-semibold text-slate-600">
                    View queue
                  </button>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {summary.alerts.length === 0 && <p className="text-xs text-slate-500">No open triage tasks.</p>}
                  {summary.alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={{
                        ...alert,
                        submissionId: alert.submission_id,
                        time: alert.time,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Recent submissions
                  </h3>
                  <button type="button" onClick={() => navigate('/submission-analysis')} className="text-[11px] font-semibold text-slate-600">
                    Inspect
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {recent.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/submission-analysis?id=${item.id}`)}
                      className="py-2.5 w-full flex items-center justify-between hover:bg-slate-50 px-1 rounded text-left"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{item.id}</span>
                          <span className="text-[11px] text-slate-500">· {item.classification || item.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{item.location_label} · {item.submitter_name}</p>
                      </div>
                      <StatusBadge status={item.status} text={item.status} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              ['/', 'Command'],
              ['/gis-map', 'GIS Map'],
              ['/submission-analysis', 'Analysis'],
              ['/verification', 'Verification'],
              ['/analytics', 'Recommendations'],
              ['/jal-saheli', 'Jal Saheli'],
            ].map(([to, label]) => (
              <Link key={to} to={to} className="bg-white border border-slate-200 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400">
                {label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
                Platform workflow
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <React.Fragment key={step.label}>
                    <div className="flex-1 min-w-0">
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
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 rotate-90 sm:rotate-0 mx-1" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                System status
              </h3>
              <ul className="space-y-3">
                {(summary.system_status || []).map((service) => (
                  <li key={service.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{service.label}</p>
                      <p className="text-[11px] text-slate-500">{service.note}</p>
                    </div>
                    <StatusBadge status={service.status === 'operational' ? 'success' : 'warning'} text={service.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Recent activity
              </h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {(summary.activity || []).map((event) => {
                const Icon = activityIconMap[event.type] ?? Activity;
                return (
                  <li key={event.id} className="py-2.5 flex items-start gap-3 px-1">
                    <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">{event.title}</p>
                        <StatusBadge status={event.status} text={event.status} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{event.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
