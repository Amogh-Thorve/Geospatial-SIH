/**
 * LocalLanguageResult.jsx
 * Multi-language verification outcome component.
 *
 * Requirements:
 * Support: English, मराठी (Marathi), हिंदी (Hindi).
 * The final verified result is switchable between languages.
 *
 * Exact text specifications:
 *
 * English:
 *   Observation Verified
 *   Water body detected.
 *   AI Confidence: 92%
 *   Satellite Confidence: 96%
 *   You earned ₹25.
 *
 * Marathi:
 *   ✓ निरीक्षण सत्यापित झाले
 *   पाण्याचे क्षेत्र आढळले आहे.
 *   AI विश्वास: 92%
 *   उपग्रह पडताळणी: 96%
 *   तुमच्या निरीक्षणासाठी ₹25 कमाई मिळाली आहे.
 *
 * Hindi:
 *   ✓ अवलोकन सत्यापित हुआ
 *   जल क्षेत्र की पुष्टि हुई है।
 *   AI विश्वास: 92%
 *   उपग्रह सत्यापन: 96%
 *   आपने ₹25 कमाए हैं।
 *
 * UX Polish:
 * - Responsive mobile-first layout
 * - Confidence indicator bars
 * - Audio speech narration cue
 * - Direct Benefit Transfer (DBT) credit stamp
 * - Accessible tablist / tabs controls
 */

import React, { useState } from 'react';
import {
  Globe,
  Volume2,
  VolumeX,
  ShieldCheck,
  Brain,
  Satellite,
  IndianRupee,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { LOCALIZED_CONTENT } from '../utils/localLanguageContent';

export default function LocalLanguageResult({
  language = 'en',
  onLanguageChange,
  aiConfidence = 92,
  satelliteConfidence = 96,
  reward = 25,
  _observationType = 'Water Body',
}) {
  const [internalLang, setInternalLang] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Derived active language without set-state-in-effect
  const activeLang = internalLang ?? language ?? 'en';
  const current = LOCALIZED_CONTENT[activeLang] || LOCALIZED_CONTENT.en;

  const handleSelectLang = (langId) => {
    setInternalLang(langId);
    if (isPlayingAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    }
    if (onLanguageChange) {
      onLanguageChange(langId);
    }
  };

  // Audio Speech synthesis with graceful fallback
  const handleToggleVoice = () => {
    if (isPlayingAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        current.voiceText(aiConfidence, satelliteConfidence, reward)
      );
      utterance.lang = activeLang === 'mr' ? 'mr-IN' : activeLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback timer simulation
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 3500);
    }
  };

  return (
    <div className="bg-white border-2 border-emerald-500/30 rounded-sm shadow-xs overflow-hidden transition-all duration-200">
      {/* ── Top Bar: Language Selector & Status Stamp ──────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Language / भाषा / भाषा
            </span>
            <span className="text-xs font-bold text-slate-800">
              Verified Result Translation
            </span>
          </div>
        </div>

        {/* Interactive 3-Language Switcher */}
        <div
          role="tablist"
          aria-label="Select language for verification outcome"
          className="flex items-center bg-white p-1 rounded border border-slate-200 shadow-2xs gap-1 self-start sm:self-auto"
        >
          {[
            { id: 'en', label: 'English' },
            { id: 'mr', label: 'मराठी' },
            { id: 'hi', label: 'हिंदी' },
          ].map((item) => {
            const isSelected = activeLang === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`lang-tab-${item.id}`}
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectLang(item.id)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Box ─────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Title & Detection Line */}
        <div className="space-y-1.5 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {current.title}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {current.verifiedStamp}
            </span>
          </div>

          <p className="text-base sm:text-lg font-semibold text-emerald-800 pl-10">
            {current.detection}
          </p>
          <p className="text-xs text-slate-500 pl-10 font-normal">
            {current.subText}
          </p>
        </div>

        {/* Dual Confidence Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* AI Confidence Card */}
          <div className="p-4 rounded border border-violet-100 bg-violet-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="text-xs font-bold text-violet-900">
                  {current.aiLabel(aiConfidence)}
                </span>
              </div>
              <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
                GeoBrain-v3
              </span>
            </div>
            {/* Visual Bar */}
            <div className="w-full bg-violet-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${aiConfidence}%` }}
              />
            </div>
            <p className="text-[11px] text-violet-700 font-medium">
              Surface spectral reflectance conforms to standing water profile.
            </p>
          </div>

          {/* Satellite Confidence Card */}
          <div className="p-4 rounded border border-sky-100 bg-sky-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Satellite className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs font-bold text-sky-900">
                  {current.satelliteLabel(satelliteConfidence)}
                </span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                Sentinel-2 L2A
              </span>
            </div>
            {/* Visual Bar */}
            <div className="w-full bg-sky-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${satelliteConfidence}%` }}
              />
            </div>
            <p className="text-[11px] text-sky-700 font-medium">
              NDWI water index confirmation: +0.38 index verified at coordinates.
            </p>
          </div>
        </div>

        {/* Reward Card */}
        <div className="p-4 rounded bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                {current.rewardText(reward)}
              </p>
              <span className="text-[11px] text-emerald-100 font-medium flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-200" />
                {current.dbtBadge}
              </span>
            </div>
          </div>

          {/* Voice Narration Button for Cadre Accessibility */}
          <button
            type="button"
            id="voice-narration-toggle-btn"
            onClick={handleToggleVoice}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded text-xs font-bold transition-all shadow-xs shrink-0 ${
              isPlayingAudio
                ? 'bg-amber-400 text-slate-900 animate-pulse'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95'
            }`}
            aria-label="Listen to voice narration"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-900" />
                <span>{current.speakingText}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-700" />
                <span>{current.listenPrompt}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
