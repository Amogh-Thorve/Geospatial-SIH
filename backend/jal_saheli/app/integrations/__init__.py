"""
app/integrations/__init__.py
External service integration clients.

Each integration module is a thin async wrapper around one external API.
All integrations MUST implement a `configured` property/check and a stub
fallback that is used when credentials are not provided.

Phase 5–7 will populate this with:
  - telegram/       — python-telegram-bot handlers + webhook
  - ai_client.py    — GeoBrain / Vision model caller
  - satellite_client.py — Copernicus CDSE / Sentinel Hub caller
  - storage_client.py   — Local disk / S3 / GCS photo storage
"""
