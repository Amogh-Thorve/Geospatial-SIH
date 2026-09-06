/**
 * PhotoUpload.jsx
 * File picker with live image preview, validation, and change/remove controls.
 *
 * Rules enforced:
 *   - Only image/* MIME types accepted
 *   - Max file size: 10 MB
 *   - Previews via URL.createObjectURL (no cloud upload)
 *   - Revokes object URL on unmount / photo change to prevent memory leaks
 *
 * Props:
 *   photo      — { file, previewUrl, name } | null
 *   onChange   — fn({ file, previewUrl, name }) called when valid photo selected
 *   onRemove   — fn() called when user removes the current photo
 *   disabled   — boolean, locks the control when flow is processing
 *   error      — string | null, validation error message to display
 */

import React, { useRef, useEffect } from 'react';
import { Camera, X, ImagePlus, AlertCircle, CheckCircle } from 'lucide-react';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function PhotoUpload({ photo, onChange, onRemove, disabled = false, error = null }) {
  const inputRef = useRef(null);

  // Revoke previous object URL when photo changes or component unmounts
  useEffect(() => {
    return () => {
      if (photo?.previewUrl && photo.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, [photo?.previewUrl]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after removal
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      onChange(null, 'Please select an image file (JPG, PNG, HEIC, etc.)');
      return;
    }
    if (file.size > MAX_BYTES) {
      onChange(null, `File too large. Maximum size is 10 MB (selected: ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onChange({ file, previewUrl, name: file.name }, null);
  }

  function handleRemove() {
    if (photo?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    if (onRemove) onRemove();
  }

  // ── Uploaded state ──────────────────────────────────────────────────────────
  if (photo?.previewUrl) {
    return (
      <div className="space-y-2">
        <div className="relative rounded border border-slate-200 overflow-hidden bg-slate-50">
          <img
            src={photo.previewUrl}
            alt="Selected observation"
            className="w-full max-h-64 object-cover"
          />
          {/* Overlay controls */}
          {!disabled && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              {/* Change photo */}
              <button
                type="button"
                id="photo-change-btn"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-white shadow-sm transition-colors"
                aria-label="Change photo"
              >
                <Camera className="w-3 h-3" /> Change
              </button>
              {/* Remove photo */}
              <button
                type="button"
                id="photo-remove-btn"
                onClick={handleRemove}
                className="flex items-center gap-1 px-2 py-1 bg-rose-50/90 border border-rose-200 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-100 shadow-sm transition-colors"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
        </div>

        {/* File name + success indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{photo.name}</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── Empty / select state ────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        id="photo-select-btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Select or capture a photo"
        className={`w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded transition-colors ${
          error
            ? 'border-rose-300 bg-rose-50'
            : disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
            : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${error ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <ImagePlus className={`w-6 h-6 ${error ? 'text-rose-500' : 'text-slate-500'}`} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-semibold ${error ? 'text-rose-700' : 'text-slate-700'}`}>
            Tap to select or take a photo
          </p>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, HEIC · Max 10 MB</p>
        </div>
      </button>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-rose-600 font-medium" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Photo file input"
      />
    </div>
  );
}
