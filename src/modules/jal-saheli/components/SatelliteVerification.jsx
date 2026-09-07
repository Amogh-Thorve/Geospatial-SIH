/**
 * SatelliteVerification.jsx
 * Visual card for local satellite grid lookup (satellite_lookup.npz).
 *
 * Props:
 *   status               - string from SUBMISSION_STATES
 *   satelliteConfidence  - number | null (from backend, if produced)
 *   ndvi, ndwi           - spectral indices from lookup (optional)
 *   satelliteSource      - source label (optional)
 *   satelliteMatch       - MATCH | DISCREPANCY | UNAVAILABLE (optional)
 *   changeDetection      - backend change-detection note (optional)
 *   location             - location object (optional)
 */

import React from 'react';
import {
  Satellite,
  CheckCircle2,
  Loader2,
  Radio,
  MapPin,
  Globe2,
  Check,
} from 'lucide-react';
import { SUBMISSION_STATES } from '../utils/submissionFlow';
import {
  formatConfidenceLabel,
  formatBhuvanStatusLabel,
  formatNdviNdwi,
  formatSatelliteImageryNote,
  formatSatelliteSourceLabel,
} from '../utils/analysisDisplay';

export default function SatelliteVerification({
  status,
  satelliteConfidence = null,
  ndvi = null,
  ndwi = null,
  satelliteSource = null,
  satelliteImageryProvider = null,
  bhuvan = null,
  ndviSource = null,
  ndwiSource = null,
  satelliteMatch = null,
  changeDetection = null,
  location = null,
  _observationType = 'Water Body',
}) {
  const isProcessing = status === SUBMISSION_STATES.SATELLITE_PROCESSING;

  const isComplete =
    status === SUBMISSION_STATES.SATELLITE_COMPLETE ||
    status === SUBMISSION_STATES.FINAL_VERIFICATION ||
    status === SUBMISSION_STATES.VERIFIED ||
    status === SUBMISSION_STATES.EARNINGS_ADDED;

  const latText = typeof location?.lat === 'number' ? location.lat.toFixed(4) : null;
  const lngText = typeof location?.lng === 'number' ? location.lng.toFixed(4) : null;
  const locationLabel =
    location?.label || (latText && lngText ? `${latText}°N, ${lngText}°E` : 'Field coordinates');

  const sourceLabel =
    satelliteSource ||
    formatSatelliteSourceLabel({
      satelliteImageryProvider,
      ndviSource,
      ndwiSource,
    }) ||
    'Local satellite grid';

  const bhuvanLabel = formatBhuvanStatusLabel({ satelliteImageryProvider, bhuvan });
  const imageryNote = formatSatelliteImageryNote({ satelliteImageryProvider, bhuvan });

  const completeBadge =
    satelliteConfidence != null
      ? `Verified (${satelliteConfidence}%)`
      : 'Satellite lookup complete';

  const changeNote =
    changeDetection ||
    'Change detection: unavailable — single-date data';

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden transition-all duration-300">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Satellite Grid Lookup
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {bhuvanLabel} · Source: {sourceLabel}
            </p>
          </div>
        </div>

        <div>
          {isProcessing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-700 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
              Querying grid…
            </span>
          ) : isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {completeBadge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              Awaiting analysis
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isProcessing && (
          <div className="space-y-4">
            <div className="relative rounded-md bg-slate-950 text-white p-4 overflow-hidden border border-slate-800">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full animate-ping" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-300 font-mono">
                    <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    Local satellite grid lookup
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">NPZ index</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                    <span>
                      Coordinates:{' '}
                      {latText && lngText ? `${latText}° N, ${lngText}° E` : 'submitted location'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
                    <span>Reading stored NDVI / NDWI from satellite_lookup.npz</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 w-4/5 animate-pulse rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center italic">
              {imageryNote}
            </p>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-sm text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                  Lookup confidence
                </span>
                <span className="text-lg font-extrabold text-sky-900 mt-0.5 text-center leading-tight">
                  {formatConfidenceLabel(satelliteConfidence)}
                </span>
              </div>

              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Stored indices (grid lookup)
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    NDVI {formatNdviNdwi(ndvi)} · NDWI {formatNdviNdwi(ndwi)}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {locationLabel}
                  </span>
                  {satelliteMatch ? (
                    <span className="text-slate-600 font-mono text-[10px]">
                      Match: {satelliteMatch}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-sky-50/50 border border-sky-100 rounded-sm p-3 text-xs text-sky-900 flex items-start gap-2">
              <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>{changeNote}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
