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
  const imagery = analysis?.satelliteImageryProvider || analysis?.satellite_imagery_provider;
  if (imagery === 'Bhuvan') {
    return 'Bhuvan WMS';
  }
  if (imagery === 'local_satellite_grid') {
    return 'Local satellite grid';
  }
  const src = analysis?.ndviSource || analysis?.ndwiSource || analysis?.ndvi_source || analysis?.ndwi_source;
  if (src === 'satellite_lookup' || src === 'real_satellite_grid') {
    return 'Local satellite grid';
  }
  if (src && src !== 'unavailable' && src !== 'unknown') {
    return src;
  }
  return null;
}

export function formatLulcSourceLabel(analysis) {
  const src = analysis?.lulcSource || analysis?.lulc_source;
  if (src === 'bhuvan_lulc_250k') {
    const year = analysis?.bhuvanLulc?.year || analysis?.bhuvan_lulc?.year;
    return year ? `Bhuvan LULC 250K (${year})` : 'Bhuvan LULC';
  }
  if (src === 'local_satellite_grid' || src === 'satellite_lookup') {
    return 'Local satellite grid';
  }
  return src || 'Unavailable';
}

export function formatBhuvanStatusLabel(analysis) {
  const bhuvan = analysis?.bhuvan;
  if (!bhuvan) {
    const imagery = analysis?.satelliteImageryProvider || analysis?.satellite_imagery_provider;
    if (imagery === 'Bhuvan') return 'Bhuvan: Connected';
    if (imagery === 'local_satellite_grid') return 'Bhuvan: Unavailable';
    return 'Bhuvan: Unavailable';
  }
  if (bhuvan.status === 'AVAILABLE' || bhuvan.reachable === true) {
    return 'Bhuvan: Connected';
  }
  return 'Bhuvan: Unavailable';
}

export function formatSatelliteImageryNote(analysis) {
  const imagery = analysis?.satelliteImageryProvider || analysis?.satellite_imagery_provider;
  if (imagery === 'Bhuvan') {
    return 'Bhuvan WMS imagery retrieved (indices still from local grid lookup).';
  }
  if (imagery === 'local_satellite_grid' && analysis?.bhuvan) {
    return 'Satellite provider unavailable — using local satellite grid.';
  }
  return 'Local satellite grid lookup.';
}

export function formatNdviNdwi(value) {
  if (value == null || Number.isNaN(value)) return 'Unavailable';
  const n = Number(value);
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(3);
  return value > 0 ? `+${formatted}` : formatted;
}
