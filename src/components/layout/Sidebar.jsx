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
  Waves
} from 'lucide-react';

const navigationItems = [
  { name: 'Command Center', path: '/', icon: LayoutDashboard },
  { name: 'GIS Map', path: '/map', icon: Map },
  { name: 'Submissions', path: '/submissions', icon: FileCheck2 },
  { name: 'Verification', path: '/verification', icon: ShieldCheck },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Jal Saheli', path: '/jal-saheli', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-emerald-600 rounded flex items-center justify-center text-white shrink-0 shadow-sm">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">GeoWise</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-1">
              Self-Learning Watershed Brain
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border-l-4 border-emerald-500 pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-300">GeoBrain Model v2.4</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Sentinel-2 Sync: Active</p>
      </div>
    </aside>
  );
}
