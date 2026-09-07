"""Predictive recommendation engine (rule-based demo, not a trained model)."""

from __future__ import annotations

from typing import Any

from app.services.xai import build_xai

INTERVENTION_BY_CLASS = {
    "Check Dam": "Check Dam",
    "Farm Pond": "Farm Pond",
    "Contour Trench": "Contour Trench",
    "Percolation Tank": "Recharge Structure",
    "Boulder Check": "Boulder Check",
}


def recommend(analysis: dict[str, Any], extras: dict[str, Any] | None = None) -> dict[str, Any]:
    extras = extras or {}
    classification = analysis.get("classification") or "Farm Pond"
    intervention = INTERVENTION_BY_CLASS.get(classification, "Farm Pond")
    base = float(analysis.get("confidence") or 0.7)
    rainfall = extras.get("rainfall_index", 0.72)
    soil = extras.get("soil_suitability", 0.8)
    runoff = extras.get("runoff_potential", 0.78)
    historical = extras.get("historical_success", 0.86)
    suitability = min(0.97, (base * 0.35) + (runoff * 0.25) + (soil * 0.2) + (historical * 0.2))
    reasons = [
        "High runoff potential in the demo terrain profile",
        "Suitable soil / slope combination for water harvesting",
        "Similar interventions succeeded historically in the demo record set",
    ]
    xai = build_xai(analysis, extras)
    return {
        "intervention": intervention,
        "suitability": round(suitability, 2),
        "reasons": reasons,
        "important_features": xai["important_features"],
        "explanation": " ".join(xai["explanation"]),
        "provider": "DemoRecommendationEngine",
        "method": "rule-based-demo",
        "inputs": {
            "rainfall_index": rainfall,
            "soil_suitability": soil,
            "runoff_potential": runoff,
            "historical_success": historical,
            "source": "demo-tables",
        },
    }
