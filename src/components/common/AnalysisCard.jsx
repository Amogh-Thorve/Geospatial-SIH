import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function AnalysisCard({ title, subtitle, reasons, metrics, confidenceLabel }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {title || "Explainable AI (XAI) Verification"}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <StatusBadge status="info" text={confidenceLabel || 'Demo XAI'} />
      </div>

      {reasons && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Why this was classified</p>
          {reasons.map((reason) => (
            <div key={reason.id} className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {reason.title}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {reason.weight}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed pl-5">{reason.description}</p>
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium">{m.label}</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
