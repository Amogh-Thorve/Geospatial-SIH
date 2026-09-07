"""
app/api/router.py
Root API router — aggregates all sub-routers.

Mounting pattern:
    Phase 1:  /health
    Phase 3+: /api/jal-saheli/profile
              /api/jal-saheli/submissions
              /api/jal-saheli/earnings
              /telegram/webhook

Add new routers here as phases are implemented.
"""

from fastapi import APIRouter

from app.api import geowise, health

# ── Root router (no prefix — health is at /health not /api/health) ──────────
root_router = APIRouter()
root_router.include_router(health.router)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(geowise.router)
root_router.include_router(api_router)

# ── Jal Saheli API router (prefix: /api/jal-saheli) ─────────────────────────
# Uncomment and import as phases are implemented:
#
# from app.api import profile, submissions, earnings, verification
#
# api_router = APIRouter(prefix="/api/jal-saheli")
# api_router.include_router(profile.router,       prefix="/profile")
# api_router.include_router(submissions.router,   prefix="/submissions")
# api_router.include_router(verification.router,  prefix="/submissions")
# api_router.include_router(earnings.router,      prefix="/earnings")
#
# root_router.include_router(api_router)

# ── Telegram webhook router (prefix: /telegram) ──────────────────────────────
# from app.api import telegram
# root_router.include_router(telegram.router, prefix="/telegram")
