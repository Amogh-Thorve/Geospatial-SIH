import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { MOCK_SETTINGS } from '../data/mockData';
import { Save, Check, Globe, Shield, Bell, Info, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(MOCK_SETTINGS);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage user roles, target pilot region, notification thresholds, and data sync intervals"
      />

      {/* Save confirmation banner */}
      {saved && (
        <div
          role="alert"
          className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center space-x-2"
        >
          <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>System configuration preferences updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6" aria-label="Settings form">
        {/* Identity & Regional Scope */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" aria-hidden="true" />
            Identity & Regional Scope
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="userRole" className="block font-semibold text-slate-700 mb-1">
                Active User Role
              </label>
              <input
                id="userRole"
                type="text"
                value={settings.userRole}
                onChange={(e) => setSettings({ ...settings, userRole: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="region" className="block font-semibold text-slate-700 mb-1">
                Target Watershed Region
              </label>
              <input
                id="region"
                type="text"
                value={settings.region}
                onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Localization & Satellite Intervals */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Localization & Satellite Intervals
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="language" className="block font-semibold text-slate-700 mb-1">
                Interface Language
              </label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="English (US)">English (US)</option>
                <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
              </select>
            </div>

            <div>
              <label htmlFor="satellitePassInterval" className="block font-semibold text-slate-700 mb-1">
                Satellite Orbit Feed Pass
              </label>
              <select
                id="satellitePassInterval"
                value={settings.satellitePassInterval}
                onChange={(e) => setSettings({ ...settings, satellitePassInterval: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Sentinel-2 (5 Days)">Sentinel-2 (5 Days Frequency)</option>
                <option value="Landsat-9 (8 Days)">Landsat-9 (8 Days Frequency)</option>
                <option value="Daily High Resolution Commercial">Daily PlanetScope API (Mock)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Alert Threshold */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            Alert Threshold
          </h2>

          <div className="text-xs">
            <label htmlFor="alertThreshold" className="block font-semibold text-slate-700 mb-1">
              Minimum Priority Level for Alerts
            </label>
            <select
              id="alertThreshold"
              value={settings.alertThreshold}
              onChange={(e) => setSettings({ ...settings, alertThreshold: e.target.value })}
              className="w-full md:w-1/2 p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Critical Only">Critical Only</option>
              <option value="High & Critical">High &amp; Critical</option>
              <option value="High & Medium Priority">High &amp; Medium Priority</option>
              <option value="All Priorities">All Priorities</option>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Alerts below this threshold will be suppressed from the Command Center notification feed.
            </p>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" aria-hidden="true" />
            Notification Channels
          </h2>

          <fieldset className="space-y-3 text-xs">
            <legend className="sr-only">Notification preferences</legend>

            <label className="flex items-start space-x-3 text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold">Email Digest</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Receive daily email summaries for high priority flags and verification status.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.telegramAlerts}
                onChange={(e) => setSettings({ ...settings, telegramAlerts: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold">Telegram Bot Alerts</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Receive instant Telegram bot alerts for Jal Saheli field submissions and AI flags.
                </p>
              </div>
            </label>
          </fieldset>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 text-white rounded text-xs font-bold flex items-center space-x-2 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* System Information — read-only, outside the form */}
      <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" aria-hidden="true" />
          System Information
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Application',      value: 'GeoWise Platform' },
            { label: 'Version',          value: 'v1.0.0-SIH-2026' },
            { label: 'Environment',      value: 'Demo / Pilot (No real backend)' },
            { label: 'AI Model',         value: 'GeoBrain v2.4 (Inference mock)' },
            { label: 'Satellite Source', value: 'Sentinel-2 L2A (Static tiles)' },
            { label: 'Build',            value: 'React 19 + Vite 8 + Tailwind CSS v4' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
