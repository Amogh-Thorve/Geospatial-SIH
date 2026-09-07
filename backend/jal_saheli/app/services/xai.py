"""Explainability payload derived from the analysis that actually ran.

SHAP/LIME are not executed. Do not invent feature weights.
"""

from __future__ import annotations

from typing import Any


def build_xai(analysis: dict[str, Any], terrain: dict[str, Any] | None = None) -> dict[str, Any]:
    if analysis.get("available") is False or analysis.get("status") == "UNAVAILABLE":
        return {
            "confidence": None,
            "important_features": [],
            "explanation": [
                analysis.get("change_detection") or "Geo AI unavailable",
                analysis.get("code") or "SATELLITE DATA UNAVAILABLE",
            ],
            "method": "unavailable",
        }

    explanation = [
        f"Local satellite lookup classified this pixel as {analysis.get('lulc') or analysis.get('classification')}.",
        f"Stored NDVI={analysis.get('ndvi')}, NDWI={analysis.get('ndwi')} from satellite_lookup.npz.",
        analysis.get("change_detection") or "",
    ]
    imagery_provider = analysis.get("satellite_imagery_provider")
    if imagery_provider == "Bhuvan":
        bhuvan = analysis.get("bhuvan") or {}
        explanation.insert(
            1,
            "Bhuvan WMS imagery retrieved (map tile only; indices are not derived from Bhuvan WMS).",
        )
        if bhuvan.get("source"):
            explanation.insert(2, f"Bhuvan layer: {bhuvan['source']}.")
    elif imagery_provider == "local_satellite_grid" and analysis.get("bhuvan"):
        explanation.insert(
            1,
            "Bhuvan unavailable; local satellite grid used for indices.",
        )
    if analysis.get("row") is not None and analysis.get("col") is not None:
        explanation.insert(
            0,
            f"Lookup pixel row={analysis['row']} col={analysis['col']} "
            f"(source={analysis.get('source', 'real_satellite_grid')}).",
        )
    if analysis.get("anomaly"):
        explanation.append("LULC is not Water or Vegetation; satellite_match is DISCREPANCY.")
    if terrain:
        explanation.append(
            f"Terrain context: slope {terrain.get('slope', 'n/a')}%, soil {terrain.get('soil', 'n/a')}."
        )
    return {
        "confidence": analysis.get("confidence"),
        "important_features": [],
        "explanation": [part for part in explanation if part],
        "method": "satellite-lookup",
        "satellite_imagery_provider": analysis.get("satellite_imagery_provider"),
        "satellite_imagery_type": analysis.get("satellite_imagery_type"),
        "bhuvan": analysis.get("bhuvan"),
    }
