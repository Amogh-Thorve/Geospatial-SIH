"""
app/api/health.py
GET /health — Real backend health check endpoint.

Reports actual status of:
  - Application process (always healthy if this endpoint responds)
  - Database connectivity (checked live on each request)
  - Telegram bot configuration (checked via token presence)
  - AI service configuration (checked via URL presence)
  - Satellite service configuration (checked via credentials presence)
  - Storage configuration

External services are NEVER reported as healthy unless they are
actually configured and reachable.
"""

from __future__ import annotations

import logging
import sys
import time
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import check_db_connection

logger = logging.getLogger("jal_saheli.api.health")

router = APIRouter(tags=["Health"])

# Record startup time for uptime reporting
_startup_time: float = time.time()


@router.get(
    "/health",
    include_in_schema=True,
    summary="Backend health check",
    response_description="Aggregated health status of backend components",
    responses={
        200: {"description": "All required components healthy"},
        503: {"description": "One or more required components degraded"},
    },
)
async def health_check() -> JSONResponse:
    """
    Returns the real health status of each backend component.

    - `status`: "healthy" | "degraded"
    - `components`: per-component status with details
    - `uptime_seconds`: seconds since server started
    - `python_version`: runtime Python version

    A 200 response means all **required** components are healthy.
    A 503 response means at least one required component is unavailable.
    Optional/unconfigured integrations (Telegram, AI, Satellite) are
    reported as "not_configured" — this does NOT trigger 503.
    """
    settings = get_settings()
    components: dict[str, Any] = {}
    required_healthy = True

    # ── Database (required) ──────────────────────────────────────────────────
    db_ok = await check_db_connection()
    db_url_scheme = settings.database.url.split("://")[0] if settings.database.url else "unknown"
    components["database"] = {
        "status": "healthy" if db_ok else "unhealthy",
        "driver": db_url_scheme,
        "required": True,
    }
    if not db_ok:
        required_healthy = False
        logger.warning("Health check: database unreachable")

    # ── Telegram (optional — only configured if token set) ───────────────────
    if settings.telegram.configured:
        components["telegram"] = {
            "status": "configured",
            "webhook_mode": bool(settings.telegram.webhook_url),
            "required": False,
        }
    else:
        components["telegram"] = {
            "status": "not_configured",
            "detail": "Set TELEGRAM_BOT_TOKEN to enable",
            "required": False,
        }

    # ── AI Service (optional) ────────────────────────────────────────────────
    if settings.ai.configured:
        components["ai_service"] = {
            "status": "configured",
            "url": settings.ai.service_url,
            "required": False,
        }
    else:
        components["ai_service"] = {
            "status": "not_configured",
            "detail": "Set AI_SERVICE_URL to enable. Using deterministic stub.",
            "required": False,
        }

    # ── Satellite Service (optional) ─────────────────────────────────────────
    if settings.satellite.configured:
        components["satellite_service"] = {
            "status": "configured",
            "required": False,
        }
    else:
        components["satellite_service"] = {
            "status": "not_configured",
            "detail": "Set SENTINEL_USERNAME/PASSWORD or SENTINELHUB credentials. Using stub.",
            "required": False,
        }

    # ── Storage (required) ───────────────────────────────────────────────────
    storage_ok = settings.storage.configured
    components["storage"] = {
        "status": "healthy" if storage_ok else "unhealthy",
        "backend": settings.storage.backend,
        "required": True,
    }
    if not storage_ok:
        required_healthy = False
        logger.warning("Health check: storage not configured", extra={"backend": settings.storage.backend})

    # ── Auth configuration (warning only) ────────────────────────────────────
    auth_warn = not settings.auth.jwt_configured and settings.app.env == "production"
    components["authentication"] = {
        "status": "warning" if auth_warn else "healthy",
        "jwt_algorithm": settings.auth.jwt_algorithm,
        "detail": "JWT_SECRET_KEY uses placeholder value — change before production" if auth_warn else None,
        "required": False,
    }

    # ── Build response ────────────────────────────────────────────────────────
    overall_status = "healthy" if required_healthy else "degraded"
    http_status = 200 if required_healthy else 503

    uptime = round(time.time() - _startup_time, 1)
    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    payload = {
        "status": overall_status,
        "environment": settings.app.env,
        "version": settings.app.version,
        "uptime_seconds": uptime,
        "python_version": py_version,
        "components": components,
    }

    logger.info(
        "Health check completed",
        extra={"status": overall_status, "db_ok": db_ok, "uptime": uptime},
    )

    return JSONResponse(content=payload, status_code=http_status)
