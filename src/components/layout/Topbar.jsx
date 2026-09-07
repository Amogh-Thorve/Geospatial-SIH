import React from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, User, Bell, Search, ShieldCheck, Menu } from 'lucide-react';
import { useApiStatus } from '../../context/ApiStatusContext';

/** Maps route pathnames to human-readable page titles shown in the topbar. */
const PAGE_TITLES = {
  '/': 'Command Center',
  '/analytics': 'Analytics & Geo AI',
  '/gis-map': 'GIS Map',
  '/jal-saheli': 'Jal Saheli',
  '/submission-analysis': 'Submission Analysis',
  '/verification': 'Verification Queue',
  '/settings': 'Settings',
};

/**
 * Topbar
 * Props:
 *   onMenuToggle — function — opens the mobile sidebar drawer
 */
export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const { status } = useApiStatus();
  const pageTitle = PAGE_TITLES[pathname] ?? 'GeoWise';

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Left: hamburger (mobile) + region context */}
      <div className="flex items-center space-x-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title — visible on desktop alongside region pill */}
        <span className="hidden sm:inline text-xs font-bold text-slate-900 tracking-tight">
          {pageTitle}
        </span>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          <span>Andhra Pradesh · Pilot Region</span>
        </div>

        <div className="hidden xl:flex items-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          <span>{status === 'live' ? 'API connected' : status === 'offline' ? 'Offline' : 'API status: ' + status}</span>
        </div>
      </div>

      {/* Right: search + bell + user */}
      <div className="flex items-center space-x-3">
        {/* Search bar — desktop only */}
        <div className="relative hidden lg:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search site ID, village, coordinates…"
            aria-label="Search"
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-60"
          />
        </div>

        {/* Notification bell */}
        <button
          type="button"
          aria-label="View alerts and notifications"
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded relative transition-colors"
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
          <span
            className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"
            aria-label="Unread notifications"
          />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

        {/* User pill */}
        <div className="flex items-center space-x-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Officer M. Rao</p>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">District Officer</p>
          </div>
          <div
            className="w-8 h-8 bg-slate-800 text-white rounded flex items-center justify-center shadow-xs border border-slate-700"
            aria-hidden="true"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
