/**
 * Format persisted backend analysis fields for Jal Saheli UI (no fabricated values).
 */

export function formatConfidencePercent(confidence) {
  if (confidence == null || Number.isNaN(confidence)) return null;
  return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
}

export function formatConfidenceLabel(confidence) {
  const pct = formatConfidencePercent(confidence);
  return pct == null ? 'Confidence unavailable' : `Confidence: ${pct}%`;
}

export function formatSatelliteSourceLabel(analysis) {
  const src = analysis?.ndviSource || analysis?.ndwiSource || analysis?.ndvi_source || analysis?.ndwi_source;
  if (src === 'satellite_lookup' || src === 'real_satellite_grid') {
    return 'Local satellite grid';
  }
  if (src && src !== 'unavailable' && src !== 'unknown') {
    return src;
  }
  return null;
}

export function formatNdviNdwi(value) {
  if (value == null || Number.isNaN(value)) return 'Unavailable';
  const n = Number(value);
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(3);
  return value > 0 ? `+${formatted}` : formatted;
}
