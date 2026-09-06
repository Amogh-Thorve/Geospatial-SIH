/**
 * SatelliteVerification.jsx
 * Visual card showing Sentinel-2 satellite imagery cross-audit:
 * - Animated radar sweep / orbital audit state while SATELLITE_PROCESSING is active
 * - Deterministic completed state: 96% confidence, Sentinel-2 spectral verification
 *
 * Props:
 *   status               - string from SUBMISSION_STATES
 *   satelliteConfidence  - number (default 96)
 *   location             - location object (default Khed, Pune)
 *   observationType      - string or object (default 'Water Body')
 */

import React from 'react';
import {
  Satellite,
  CheckCircle2,
  Loader2,
  Radio,
  MapPin,
  Waves,
  Globe2,
  Check,
} from 'lucide-react';
import { SUBMISSION_STATES } from '../utils/submissionFlow';

export default function SatelliteVerification({
  status,
  satelliteConfidence = 96,
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
  const locationLabel = location?.label || (latText && lngText ? `${latText}°N, ${lngText}°E` : 'Field Coordinates');

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Satellite Multispectral Audit
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Sentinel-2 L2A (10m Resolution)
            </p>
          </div>
        </div>

        {/* State badge */}
        <div>
          {isProcessing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-700 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
              Auditing Tile…
            </span>
          ) : isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Satellite Verified (96%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              Awaiting AI Step
            </span>
          )}
        </div>
      </div>

      {/* Body content */}
      <div className="p-5 space-y-4">
        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="relative rounded-md bg-slate-950 text-white p-4 overflow-hidden border border-slate-800">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
              
              {/* Radar sweep pulse */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full animate-ping" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-300 font-mono">
                    <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    Copernicus Sentinel-2 Tile Cross-Check
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Orbital Overpass</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                    <span>Querying bounding box: [{latText && lngText ? `${latText}° N, ${lngText}° E` : 'Ground location'}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Waves className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
                    <span>Calculating B3 (Green) vs B8 (NIR) NDWI moisture composite</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 w-4/5 animate-pulse rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center italic">
              Correlating ground observation coordinates with orbital multispectral pass…
            </p>
          </div>
        )}

        {/* Completed State */}
        {isComplete && (
          <div className="space-y-4">
            {/* Score callout & spectral metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Big score box */}
              <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-sm text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                  Satellite Confidence
                </span>
                <span className="text-3xl font-extrabold text-sky-900 mt-0.5">
                  {satelliteConfidence}%
                </span>
                <span className="text-[10px] text-sky-600 font-medium mt-0.5">
                  Sentinel-2 Match
                </span>
              </div>

              {/* Spectral details */}
              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Normalized Difference Water Index (NDWI)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      +0.38 DELTA
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    🛰️ Water Surface Confirmed
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {locationLabel}
                  </span>
                  <span className="text-slate-600 font-mono text-[10px]">
                    {latText && lngText ? `${latText}°N, ${lngText}°E` : 'Geotagged'}
                  </span>
                </div>
              </div>
            </div>

            {/* Satellite spectral data grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Spectral Band</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block font-mono">B3 / B8 NDWI</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cloud Cover</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 block">1.4% (Clear)</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Resolution</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block font-mono">10m / Pixel</span>
              </div>
            </div>

            {/* Audit explanation */}
            <div className="bg-sky-50/50 border border-sky-100 rounded-sm p-3 text-xs text-sky-900 flex items-start gap-2">
              <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Multispectral Sentinel-2 tile cross-correlated with field GPS coordinates.
                High near-infrared absorption confirms standing open-water body.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
