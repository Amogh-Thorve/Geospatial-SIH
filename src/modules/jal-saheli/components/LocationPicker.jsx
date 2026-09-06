/**
 * LocationPicker.jsx
 * Browser geolocation support with robust permission-denied and unavailable-location handling.
 *
 * Requirements:
 * - Real browser geolocation via navigator.geolocation.
 * - Handles permission denied, timeout, and unavailable states gracefully.
 * - Displays "Location unavailable" with retry capability when GPS fails.
 * - Does NOT silently assign fabricated coordinates as real GPS.
 * - Allows explicit fallback selection ONLY upon user opt-in, clearly labeled as fallback.
 *
 * Props:
 *   location       — { lat, lng, label, source, accuracy } | null
 *   onLocationSet  — fn({ lat, lng, label, source, accuracy })
 *   disabled       — boolean
 *   error          — string | null (validation error)
 */

import React, { useState, useRef } from 'react';
import { MapPin, Navigation, RefreshCw, AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Optional offline fallback — ONLY used when explicitly opted into by user
const OFFLINE_FALLBACK_LOCATION = {
  lat: 18.0667,
  lng: 73.9167,
  label: 'Khed, Pune (Fallback Coordinates)',
  district: 'Pune District',
  state: 'Maharashtra',
  source: 'fallback',
};

function formatCoord(val) {
  return typeof val === 'number' ? val.toFixed(5) : '—';
}

function StatusChip({ geoState, accuracy, source }) {
  if (geoState === 'requesting') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
        <Loader className="w-3 h-3 animate-spin" /> Requesting GPS…
      </span>
    );
  }
  if (geoState === 'acquired' || source === 'gps') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
        <CheckCircle className="w-3 h-3" /> GPS Acquired
        {accuracy != null && ` (±${accuracy}m)`}
      </span>
    );
  }
  if (geoState === 'fallback' || source === 'fallback') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
        <AlertCircle className="w-3 h-3" /> Offline Fallback
      </span>
    );
  }
  return null;
}

export default function LocationPicker({ location, onLocationSet, disabled = false, error = null }) {
  const [geoState, setGeoState] = useState('idle'); // idle | requesting | acquired | unavailable | fallback
  const [geoErrorMsg, setGeoErrorMsg] = useState(null);

  // Attempt browser geolocation automatically on first mount if not already acquired
  const didAttemptRef = useRef(false);
  if (!didAttemptRef.current && !location) {
    didAttemptRef.current = true;
    Promise.resolve().then(() => attemptGeolocation());
  }

  function attemptGeolocation() {
    if (disabled) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unavailable');
      setGeoErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGeoState('requesting');
    setGeoErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const resolved = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${formatCoord(pos.coords.latitude)}° N, ${formatCoord(pos.coords.longitude)}° E`,
          district: 'GPS Geotag',
          state: '',
          source: 'gps',
          accuracy: Math.round(pos.coords.accuracy),
        };
        setGeoState('acquired');
        setGeoErrorMsg(null);
        onLocationSet(resolved);
      },
      (err) => {
        let msg = 'Location unavailable. Please check location permissions.';
        if (err.code === 1) {
          msg = 'Location permission denied by user or browser.';
        } else if (err.code === 2) {
          msg = 'Location unavailable (position fix could not be determined).';
        } else if (err.code === 3) {
          msg = 'Location request timed out.';
        }
        setGeoState('unavailable');
        setGeoErrorMsg(msg);
      },
      { timeout: 9000, maximumAge: 30000, enableHighAccuracy: true }
    );
  }

  function handleUseFallback() {
    setGeoState('fallback');
    setGeoErrorMsg(null);
    onLocationSet({ ...OFFLINE_FALLBACK_LOCATION });
  }

  const hasLocation = !!location && location.lat != null && location.lng != null;

  return (
    <div className="space-y-2">
      {/* Location display box */}
      <div
        className={`rounded border p-4 transition-colors ${
          error
            ? 'border-rose-300 bg-rose-50'
            : geoState === 'unavailable' && !hasLocation
            ? 'border-amber-300 bg-amber-50/50'
            : hasLocation
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        {geoState === 'requesting' ? (
          /* Requesting state */
          <div className="flex items-center gap-3 py-2">
            <Loader className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Acquiring device GPS coordinates…</p>
              <p className="text-xs text-slate-500 mt-0.5">Please allow browser location access if prompted.</p>
            </div>
          </div>
        ) : geoState === 'unavailable' && !hasLocation ? (
          /* Location unavailable state */
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Location unavailable</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {geoErrorMsg || 'Unable to retrieve your current GPS coordinates.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
              <button
                type="button"
                id="location-retry-btn"
                onClick={attemptGeolocation}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry GPS
              </button>

              <button
                type="button"
                id="location-use-fallback-btn"
                onClick={handleUseFallback}
                disabled={disabled}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-medium rounded hover:bg-amber-100/50 transition-colors"
              >
                <Navigation className="w-3 h-3 text-amber-600" />
                Use offline fallback coordinates
              </button>
            </div>
          </div>
        ) : hasLocation ? (
          /* Location acquired or fallback selected */
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${location.source === 'fallback' ? 'text-amber-600' : 'text-emerald-600'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{location.label}</p>
                  {location.district && (
                    <p className="text-xs text-slate-500">
                      {location.district}{location.state ? ` • ${location.state}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <StatusChip geoState={geoState} accuracy={location.accuracy} source={location.source} />
            </div>

            {/* Coordinate grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100">
              <div className="bg-white border border-emerald-100 rounded px-3 py-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Latitude</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{formatCoord(location.lat)}° N</p>
              </div>
              <div className="bg-white border border-emerald-100 rounded px-3 py-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Longitude</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{formatCoord(location.lng)}° E</p>
              </div>
            </div>

            {/* Fallback label indicator */}
            {location.source === 'fallback' && (
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 pt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Simulated coordinates used. Live GPS was unavailable.
              </p>
            )}
          </div>
        ) : (
          /* Idle fallback */
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Navigation className="w-4 h-4 text-slate-400" />
              <span>Location not yet acquired.</span>
            </div>
            <button
              type="button"
              onClick={attemptGeolocation}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Acquire GPS
            </button>
          </div>
        )}
      </div>

      {/* Validation error from parent form */}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-rose-600 font-medium" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Retry link when location is set via fallback or user wants to re-acquire */}
      {!disabled && hasLocation && (
        <div className="flex items-center justify-between text-xs px-1">
          <button
            type="button"
            onClick={attemptGeolocation}
            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Re-acquire GPS
          </button>
        </div>
      )}
    </div>
  );
}
