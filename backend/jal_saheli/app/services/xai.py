"""Rule-based explainability representation. SHAP is not executed."""

from __future__ import annotations

from typing import Any


def build_xai(analysis: dict[str, Any], terrain: dict[str, Any] | None = None) -> dict[str, Any]:
    confidence = float(analysis.get("confidence") or 0)
    classification = analysis.get("classification") or "Unknown"
    features = [
        {"feature": "runoff_potential", "importance": 0.34},
        {"feature": "terrain_slope", "importance": 0.27},
        {"feature": "soil_texture", "importance": 0.18},
        {"feature": "historical_success", "importance": 0.21},
    ]
    explanation = [
        f"Demo classifier labelled this site as {classification}.",
        "High runoff potential in the local terrain profile (demo soil/slope table).",
        "Similar interventions in the historical demo set succeeded at comparable sites.",
    ]
    if analysis.get("anomaly"):
        explanation.insert(1, "Low-confidence / anomalous spectral signature triggered triage.")
    if terrain:
        explanation.append(
            f"Terrain context: slope {terrain.get('slope', 'n/a')}%, "
            f"soil {terrain.get('soil', 'n/a')}."
        )
    return {
        "confidence": confidence,
        "important_features": features,
        "explanation": explanation,
        "method": "rule-based-demo",
    }
