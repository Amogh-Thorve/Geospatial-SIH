import React from 'react';
import { AlertCircle, Clock, MapPin, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function AlertCard({ alert }) {
  const navigate = useNavigate();

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className={`w-4 h-4 shrink-0 ${alert.priority === 'high' ? 'text-rose-600' : 'text-amber-600'}`} />
          <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
        </div>
        <StatusBadge status={alert.priority} text={alert.priority.toUpperCase()} />
      </div>

      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{alert.description}</p>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <MapPin className="w-3 h-3 text-slate-400 mr-1" />
            {alert.location}
          </span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 text-slate-400 mr-1" />
            {alert.time}
          </span>
        </div>
        <button
          onClick={() => navigate('/submission-analysis')}
          className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-semibold"
        >
          <span>Inspect {alert.submissionId}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
