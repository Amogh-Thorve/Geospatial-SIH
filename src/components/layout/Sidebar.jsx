import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  FileCheck2,
  ShieldCheck,
  BarChart3,
  Users,
  Settings,
  Waves,
  X
} from 'lucide-react';

const navigationItems = [
  { name: 'Command Center', path: '/', icon: LayoutDashboard, end: true },
  { name: 'Analytics / Geo AI', path: '/analytics', icon: BarChart3 },
  { name: 'GIS Map', path: '/gis-map', icon: Map },
  { name: 'Jal Saheli', path: '/jal-saheli', icon: Users },
  { name: 'Submission Analysis', path: '/submission-analysis', icon: FileCheck2 },
  { name: 'Verification', path: '/verification', icon: ShieldCheck },
  { name: 'Settings', path: '/settings', icon: Settings },
];

/**
 * Sidebar
 * Props:
 *   isOpen  — boolean — controls mobile drawer visibility
 *   onClose — function — called when the user closes the mobile drawer
 */
export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside
      className={[
        // Base layout
        'w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800 shrink-0',
        // Desktop: always visible
        'lg:relative lg:translate-x-0 lg:z-auto',
        // Mobile: fixed drawer, z-40 to sit above the overlay (z-30)
        'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
      aria-label="Primary navigation"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-emerald-600 rounded flex items-center justify-center text-white shrink-0 shadow-sm">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">GeoWise</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-1">
              Geospatial Water Intelligence
            </p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation section label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Navigation
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto" aria-label="Sidebar navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border-l-4 border-emerald-500 pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
                ].join(' ')
              }
              aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer — system status */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
          <span className="font-medium text-slate-300">GeoBrain Model v2.4</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Sentinel-2 Sync: Active</p>
      </div>
    </aside>
  );
}
