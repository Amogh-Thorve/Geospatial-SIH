"""Predictive recommendation engine.

Does not invent classifier confidence. Suitability is omitted when no
Random Forest probability exists (location lookup has none).
"""

from __future__ import annotations

from typing import Any

from app.services.xai import build_xai

INTERVENTION_BY_CLASS = {
    "Check Dam": "Check Dam",
    "Farm Pond": "Farm Pond",
    "Contour Trench": "Contour Trench",
    "Percolation Tank": "Recharge Structure",
    "Boulder Check": "Boulder Check",
    "Water": "Waterbody protection",
    "Vegetation": "Vegetation / recharge",
    "Agriculture": "Farm Pond",
    "Barren": "Check Dam",
}


def recommend(analysis: dict[str, Any], extras: dict[str, Any] | None = None) -> dict[str, Any]:
    extras = extras or {}
    classification = analysis.get("classification") or analysis.get("lulc") or "Unknown"
    intervention = INTERVENTION_BY_CLASS.get(classification, classification)
    xai = build_xai(analysis, extras)
    confidence = analysis.get("confidence")
    if confidence is None:
        return {
            "intervention": intervention,
            "suitability": None,
            "reasons": [
                "No Random Forest class probability was produced for this location lookup.",
                "Recommendation is a LULC label mapping only, not a scored suitability model.",
            ],
            "important_features": [],
            "explanation": " ".join(xai["explanation"]),
            "provider": "LulcLabelMapping",
            "method": "label-mapping",
        }

    rainfall = extras.get("rainfall_index")
    soil = extras.get("soil_suitability")
    runoff = extras.get("runoff_potential")
    historical = extras.get("historical_success")
    terms = [float(confidence)]
    for value in (rainfall, soil, runoff, historical):
        if value is not None:
            terms.append(float(value))
    suitability = min(0.97, sum(terms) / len(terms))
    return {
        "intervention": intervention,
        "suitability": round(suitability, 2),
        "reasons": [
            f"Random Forest max-class probability {confidence:.3f}",
        ],
        "important_features": xai["important_features"],
        "explanation": " ".join(xai["explanation"]),
        "provider": "RfProbabilityMapping",
        "method": "rf-probability",
    }
