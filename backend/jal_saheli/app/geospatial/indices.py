"""NDVI / NDWI helpers. Only compute when real bands exist."""

from __future__ import annotations


def ndvi(nir: float, red: float) -> float:
    denom = nir + red
    if denom == 0:
        return 0.0
    return (nir - red) / denom


def ndwi(green: float, nir: float) -> float:
    denom = green + nir
    if denom == 0:
        return 0.0
    return (green - nir) / denom
