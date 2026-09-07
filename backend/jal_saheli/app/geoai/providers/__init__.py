"""Geo AI satellite/geospatial providers."""

from app.geoai.providers.bhuvan import (
    bhuvan_health_status,
    get_bhuvan_config,
    query_bhuvan,
    validate_wgs84_coordinates,
)
from app.geoai.providers.bhuvan_lulc import (
    bhuvan_lulc_health_status,
    get_bhuvan_lulc_config,
    query_bhuvan_lulc,
)

__all__ = [
    "bhuvan_health_status",
    "bhuvan_lulc_health_status",
    "get_bhuvan_config",
    "get_bhuvan_lulc_config",
    "query_bhuvan",
    "query_bhuvan_lulc",
    "validate_wgs84_coordinates",
]
