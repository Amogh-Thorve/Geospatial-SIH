import React from 'react';
import { MapPin, AlertTriangle, CheckCircle2, Satellite, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

const iconMap = {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Satellite
};

export default function StatCard({ label, value, change, trend, status, icon }) {
  const IconComponent = iconMap[icon] || MapPin;
  const changeText = change || (typeof trend === 'string' && !['up', 'down'].includes(trend) ? trend : null);

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-sm shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-700">
          <IconComponent className="w-4 h-4 text-slate-700" />
        </div>
      </div>
      
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {status && <StatusBadge status={status} text={status === 'warning' ? 'Alert' : 'Active'} />}
      </div>

      {changeText && (
        <div className="mt-2 flex items-center text-xs font-medium text-slate-500">
          {trend === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 mr-1" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 mr-1" />
          ) : null}
          <span>{changeText}</span>
        </div>
      )}
    </div>
  );
}
