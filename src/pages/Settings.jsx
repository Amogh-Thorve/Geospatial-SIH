import React, { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { Check, Globe, Shield, Bell, Info, AlertTriangle, Satellite } from 'lucide-react';
import { useApiStatus } from '../context/ApiStatusContext';
import { getGeoAiHealth } from '../services/geoAiService';

const STORAGE_KEY = 'geowise.localPrefs';

const DEFAULTS = {
  userRole: 'District Officer',
  region: 'Andhra Pradesh · Pilot Region',
  language: 'English (US)',
  alertThreshold: 'High & Critical',
};

function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

function bhuvanWmsLabel(bhuvan) {
  if (!bhuvan) return 'Unknown';
  if (bhuvan.reachable) return 'Connected';
  if (bhuvan.enabled) return 'Enabled — unreachable';
  return 'Disabled';
}

function bhuvanLulcLabel(lulc) {
  if (!lulc) return 'Unknown';
  if (lulc.configured) return 'Configured (token set)';
  if (lulc.enabled) return 'Enabled — token missing';
  return 'Disabled';
}

export default function Settings() {
  const { status, health } = useApiStatus();
  const [settings, setSettings] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [geoHealth, setGeoHealth] = useState(null);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    setSettings(loadPrefs());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await getGeoAiHealth();
        if (!cancelled) {
          setGeoHealth(payload);
          setGeoError(null);
        }
      } catch (err) {
        if (!cancelled) setGeoError(err.message || 'Could not load Geo AI health');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Local browser preferences and live Geo AI / Bhuvan status."
      />
      <ConnectionBanner />

      {saved && (
        <div role="status" className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Saved in this browser (localStorage).</span>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-sm p-6 space-y-2 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" /> Runtime
        </h2>
        <p>API connection: <strong>{status}</strong></p>
        <p>Backend environment: <strong>{health?.environment || 'n/a'}</strong></p>
        <p>Geo AI model: <strong>{geoHealth?.model_loaded ? 'Loaded' : 'Unavailable'}</strong></p>
        <p>Local satellite grid: <strong>{geoHealth?.lookup_loaded ? 'Loaded' : 'Unavailable'}</strong></p>
      </section>

      <section className="bg-white border border-slate-200 rounded-sm p-6 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Satellite className="w-4 h-4 text-sky-600" /> Bhuvan integration
        </h2>
        {geoError && <p className="text-rose-700">{geoError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-slate-200 rounded-sm p-3 bg-slate-50">
            <span className="text-slate-500 block">Bhuvan WMS imagery</span>
            <strong className="text-slate-900">{bhuvanWmsLabel(geoHealth?.bhuvan)}</strong>
            <p className="mt-1 text-[11px] text-slate-500">
              Optional map imagery. Set <code>BHUVAN_ENABLED=true</code> in backend <code>.env</code>.
            </p>
          </div>
          <div className="border border-slate-200 rounded-sm p-3 bg-slate-50">
            <span className="text-slate-500 block">Bhuvan LULC Statistics</span>
            <strong className="text-slate-900">{bhuvanLulcLabel(geoHealth?.bhuvan_lulc)}</strong>
            <p className="mt-1 text-[11px] text-slate-500">
              Point LULC API. Set <code>BHUVAN_LULC_ENABLED=true</code> and <code>BHUVAN_ACCESS_TOKEN</code>.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Bhuvan is used during analysis when enabled. NDVI/NDWI still come from the local satellite grid unless Bhuvan returns those values.
        </p>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Local identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="block font-semibold text-slate-700">
              Displayed role
              <input className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded" value={settings.userRole} onChange={(e) => setSettings({ ...settings, userRole: e.target.value })} />
            </label>
            <label className="block font-semibold text-slate-700">
              Region label
              <input className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded" value={settings.region} onChange={(e) => setSettings({ ...settings, region: e.target.value })} />
            </label>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" /> Display preferences
          </h2>
          <label className="block text-xs font-semibold text-slate-700">
            Language (UI label only)
            <select className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded" value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
              <option>English (US)</option>
              <option>Telugu (తెలుగు)</option>
              <option>Hindi (हिंदी)</option>
            </select>
          </label>
          <p className="text-[11px] text-slate-500 flex gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Production credentials (Bhuvan token, Telegram webhook) belong in backend environment variables.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" /> Local alert preference
          </h2>
          <select className="w-full md:w-1/2 p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={settings.alertThreshold} onChange={(e) => setSettings({ ...settings, alertThreshold: e.target.value })}>
            <option>Critical Only</option>
            <option>High & Critical</option>
            <option>All Priorities</option>
          </select>
        </section>

        <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold">
          Save local preferences
        </button>
      </form>
    </div>
  );
}
