# GeoWise — The Self-Learning Watershed Brain

GeoWise is a geospatial watershed-intelligence dashboard for monitoring field
interventions, prioritising verification work, and presenting explainable
planning insights. It is currently a **demo-first application**: the frontend
uses local mock data for most workflows while the Jal Saheli backend provides a
separate FastAPI foundation and health endpoint.

## Features

- **Command Center** — regional KPIs, priority alerts, workflow context, and a
  map overview.
- **GIS Map** — local geospatial layers, intervention markers, flagged zones,
  water bodies, and Jal Saheli submissions.
- **Submission Analysis** — a demo analysis view with confidence and
  explanation information.
- **Verification Queue** — searchable, filterable, and sortable mock cases for
  field verification triage.
- **Analytics** — demo suitability, recommendation, and explainability views.
- **Jal Saheli** — a community-cadre workflow for observation submission,
  GPS/photo capture, Telegram-style entry, verification history, and earnings.
- **Settings** — demo configuration controls for the pilot dashboard.

## Technology

### Frontend

- React 19
- Vite 8
- React Router DOM 7
- Tailwind CSS 4
- Leaflet and React Leaflet
- Lucide icons

### Backend

The optional Jal Saheli backend is in [`backend/jal_saheli`](backend/jal_saheli).
It uses FastAPI, Pydantic Settings, and async SQLAlchemy. See its dedicated
[backend README](backend/jal_saheli/README.md) for setup, configuration, and
test instructions.

## Project Structure

```text
.
├── src/
│   ├── components/          # Shared layout, UI, and map components
│   ├── data/                # Frontend demo/mock data
│   ├── modules/
│   │   ├── gis-map/         # Authoritative GIS workspace module
│   │   └── jal-saheli/      # Community observation workflow module
│   ├── pages/               # Routed dashboard pages
│   ├── App.jsx              # Application shell and routes
│   └── main.jsx             # React entry point
├── backend/jal_saheli/      # Optional FastAPI backend foundation
├── public/                  # Public static assets
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Install and run the frontend

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

### Linting

```bash
npm run lint
```

## Application Routes

| Route | Area |
| --- | --- |
| `/` | Command Center |
| `/gis-map` | GIS Intelligence Map |
| `/submission-analysis` | Submission Analysis demo |
| `/verification` | Field Verification Queue |
| `/analytics` | Analytics and planning intelligence |
| `/jal-saheli` | Jal Saheli community-cadre workflow |
| `/settings` | Settings and system configuration |

## Demo Data and Integration Status

The current frontend intentionally uses mock/demo data for dashboard metrics,
maps, analysis, verification, analytics, and Jal Saheli workflows. It does not
claim to perform live satellite processing, real AI inference, or live Telegram
delivery.

The Jal Saheli service layer can use a backend when `VITE_API_BASE_URL` is set;
otherwise it runs in in-memory demo mode. The only currently documented backend
endpoint is `GET /health`; the remaining Jal Saheli API endpoints are planned.

The Geo AI contribution is intentionally not documented as an implemented live
pipeline here. It can be integrated later at the existing
`/submission-analysis` boundary without changing the other route names.

## Backend Development

From the repository root:

```bash
cd backend/jal_saheli
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

Run the backend locally with:

```bash
cd backend/jal_saheli
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For environment variables, database notes, and the API roadmap, refer to the
[backend README](backend/jal_saheli/README.md).

## Notes for Contributors

- Keep frontend mock data clearly labelled until it is connected to a real
  service.
- Do not commit credentials. Use local environment files for backend secrets.
- Preserve the route contract above when adding modules so dashboard navigation
  remains stable.
- Run `npm run lint` and `npm run build` before submitting frontend changes.

## License

No license file is currently included in this repository.
