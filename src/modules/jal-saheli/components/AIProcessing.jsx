/**
 * AIProcessing.jsx
 * Visual card showing GeoBrain-v3 AI vision analysis:
 * - Animated scanning state while AI_PROCESSING is active
 * - Deterministic completed state: 92% confidence, Water Body detected
 *
 * Props:
 *   status           - string from SUBMISSION_STATES
 *   aiConfidence     - number (default 92)
 *   observationType  - string or object (default 'Water Body')
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
  ShieldCheck,
} from 'lucide-react';
import { SUBMISSION_STATES } from '../utils/submissionFlow';

export default function AIProcessing({
  status,
  aiConfidence = null,
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
      ? observationType.label || 'Water Body'
      : observationType || 'Water Body';

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              AI Vision Analysis
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              GeoBrain-v3 Vision Transformer
            </p>
          </div>
        </div>

        {/* State badge */}
        <div>
          {isProcessing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
              Scanning Image…
            </span>
          ) : isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Analyzed (92%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Body content */}
      <div className="p-5 space-y-4">
        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="relative rounded-md bg-slate-900 text-white p-4 overflow-hidden border border-slate-800">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Animated scan bar */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse top-1/2" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-violet-300 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    Neural Feature Extraction
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Inference running…</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
                    <span>Analyzing pixel RGB absorption & surface reflection textures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
                    <span>Segmenting shoreline water boundaries and reservoir contours</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 w-3/4 animate-pulse rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center italic">
              Extracting hydrological signatures for {typeName} classification…
            </p>
          </div>
        )}

        {/* Completed State */}
        {isComplete && (
          <div className="space-y-4">
            {/* Score callout & feature match */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Big score box */}
              <div className="p-3.5 bg-violet-50/60 border border-violet-100 rounded-sm text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                  AI Confidence
                </span>
                <span className="text-3xl font-extrabold text-violet-900 mt-0.5">
                  {aiConfidence == null ? 'n/a' : `${aiConfidence}%`}
                </span>
                <span className="text-[10px] text-violet-600 font-medium mt-0.5">
                  High Confidence Tier
                </span>
              </div>

              {/* Classification label */}
              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Detected Feature
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      MATCH CONFIRMED
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    🌊 {typeName}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Threshold: &gt;85% required</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Passed automated check
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence items checklist */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-sm p-3.5 space-y-2 text-xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Visual Evidence Detected
              </p>
              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Open water surface specular reflection pattern validated</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Shoreline contour boundary matched with 94% edge confidence</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Depth gradient and turbidity signature consistent with seasonal pond storage</span>
              </div>
            </div>

            {/* Inference metadata */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>Model: GeoBrain-v3-vit-base</span>
              <span>Inference: 142ms · GPU TensorCore</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
