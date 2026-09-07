"""
app/services/__init__.py
Business logic services.

Each service module handles one domain and is called by API route handlers.
Services receive DB sessions and settings as arguments — they do NOT import
global state or call external services directly (that belongs in integrations/).

Phase 3+ will populate this with:
  - profile_service.py     — Cadre profile CRUD + stat aggregation
  - submission_service.py  — Observation submission + pipeline orchestration
  - verification_service.py — Dual-engine consensus logic
  - earnings_service.py    — Reward calculation + ledger management
"""
