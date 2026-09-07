"""
app/api/router.py
Root API router — aggregates all sub-routers.

Mounting layout:
  /health                             — System health check
  /telegram/webhook                   — Telegram Bot webhook
  /api/jal-saheli/auth/register       — Cadre registration
  /api/jal-saheli/auth/login          — Cadre login & token issue
  /api/jal-saheli/profile             — Cadre profile & live aggregated statistics
  /api/jal-saheli/submissions         — List & create ground observations
  /api/jal-saheli/submissions/{id}    — Single submission detail
  /api/jal-saheli/submissions/{id}/status — Lightweight status for polling
  /api/jal-saheli/submissions/{id}/ai-result — AI vision inference
  /api/jal-saheli/submissions/{id}/satellite-result — Sentinel-2 satellite audit
  /api/jal-saheli/submissions/{id}/verification — Final dual-engine consensus
  /api/jal-saheli/submissions/{id}/verify — Trigger verification pipeline
  /api/jal-saheli/verification-history — Terminal status verification history
  /api/jal-saheli/earnings            — Earnings ledger transactions
  /api/jal-saheli/earnings/summary    — Aggregated earnings summary
  /api/jal-saheli/telegram/webhook    — Telegram Bot webhook
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api import ai, auth, earnings, health, profile, submissions, telegram, verification

# ── Root router ──────────────────────────────────────────────────────────────
root_router = APIRouter()
root_router.include_router(health.router)
root_router.include_router(telegram.router)
root_router.include_router(ai.router)  # /predict directly accessible

# ── Jal Saheli API router (prefix: /api/jal-saheli) ─────────────────────────
api_router = APIRouter(prefix="/api/jal-saheli")
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(submissions.router)
api_router.include_router(verification.router)
api_router.include_router(earnings.router)
api_router.include_router(telegram.router)
api_router.include_router(ai.router, prefix="/ai")  # /api/jal-saheli/ai/predict

root_router.include_router(api_router)

