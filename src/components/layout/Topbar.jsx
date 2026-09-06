import React from 'react';
import { MapPin, User, Bell, Search, ShieldCheck } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Left Region Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Andhra Pradesh • Pilot Region</span>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Command System Online</span>
        </div>
      </div>

      {/* Right User & Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative hidden lg:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search site ID, village, coordinates..."
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
          />
        </div>

        <button
          type="button"
          aria-label="Alerts"
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* User Pill */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-800">Officer M. Rao</p>
            <p className="text-[11px] font-medium text-slate-500">District Officer</p>
          </div>
          <div className="w-9 h-9 bg-slate-800 text-white rounded flex items-center justify-center font-bold text-xs shadow-xs border border-slate-700">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
