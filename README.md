# GeoWise — The Self-Learning Watershed Brain

GeoWise is a geospatial watershed-intelligence dashboard for Smart India Hackathon 2026
(Problem Statement 26015). This recovery branch wires **one frontend**, **one FastAPI
backend**, and **one database** so the product can be demonstrated as a single
operational workflow.

The stack uses **one FastAPI process** on port 8000. Ved's Random Forest and
`satellite_lookup.npz` are loaded inside Jal Saheli. Optional Bhuvan LULC/WMS
activate when configured via environment variables. Demo seed data is **off by
default** (`SEED_DEMO_DATA=false`).

## Authoritative modules

| Capability | Authoritative implementation | Legacy (not routed) |
| --- | --- | --- |
| GIS | `src/modules/gis-map` (`GISMapPage`) | `src/pages/GisMap.jsx` |
| Jal Saheli | `src/modules/jal-saheli` (`JalSaheliDashboard`) | `src/pages/JalSaheli.jsx` |
| Command Center | `src/pages/CommandCenter.jsx` | — |
| Submission / Geo AI UI | `src/pages/SubmissionAnalysis.jsx` | Unified `/api/submissions/{id}/analyze` + `/api/analyze-location` |
| Verification | `src/pages/VerificationQueue.jsx` | `src/data/verificationMockData.js` (reference only) |
| API client | `src/services/*` | per-page mock imports removed from live pages |

Canonical routes: `/`, `/gis-map`, `/submission-analysis`, `/verification`, `/analytics`, `/jal-saheli`, `/settings`.

## Quick start (no Docker)

Terminal 1 — backend (SQLite):

```bash
cd backend/jal_saheli
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # or set DATABASE_URL=sqlite+aiosqlite:///./geowise_dev.db
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health: http://localhost:8000/api/health

Terminal 2 — frontend:

```bash
npm install
npm run dev
```

Vite proxies `/api` to port 8000. Open http://localhost:5173.

## Docker Compose

```bash
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:8000
- PostGIS: localhost:5432 (`geowise` / `geowise` / `geowise`)

## Tests and quality

```bash
npm run lint
npm run build
cd backend/jal_saheli && pytest && ruff check app tests
```

## Architecture notes

- **Geo AI:** Ved `RandomForestClassifier` (`lulc_rf_model_final.pkl`) and local `satellite_lookup.npz` are served from the same app as Jal Saheli. Pin `scikit-learn==1.6.1` (model training version). Optional Bhuvan LULC/WMS via `BHUVAN_*` env vars.
- **Demo seed:** Disabled by default. Set `SEED_DEMO_DATA=true` only if you need sample GW-* rows for a local demo.
- **Data fusion:** `app/geospatial/adapters.py` still records that live Drishti/Srishti HTTP is not connected.
- **Triage:** verification tasks are created from LULC discrepancy or genuine RF probability (when bands are classified). Location lookup does **not** invent 85%/91% confidence.
- **Closed loop:** verification outcomes write `FeedbackRecord` rows. No retraining worker in the MVP.
- **Jal Credits:** integer stewardship score, not money.
- **Telegram:** `LocalTelegramBotProvider` until `TELEGRAM_BOT_TOKEN` is set.

Do not commit secrets. Use `.env.example` as the template.
