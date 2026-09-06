import React from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { MOCK_ANALYTICS_DATA } from '../data/mockData';
import {
  TrendingUp,
  Droplets,
  Sparkles,
  Award,
  CheckCircle2,
  PieChart,
  BarChart,
  BrainCircuit,
  MapPin
} from 'lucide-react';

export default function Analytics() {
  const { summaryCards, recommendation } = MOCK_ANALYTICS_DATA;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Analytics & AI Recommendations"
        subtitle="Hydrological yield optimization, watershed impact modeling, and automated site targeting"
      />

      {/* Watershed Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.label}</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{card.value}</div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {card.note}
            </p>
          </div>
        ))}
      </div>

      {/* Main Grid: AI Recommendation Card (Left) + Lightweight SVG Visualizations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendation & XAI Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Recommendation Engine Card */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                  Self-Learning GeoBrain Engine
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{recommendation.title}</h3>
                <p className="text-xs text-slate-500">{recommendation.location}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-emerald-600">{recommendation.suitability}</span>
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Suitability Score</span>
              </div>
            </div>

            {/* Target Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Recommended Intervention</span>
                <span className="font-bold text-slate-900 text-sm">{recommendation.recommendedIntervention}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Estimated Cost</span>
                <span className="font-bold text-slate-900 text-sm">{recommendation.estimatedCost}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Annual Water Yield</span>
                <span className="font-bold text-emerald-700 text-sm">{recommendation.waterYieldEst}</span>
              </div>
            </div>

            {/* Reasons List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Key Suitability Drivers</h4>
              <div className="space-y-2">
                {recommendation.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* XAI Insight Box */}
            <div className="p-4 bg-slate-900 text-slate-100 rounded-sm space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <BrainCircuit className="w-4 h-4" />
                <span>Explainable AI (XAI) Hydro-Modeling Rationale</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {recommendation.xaiInsight}
              </p>
            </div>
          </div>
        </div>

        {/* Lightweight SVG Charts Sidebar */}
        <div className="space-y-6">
          {/* Surface Runoff Retention Bar Visual */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Runoff Retention Distribution</span>
              <BarChart className="w-4 h-4 text-slate-400" />
            </h4>
            
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Farm Ponds</span>
                  <span className="text-slate-900">42% (1.44 MCM)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Check Dams</span>
                  <span className="text-slate-900">35% (1.20 MCM)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-sky-600 h-full rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Percolation Tanks</span>
                  <span className="text-slate-900">15% (0.51 MCM)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Contour Trenches</span>
                  <span className="text-slate-900">8% (0.27 MCM)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-600 h-full rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Accuracy Trend SVG Widget */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Sentinel-2 Cross-Match Accuracy</span>
              <PieChart className="w-4 h-4 text-slate-400" />
            </h4>
            <div className="pt-2">
              <svg className="w-full h-24 text-emerald-600" viewBox="0 0 100 40">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  points="0,32 20,28 40,22 60,18 80,12 100,8"
                />
                <circle cx="100" cy="8" r="3" fill="#059669" />
              </svg>
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
                <span>Month 1 (84.1%)</span>
                <span>Month 3 (89.2%)</span>
                <span>Month 6 (93.4%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
