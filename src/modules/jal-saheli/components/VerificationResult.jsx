/**
 * VerificationResult.jsx
 * Final synthesis result card driven by persisted backend analysis.
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
import { formatSatelliteSourceLabel } from '../utils/analysisDisplay';

export default function VerificationResult({
  result = null,
  observationType = 'Water Body',
  reward = null,
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
      ? observationType.label || 'Observation'
      : observationType || 'Observation';

  const locationLabel =
    typeof location === 'object' && location !== null
      ? location.label || 'Field location'
      : location || 'Field location';

  const aiConf = result?.aiConfidence;
  const satConf = result?.satelliteConfidence;
  const finalConf = result?.finalConfidence;
  const subId = result?.submissionId || '—';
  const provider = result?.provider || 'Unified backend Geo AI';
  const satelliteSource = formatSatelliteSourceLabel(result) || 'Local satellite grid';
  const hasReward = reward != null && reward > 0;
  const lulc = result?.lulc || result?.classification;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-sm shadow-sm p-6 sm:p-7 relative overflow-hidden">
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
                  Analysis stored
                </span>
                <span className="text-xs text-emerald-200 font-mono">
                  Ref: <strong className="text-white">{subId}</strong>
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                Observation analyzed
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{typeName}</span>
                {lulc ? <span>· LULC: {lulc}</span> : null}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-300" /> {locationLabel}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/20 rounded-md p-3 px-4 self-start md:self-auto">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block tracking-wider">
                Model confidence
              </span>
              <span className="text-3xl font-black text-white leading-none">
                {finalConf == null ? 'unavailable' : `${finalConf}%`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-300/40">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Geo AI
            </span>
            <span className="text-xl font-extrabold text-violet-700 mt-1 block">
              {aiConf == null ? 'Confidence unavailable' : `${aiConf}%`}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{provider}</span>
          </div>
          <div className="w-10 h-10 rounded bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Satellite lookup
            </span>
            <span className="text-xl font-extrabold text-sky-600 mt-1 block">
              {satConf == null ? 'Confidence unavailable' : `${satConf}%`}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Source: {satelliteSource}</span>
          </div>
          <div className="w-10 h-10 rounded bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Satellite className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Verification
            </span>
            <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
              {result?.status || 'Stored'}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {result?.satelliteMatch ? `Match: ${result.satelliteMatch}` : 'Awaiting officer review if flagged'}
            </span>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {hasReward ? (
        <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-sm p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded">
                  Incentive credited
                </span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-900 mt-0.5">₹{reward}</p>
              <p className="text-xs text-emerald-700">Recorded by backend payout ledger.</p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded px-3 py-2 text-right text-xs shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Payout reference
            </span>
            <span className="font-mono text-emerald-800 font-bold">
              TXN-JS-{subId.replace('GW-', '')}
            </span>
          </div>
        </div>
      ) : null}

      <LocalLanguageResult
        language={activeLang}
        onLanguageChange={handleLangSelect}
        aiConfidence={aiConf}
        satelliteConfidence={satConf}
        reward={hasReward ? reward : null}
        provider={provider}
        ndvi={result?.ndvi}
        ndwi={result?.ndwi}
        satelliteSource={satelliteSource}
        _observationType={typeName}
      />

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {onReset && (
          <button
            type="button"
            id="verification-submit-another-btn"
            onClick={onReset}
            className="w-full sm:flex-1 py-3 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Submit another observation
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
            Return to dashboard
          </button>
        )}
      </div>
    </div>
  );
}
