# Jal Saheli Backend API

FastAPI backend for the **Jal Saheli** community water cadre observation module.

Powers the ground observation → AI → satellite → verification → earnings pipeline.

---

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or SQLite for development — no setup needed)

### 1. Clone and enter the directory

```bash
cd backend/jal_saheli
```

### 2. Create a virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
# Runtime only
pip install -r requirements.txt

# With dev/test tools
pip install -r requirements-dev.txt
```

### 4. Configure environment

```bash
# Copy the template
cp .env.example .env

# Edit .env — at minimum set:
#   DATABASE_URL (or leave default SQLite for dev)
#   JWT_SECRET_KEY (generate a real secret!)
```

### 5. Run the development server

```bash
# From backend/jal_saheli/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server starts at: **http://localhost:8000**

API docs (debug mode only): **http://localhost:8000/docs**

Health check: **http://localhost:8000/health**

---

## Environment Variables

See [`.env.example`](.env.example) for the complete reference with documentation.

| Category | Key variables |
|---|---|
| App | `APP_ENV`, `DEBUG`, `HOST`, `PORT` |
| Database | `DATABASE_URL`, `DB_POOL_SIZE` |
| Auth | `JWT_SECRET_KEY`, `JWT_ALGORITHM` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL` |
| AI | `AI_SERVICE_URL`, `AI_SERVICE_API_KEY` |
| Satellite | `SENTINEL_USERNAME`, `SENTINEL_PASSWORD` |
| Storage | `STORAGE_BACKEND`, `LOCAL_STORAGE_DIR` |
| CORS | `CORS_ORIGINS` |

---

## Running Tests

```bash
cd backend/jal_saheli

# Run all tests (uses .env.test — SQLite, no external services needed)
pytest

# With coverage report
pytest --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_health.py -v
```

Tests use `.env.test` automatically — **no PostgreSQL or external credentials needed**.

---

## Project Structure

```
backend/jal_saheli/
├── app/
│   ├── main.py              ← FastAPI app factory + lifespan
│   ├── config.py            ← Typed settings from env vars
│   ├── logging_config.py    ← Structured JSON logging
│   ├── api/
│   │   ├── router.py        ← Root API router
│   │   └── health.py        ← GET /health
│   ├── db/
│   │   └── database.py      ← Async SQLAlchemy engine + session
│   ├── models/              ← ORM models (Phase 2)
│   ├── schemas/             ← Pydantic request/response schemas (Phase 3)
│   ├── services/            ← Business logic (Phase 3+)
│   ├── integrations/        ← External service clients (Phase 5–7)
│   └── utils/               ← Shared utilities (Phase 3+)
├── tests/
│   ├── conftest.py          ← pytest fixtures
│   ├── test_config.py       ← Settings validation tests
│   ├── test_startup.py      ← App startup and CORS tests
│   └── test_health.py       ← Health endpoint tests
├── migrations/              ← Alembic migrations (Phase 2)
├── .env.example             ← Environment variable template
├── .env.test                ← Test environment (SQLite)
├── requirements.txt         ← Runtime dependencies
├── requirements-dev.txt     ← Dev + test dependencies
└── pyproject.toml           ← pytest + ruff config
```

---

## API Endpoints

### Phase 1 (current)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Backend health check |

### Phase 3 (planned)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jal-saheli/profile` | Cadre profile + stats |
| `GET` | `/api/jal-saheli/submissions` | List submissions |
| `POST` | `/api/jal-saheli/submissions` | Submit observation |
| `GET` | `/api/jal-saheli/submissions/:id/ai-result` | AI analysis result |
| `GET` | `/api/jal-saheli/submissions/:id/satellite-result` | Satellite result |
| `GET` | `/api/jal-saheli/submissions/:id/verification` | Final verification |
| `GET` | `/api/jal-saheli/earnings` | Earnings ledger |
| `GET` | `/api/jal-saheli/earnings/summary` | Earnings summary |

---

## Connecting to the Frontend

Set in the frontend `.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
```

The frontend's [`jalSaheliApi.js`](../../src/modules/jal-saheli/services/jalSaheliApi.js) will
automatically use the real backend when this variable is set,
falling back to in-memory demo mode when it is empty.

---

## Production Deployment

```bash
# Set APP_ENV=production in .env
# Generate a real JWT secret:
python -c "import secrets; print(secrets.token_hex(32))"

# Run migrations (Phase 2+)
alembic upgrade head

# Start with production workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Use Nginx or Caddy as a reverse proxy for HTTPS termination.
