import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { MOCK_SETTINGS } from '../data/mockData';
import { Save, Check, Globe, Shield, Bell, Map } from 'lucide-react';

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

      {saved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>System configuration preferences updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-6">
        {/* User Role & Region */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Identity & Regional Scope
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active User Role</label>
              <input
                type="text"
                value={settings.userRole}
                onChange={(e) => setSettings({ ...settings, userRole: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Watershed Region</label>
              <input
                type="text"
                value={settings.region}
                onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* System & Language */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Localization & Satellite Intervals
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interface Language</label>
              <select
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
              <label className="block font-semibold text-slate-700 mb-1">Satellite Orbit Feed Pass</label>
              <select
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
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            Notification Channels
          </h3>

          <div className="space-y-2 text-xs">
            <label className="flex items-center space-x-2 text-slate-800">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">Receive daily email summaries for high priority flags</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-800">
              <input
                type="checkbox"
                checked={settings.telegramAlerts}
                onChange={(e) => setSettings({ ...settings, telegramAlerts: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">Receive instant Telegram bot alerts for Jal Saheli field submissions</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold flex items-center space-x-2 hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
