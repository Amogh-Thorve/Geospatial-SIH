/**
 * SubmissionForm.jsx
 * Observation type selector + optional notes field.
 * Consumed by SubmitObservation.jsx which owns photo and location state.
 *
 * Props:
 *   types           — array of FORM_OBSERVATION_TYPES
 *   selectedType    — { id, label, emoji, reward } | null
 *   onSelectType    — fn(typeObj)
 *   notes           — string
 *   onNotesChange   — fn(string)
 *   disabled        — boolean (locked when processing)
 *   errors          — { type?: string, notes?: string }
 */

import React from 'react';
import { IndianRupee, AlertCircle, FileText } from 'lucide-react';

export default function SubmissionForm({
  types = [],
  selectedType,
  onSelectType,
  notes = '',
  onNotesChange,
  disabled = false,
  errors = {},
}) {
  return (
    <div className="space-y-5">

      {/* ── Observation Type ──────────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          Observation Type
          <span className="text-rose-500" aria-hidden="true">*</span>
        </legend>
        <p className="text-xs text-slate-500 mb-3">What are you reporting?</p>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Observation type"
          aria-required="true"
        >
          {types.map((t) => {
            const isSelected = selectedType?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                id={`obs-type-${t.id}`}
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => !disabled && onSelectType(t)}
                className={`flex items-start gap-3 px-4 py-3 rounded border-2 text-left transition-all min-h-[72px] ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : errors.type
                    ? 'border-rose-200 bg-rose-50 hover:border-slate-300 hover:bg-white'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                {/* Emoji icon */}
                <span className="text-2xl leading-none shrink-0 mt-0.5" role="img" aria-label={t.label}>
                  {t.emoji}
                </span>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold leading-tight ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {t.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {t.description}
                  </p>
                  {/* Reward badge */}
                  <span className={`inline-flex items-center gap-0.5 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <IndianRupee className="w-2.5 h-2.5" />{t.reward} reward
                  </span>
                </div>

                {/* Selection indicator */}
                <div className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {errors.type && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.type}
          </p>
        )}

        {/* Selected reward callout */}
        {selectedType && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-emerald-800 font-medium">
              Expected incentive for <strong>{selectedType.label}</strong>:{' '}
              <strong>₹{selectedType.reward}</strong> after verification
            </span>
          </div>
        )}
      </fieldset>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="obs-notes"
          className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          Notes
          <span className="text-[11px] font-normal text-slate-400">(optional)</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Describe what you observed — condition, size, nearby landmarks.
        </p>
        <textarea
          id="obs-notes"
          name="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={500}
          placeholder="e.g. The pond is full after recent rains. Located behind the temple. Water appears clean."
          aria-label="Observation notes"
          className={`w-full rounded border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
            disabled
              ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.notes ? (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" />
              {errors.notes}
            </p>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-slate-400">{notes.length}/500</span>
        </div>
      </div>

    </div>
  );
}
