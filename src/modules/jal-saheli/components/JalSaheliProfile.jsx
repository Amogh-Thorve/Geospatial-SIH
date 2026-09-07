/**
 * JalSaheliProfile.jsx
 * Identity card for the Jal Saheli field worker:
 * avatar initials, name, cadre role, village, phone, member duration, and performance rank.
 *
 * Props:
 *   profile  — MOCK_PROFILE shape from data/mockProfile.js (required)
 *   compact  — boolean, renders a slimmer single-row variant (optional)
 */

import React from 'react';
import { MapPin, Phone, Award, Calendar, TrendingUp } from 'lucide-react';
import StatusBadge from '../../../components/common/StatusBadge';

export default function JalSaheliProfile({ profile, compact = false }) {
  if (!profile) return null;

  const {
    name = 'Jal Saheli',
    initials = 'JS',
    role = 'Field Cadre • Water Champion',
    village = 'Watershed Cluster',
    phone = '+91 ••••• •••••',
    memberSince = '2026',
    badge = 'Active Verifier',
    stats = {},
  } = profile;

  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const streakDays = stats?.streakDays ?? 0;
  const rank = stats?.rank ?? null;
  const rankOf = stats?.rankOf ?? null;

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs border border-emerald-800">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
          <StatusBadge status="verified" text={badge} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
      {/* Identity row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs border border-emerald-800 select-none">
            {initials}
          </div>

          {/* Name + badge + meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{name}</h2>
              <StatusBadge status="verified" text={badge} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{role}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                {village}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                {phone}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                Cadre since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Rank pill */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded px-3 py-2 shrink-0 self-start">
          <Award className={`w-4 h-4 shrink-0 ${rank ? 'text-amber-600' : 'text-slate-400'}`} />
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Region Rank</p>
            <p className="text-sm font-bold text-slate-800">
              {rank ? (
                <>
                  #{rank} {rankOf ? <span className="text-[11px] font-medium text-slate-500">of {rankOf}</span> : null}
                </>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Unranked (New Cadre)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Streak bar */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center space-x-2">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-xs text-slate-600 font-medium">
          Active streak:
          <span className="text-emerald-700 font-bold ml-1">{streakDays} days</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-xs text-slate-500">{totalSubmissions} recorded submissions</span>
      </div>
    </div>
  );
}
