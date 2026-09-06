/**
 * FlowProgress.jsx
 * Horizontal step progress bar: 📷 Photo → 🤖 AI → 🛰 Satellite → ✓ Verified → 💰 Earnings
 *
 * Props:
 *   currentStatus  — string from SUBMISSION_STATES
 *   steps          — FLOW_STEPS array from submissionFlow.js
 *   language       — 'en' | 'mr' | 'hi'  (optional, defaults to 'en')
 */

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { FLOW_STEPS, LOCKED_STATES } from '../utils/submissionFlow';

const labelKey = { en: 'label', mr: 'labelMarathi', hi: 'labelHindi' };

export default function FlowProgress({ currentStatus, steps = FLOW_STEPS, language = 'en' }) {
  const key = labelKey[language] || 'label';
  const isCurrentlyProcessing = LOCKED_STATES.has(currentStatus);

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Verification Pipeline Progress
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 capitalize">
            {currentStatus.replace(/_/g, ' ')}
          </span>
          {isCurrentlyProcessing && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>
      </div>

      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = step.completedIn.includes(currentStatus);
          const isActive    = step.activeIn.includes(currentStatus);
          const isLast      = i === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : isActive
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100 ring-opacity-70'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isActive && isCurrentlyProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-bold text-center leading-tight whitespace-nowrap transition-colors duration-200 ${
                    isCompleted
                      ? 'text-emerald-800'
                      : isActive
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {step[key] || step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className={`h-full transition-all duration-500 ease-out rounded-full ${
                      isCompleted ? 'w-full bg-emerald-500' : isActive ? 'w-1/2 bg-emerald-400 animate-pulse' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
