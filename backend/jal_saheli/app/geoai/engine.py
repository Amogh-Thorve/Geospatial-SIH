"""Ved's LULC Random Forest and local satellite_lookup.npz.

Preserves the original model, NPZ grid, NDVI/NDWI formulas, and UTM 44N
affine lookup. Does not invent fallback pixels or confidence percentages.
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np
from affine import Affine
from pyproj import Transformer

logger = logging.getLogger("geowise.geoai")

LABEL_MAP = {0: "Water", 1: "Vegetation", 2: "Agriculture", 3: "Barren"}
MODEL_FILENAME = "lulc_rf_model_final.pkl"
LOOKUP_FILENAME = "satellite_lookup.npz"

rf_model: Any = None
sat_data: dict[str, Any] | None = None
transformer: Transformer | None = None
affine_transform: Affine | None = None
pixel_size_m: float | None = None
crs_name: str = "EPSG:32644"
model_path_used: str | None = None
lookup_path_used: str | None = None
load_error: str | None = None


class SatelliteUnavailableError(Exception):
    """Lookup cannot produce a real analysis for this request."""

    def __init__(self, code: str, message: str, extra: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.extra = extra or {}


def _asset_candidates(filename: str) -> list[Path]:
    env_dir = os.environ.get("GEOAI_MODEL_DIR")
    here = Path(__file__).resolve()
    paths: list[Path] = []
    if env_dir:
        paths.append(Path(env_dir) / filename)
    # engine.py → geoai → app → jal_saheli → backend
    if len(here.parents) >= 4:
        paths.append(here.parents[3] / filename)
        paths.append(here.parents[3] / "geoai_assets" / filename)
    paths.append(Path("/app/geoai_assets") / filename)
    paths.append(Path.cwd() / filename)
    paths.append(Path.cwd().parent / filename)
    return paths


def _find_asset(filename: str) -> Path | None:
    seen: set[Path] = set()
    for candidate in _asset_candidates(filename):
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_file():
            return resolved
    return None


def load_geoai_assets() -> None:
    """Load pickle + NPZ once. Missing files leave the engine unavailable."""
    global rf_model, sat_data, transformer, affine_transform, pixel_size_m
    global model_path_used, lookup_path_used, load_error, crs_name

    load_error = None
    model_file = _find_asset(MODEL_FILENAME)
    lookup_file = _find_asset(LOOKUP_FILENAME)

    if model_file is None:
        load_error = f"{MODEL_FILENAME} not found"
        logger.error(load_error)
        rf_model = None
    else:
        logger.info("Loading LULC model from %s", model_file)
        with model_file.open("rb") as handle:
            rf_model = pickle.load(handle)
        model_path_used = str(model_file)

    if lookup_file is None:
        msg = f"{LOOKUP_FILENAME} not found"
        load_error = f"{load_error}; {msg}" if load_error else msg
        logger.error(msg)
        sat_data = None
        transformer = None
        affine_transform = None
    else:
        logger.info("Loading satellite lookup from %s", lookup_file)
        sat_npz = np.load(lookup_file)
        sat_data = {
            "lulc": sat_npz["lulc"],
            "ndvi": sat_npz["ndvi"],
            "ndwi": sat_npz["ndwi"],
            "valid": sat_npz["valid"],
        }
        t_vals = sat_npz["transform"]
        affine_transform = Affine(
            t_vals[0], t_vals[1], t_vals[2], t_vals[3], t_vals[4], t_vals[5]
        )
        pixel_size_m = abs(float(t_vals[0]))
        if "crs_wkt" in sat_npz.files:
            crs_name = "EPSG:32644"
        transformer = Transformer.from_crs("EPSG:4326", "EPSG:32644", always_xy=True)
        lookup_path_used = str(lookup_file)


def geoai_status() -> dict[str, Any]:
    from app.geoai.providers.bhuvan import bhuvan_health_status
    from app.geoai.providers.bhuvan_lulc import bhuvan_lulc_health_status

    return {
        "status": "ok" if rf_model is not None and sat_data is not None else "unavailable",
        "model_loaded": rf_model is not None,
        "lookup_loaded": sat_data is not None,
        "model_path": model_path_used,
        "lookup_path": lookup_path_used,
        "crs": crs_name,
        "pixel_size_m": pixel_size_m,
        "detail": load_error,
        "bhuvan": bhuvan_health_status(),
        "bhuvan_lulc": bhuvan_lulc_health_status(),
    }


def predict_lulc_from_bands(green: float, red: float, nir: float, swir: float) -> dict[str, Any]:
    if rf_model is None:
        raise SatelliteUnavailableError("MODEL_UNAVAILABLE", "Geo AI model is not loaded")

    eps = 1e-6
    ndvi = (nir - red) / (nir + red + eps)
    ndwi = (green - nir) / (green + nir + eps)
    ndbi = (swir - nir) / (swir + nir + eps)
    ratio_nr = nir / (red + eps)
    ratio_gn = green / (nir + eps)
    features = np.array([[ndvi, ndwi, nir, swir, ndbi, ratio_nr, ratio_gn]])
    pred_class = int(rf_model.predict(features)[0])
    probabilities = rf_model.predict_proba(features)[0]
    confidence = float(max(probabilities))
    return {
        "prediction": LABEL_MAP.get(pred_class, str(pred_class)),
        "class_id": pred_class,
        "confidence": round(confidence, 3),
        "ndvi": round(float(ndvi), 4),
        "ndwi": round(float(ndwi), 4),
        "ndbi": round(float(ndbi), 4),
        "status": "success",
        "source": "random_forest",
    }


def lookup_location(latitude: float, longitude: float) -> dict[str, Any]:
    if sat_data is None or transformer is None or affine_transform is None:
        raise SatelliteUnavailableError("LOOKUP_UNAVAILABLE", "SATELLITE DATA UNAVAILABLE")

    x, y = transformer.transform(longitude, latitude)
    inv_affine = ~affine_transform
    col, row = inv_affine * (x, y)
    r, c = int(round(row)), int(round(col))
    height, width = sat_data["lulc"].shape
    extra = {
        "row": r,
        "col": c,
        "crs": crs_name,
        "pixel_size_m": pixel_size_m,
        "grid_shape": [int(height), int(width)],
    }
    if not (0 <= r < height and 0 <= c < width):
        raise SatelliteUnavailableError(
            "OUTSIDE_AVAILABLE_SCENE",
            "SATELLITE DATA UNAVAILABLE",
            extra,
        )
    if not bool(sat_data["valid"][r, c]):
        raise SatelliteUnavailableError(
            "OUTSIDE_AVAILABLE_SCENE",
            "SATELLITE DATA UNAVAILABLE",
            extra,
        )

    class_id = int(sat_data["lulc"][r, c])
    if class_id < 0:
        raise SatelliteUnavailableError(
            "OUTSIDE_AVAILABLE_SCENE",
            "SATELLITE DATA UNAVAILABLE",
            extra,
        )
    ndvi_val = float(sat_data["ndvi"][r, c])
    ndwi_val = float(sat_data["ndwi"][r, c])
    prediction = LABEL_MAP.get(class_id, "Unknown")
    is_match = prediction in {"Water", "Vegetation"}
    return {
        "available": True,
        "prediction": prediction,
        "class_id": class_id,
        "ndvi_val": round(ndvi_val, 3),
        "ndwi_val": round(ndwi_val, 3),
        "satellite_match": "MATCH" if is_match else "DISCREPANCY",
        "confidence": None,
        "source": "real_satellite_grid",
        "row": r,
        "col": c,
        "crs": crs_name,
        "pixel_size_m": pixel_size_m,
        "change_detection": "Single-date lookup only; temporal change detection is not implemented.",
    }
