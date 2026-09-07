import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useApiStatus } from '../../context/ApiStatusContext';

export default function ConnectionBanner() {
  const { status, error, refresh, health } = useApiStatus();

  if (status === 'live') {
    return (
      <div className="mb-4 flex items-center justify-between rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
        <span>
          Connected to GeoWise API.
        </span>
        <span className="font-semibold uppercase tracking-wide">{health?.environment}</span>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="mb-4 rounded-sm border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        Checking backend connection…
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        {status === 'offline' ? <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <div>
          <p className="font-bold uppercase tracking-wide">
            {status === 'offline' ? 'Offline — API unreachable' : 'API degraded'}
          </p>
          <p className="mt-0.5">
            {error || 'Backend is reachable but a required component is unhealthy. Writes may fail.'}
            {' '}Pages that cannot load live data will show an error instead of a fake success.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={refresh}
        className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-1 font-semibold hover:bg-amber-100"
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );
}
