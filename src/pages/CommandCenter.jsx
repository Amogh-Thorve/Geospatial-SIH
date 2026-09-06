import React from 'react';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import AlertCard from '../components/common/AlertCard';
import MapPanel from '../components/maps/MapPanel';
import StatusBadge from '../components/common/StatusBadge';
import { MOCK_KPIS, MOCK_ALERTS, MOCK_MAP_MARKERS, MOCK_VERIFICATION_QUEUE } from '../data/mockData';
import { ArrowRight, RefreshCw, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommandCenter() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Command Center"
        subtitle="Real-time watershed intelligence overview and priority triage for Andhra Pradesh"
        actions={
          <button className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Satellite Feed</span>
          </button>
        }
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi) => (
          <StatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Main Grid: Map (Left) + Priority Alerts & Submissions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Map Panel (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Regional Geospatial Overview
            </h3>
            <button
              onClick={() => navigate('/map')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <MapPanel markers={MOCK_MAP_MARKERS} height="h-[520px]" />
        </div>

        {/* Right Sidebar Panels */}
        <div className="space-y-6">
          {/* Priority Alerts Panel */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                Priority Alerts ({MOCK_ALERTS.length})
              </h3>
              <button
                onClick={() => navigate('/verification')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
              >
                View Queue
              </button>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {MOCK_ALERTS.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>

          {/* Recent Submissions Stream Panel */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Recent Ground Submissions
              </h3>
              <button
                onClick={() => navigate('/submissions')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
              >
                Inspect
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {MOCK_VERIFICATION_QUEUE.slice(0, 3).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{item.id}</span>
                      <span className="text-[11px] text-slate-500">• {item.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.location} • By {item.submitter}</p>
                  </div>
                  <StatusBadge status={item.priority} text={item.priority} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
