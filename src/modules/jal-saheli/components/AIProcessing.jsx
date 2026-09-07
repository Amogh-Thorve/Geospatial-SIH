/**
 * AIProcessing.jsx
 * Visual card for Geo AI analysis step in the submission flow.
 *
 * Props:
 *   status           - string from SUBMISSION_STATES
 *   aiConfidence     - number | null (from backend analysis)
 *   provider         - analysis provider string (optional)
 *   classification   - LULC / classification label (optional)
 *   observationType  - string or object (field observation type)
 *   photo            - photo object with previewUrl (optional)
 */

import React from 'react';
import {
  Brain,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import { SUBMISSION_STATES } from '../utils/submissionFlow';
import { formatConfidenceLabel } from '../utils/analysisDisplay';

export default function AIProcessing({
  status,
  aiConfidence = null,
  provider = null,
  classification = null,
  observationType = 'Water Body',
  _photo = null,
}) {
  const isProcessing =
    status === SUBMISSION_STATES.SUBMITTED ||
    status === SUBMISSION_STATES.PHOTO_RECEIVED ||
    status === SUBMISSION_STATES.AI_PROCESSING;

  const isComplete =
    status === SUBMISSION_STATES.AI_COMPLETE ||
    status === SUBMISSION_STATES.SATELLITE_PROCESSING ||
    status === SUBMISSION_STATES.SATELLITE_COMPLETE ||
    status === SUBMISSION_STATES.FINAL_VERIFICATION ||
    status === SUBMISSION_STATES.VERIFIED ||
    status === SUBMISSION_STATES.EARNINGS_ADDED;

  const typeName =
    typeof observationType === 'object' && observationType !== null
      ? observationType.label || 'Observation'
      : observationType || 'Observation';

  const lulcLabel = classification || typeName;
  const providerLabel = provider || 'Unified backend Geo AI';
  const completeBadge =
    aiConfidence != null ? `Analyzed (${aiConfidence}%)` : 'Analysis complete';

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden transition-all duration-300">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Geo AI Analysis
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {providerLabel}
            </p>
          </div>
        </div>

        <div>
          {isProcessing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
              Running analysis…
            </span>
          ) : isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {completeBadge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isProcessing && (
          <div className="space-y-4">
            <div className="relative rounded-md bg-slate-900 text-white p-4 overflow-hidden border border-slate-800">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse top-1/2" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-violet-300 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    Geo AI pipeline
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Inference running…</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
                    <span>Submitting coordinates to unified backend analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
                    <span>Running RF lookup against local satellite grid</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 w-3/4 animate-pulse rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center italic">
              Classifying {typeName} at submitted coordinates…
            </p>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-violet-50/60 border border-violet-100 rounded-sm text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                  Model confidence
                </span>
                <span className="text-lg font-extrabold text-violet-900 mt-0.5 text-center leading-tight">
                  {formatConfidenceLabel(aiConfidence)}
                </span>
              </div>

              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    LULC classification
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {lulcLabel || 'Unavailable'}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  Provider: {providerLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>Source: unified backend</span>
              <span>Photo + coordinate analysis</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
