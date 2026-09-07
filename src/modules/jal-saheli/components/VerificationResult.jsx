/**
 * VerificationResult.jsx
 * Final synthesis result card:
 * - Status: VERIFIED
 * - AI: 92%, Satellite: 96%, Final Composite: 95%
 * - Reward: ₹25 (Incentive Credited)
 * - Multilingual summary (English, Marathi, Hindi)
 *
 * Props:
 *   result           - verification result object from flowReducer / jalSaheliApi
 *   observationType  - string or object (default 'Water Body')
 *   reward           - number (default 25)
 *   location         - location object (default Khed, Pune)
 *   language         - 'en' | 'mr' | 'hi'
 *   onLanguageChange - fn(lang)
 *   onReset          - fn() to submit another
 *   onNavigateBack   - fn() to return to dashboard
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Brain,
  Satellite,
  IndianRupee,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

import LocalLanguageResult from './LocalLanguageResult';

export default function VerificationResult({
  result = {},
  observationType = 'Water Body',
  reward = 25,
  location = null,
  language = 'en',
  onLanguageChange,
  onReset,
  onNavigateBack,
}) {
  const [activeLang, setActiveLang] = useState(language);

  const handleLangSelect = (lang) => {
    setActiveLang(lang);
    if (onLanguageChange) onLanguageChange(lang);
  };

  const typeName =
    typeof observationType === 'object' && observationType !== null
      ? observationType.label || 'Water Body'
      : observationType || 'Water Body';

  const locationLabel =
    typeof location === 'object' && location !== null
      ? location.label || 'Field Location'
      : location || 'Field Location';

  const aiConf = result?.aiConfidence ?? 0;
  const satConf = result?.satelliteConfidence ?? 0;
  const finalConf = result?.finalConfidence ?? 0;
  const subId = result?.submissionId || 'GW-REF';



  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Main Verified Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-sm shadow-sm p-6 sm:p-7 relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute left-1/2 top-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  DECISION CONFIRMED
                </span>
                <span className="text-xs text-emerald-200 font-mono">
                  Ref: <strong className="text-white">{subId}</strong>
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                Observation Verified ✓
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-2">
                <span>{typeName}</span> • <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-300" /> {locationLabel}</span>
              </p>
            </div>
          </div>

          {/* Big Composite Score Badge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/20 rounded-md p-3 px-4 self-start md:self-auto">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block tracking-wider">
                Final Consensus
              </span>
              <span className="text-3xl font-black text-white leading-none">
                {finalConf}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-300/40">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-Score Confidence Matrix ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. AI Vision Score */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              AI Vision Analysis
            </span>
            <span className="text-xl font-extrabold text-violet-700 mt-1 block">
              {aiConf}% Confidence
            </span>
            <span className="text-[10px] text-slate-500 font-medium">GeoBrain-v3 Model</span>
          </div>
          <div className="w-10 h-10 rounded bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Satellite Score */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Satellite Audit
            </span>
            <span className="text-xl font-extrabold text-sky-600 mt-1 block">
              {satConf}% Confidence
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Sentinel-2 Multispectral</span>
          </div>
          <div className="w-10 h-10 rounded bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Satellite className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Final Composite Score */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Final Consensus
            </span>
            <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
              {finalConf}% Verified
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Exceeds 85% Bar</span>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Earnings Confirmation Card ──────────────────────────────────── */}
      <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-sm p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded">
                Direct Incentive Credited
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Instant Cadre Payout</span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-900 mt-0.5">
              ₹{reward}
            </p>
            <p className="text-xs text-emerald-700">
              Disbursed via Direct Benefit Transfer (DBT) to Jan Dhan / UPI Cadre Ledger.
            </p>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded px-3 py-2 text-right text-xs shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payout Reference</span>
          <span className="font-mono text-emerald-800 font-bold">TXN-JS-{subId.replace('GW-', '')}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Status: Settled ✓</span>
        </div>
      </div>

      {/* ── Multilingual Switchable Verdict (LocalLanguageResult) ─────── */}
      <LocalLanguageResult
        language={activeLang}
        onLanguageChange={handleLangSelect}
        aiConfidence={aiConf}
        satelliteConfidence={satConf}
        reward={reward}
        _observationType={typeName}
      />

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {onReset && (
          <button
            type="button"
            id="verification-submit-another-btn"
            onClick={onReset}
            className="w-full sm:flex-1 py-3 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Submit Another Observation
          </button>
        )}

        {onNavigateBack && (
          <button
            type="button"
            id="verification-return-dashboard-btn"
            onClick={onNavigateBack}
            className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
