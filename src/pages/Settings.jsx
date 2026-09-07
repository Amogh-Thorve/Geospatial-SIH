import React, { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import ConnectionBanner from '../components/common/ConnectionBanner';
import { Check, Globe, Shield, Bell, Info, AlertTriangle } from 'lucide-react';
import { useApiStatus } from '../context/ApiStatusContext';

const STORAGE_KEY = 'geowise.localPrefs';

const DEFAULTS = {
  userRole: 'District Officer',
  region: 'Andhra Pradesh · Pilot Region',
  language: 'English (US)',
  alertThreshold: 'High & Critical',
  demoLabels: true,
};

function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export default function Settings() {
  const { status, health } = useApiStatus();
  const [settings, setSettings] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadPrefs());
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
        subtitle="Local browser preferences only. Nothing on this page is persisted on the server."
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
        <p>Geo AI / satellite / Telegram integrations are demo adapters unless credentials are set in backend env.</p>
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
            <Globe className="w-4 h-4 text-emerald-600" /> Demo configuration
          </h2>
          <label className="block text-xs font-semibold text-slate-700">
            Language (UI label only)
            <select className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded" value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
              <option>English (US)</option>
              <option>Telugu (తెలుగు)</option>
              <option>Hindi (हिंदी)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={settings.demoLabels} onChange={(e) => setSettings({ ...settings, demoLabels: e.target.checked })} />
            Keep demo/mock labels visible in the shell
          </label>
          <p className="text-[11px] text-slate-500 flex gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Future production settings (SSO, live Sentinel credentials, Telegram webhook) belong in backend environment variables, not this form.
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
