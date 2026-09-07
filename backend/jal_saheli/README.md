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
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET` |
| AI | `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, `AI_REQUEST_TIMEOUT_SECONDS` |
| Satellite | `SENTINEL_USERNAME`, `SENTINEL_PASSWORD`, `SENTINELHUB_CLIENT_ID`, `SENTINELHUB_CLIENT_SECRET` |
| Storage | `STORAGE_BACKEND`, `LOCAL_STORAGE_DIR`, `MAX_PHOTO_SIZE_BYTES` |
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

Current test suite: **202 tests** covering auth, submissions, verification, earnings, notifications, Telegram bot, AI analysis, satellite verification, and security.

---

## API Endpoints

### Core

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Backend health check (DB, storage, integrations) |

### Authentication

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| `POST` | `/api/jal-saheli/auth/register` | 10/min | Cadre registration + JWT |
| `POST` | `/api/jal-saheli/auth/login` | 10/min | Phone login + JWT |

### Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jal-saheli/profile` | JWT | Cadre profile + live aggregated stats |

### Submissions

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jal-saheli/submissions` | JWT | Paginated submission list |
| `POST` | `/api/jal-saheli/submissions` | JWT | Create ground observation (multipart) |
| `GET` | `/api/jal-saheli/submissions/{id}` | JWT | Submission detail (owner-isolated) |
| `GET` | `/api/jal-saheli/submissions/{id}/status` | JWT | Lightweight status for polling |

### Verification and Analysis

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jal-saheli/submissions/{id}/ai-result` | JWT | AI analysis result |
| `GET` | `/api/jal-saheli/submissions/{id}/satellite-result` | JWT | Satellite cross-check |
| `GET` | `/api/jal-saheli/submissions/{id}/verification` | JWT | Final consensus result |
| `POST` | `/api/jal-saheli/submissions/{id}/verify` | JWT | Trigger verification pipeline |
| `GET` | `/api/jal-saheli/verification-history` | JWT | Terminal decisions history |

### Earnings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jal-saheli/earnings` | JWT | Paginated earnings ledger |
| `GET` | `/api/jal-saheli/earnings/summary` | JWT | Aggregated earnings + breakdown |

### Telegram

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/telegram/webhook` | Webhook Secret | Telegram bot update handler |

---

## Telegram Bot Setup

1. Create a bot via @BotFather and obtain the token
2. Set `TELEGRAM_BOT_TOKEN` in `.env`
3. For webhook mode (production): set `TELEGRAM_WEBHOOK_URL` and `TELEGRAM_WEBHOOK_SECRET`
4. The bot supports `/start`, `/help`, `/status`, `/cancel` commands
5. Languages: English, Hindi, Marathi

## AI Service Setup

1. Deploy or connect to a vision AI inference endpoint
2. Set `AI_SERVICE_URL` to the endpoint URL
3. Set `AI_SERVICE_API_KEY` if authentication is required
4. If unconfigured, the system returns `AI_NOT_CONFIGURED` (confidence = 0)

## Satellite Service Setup

1. Register at Copernicus Data Space (https://dataspace.copernicus.eu/) (free)
2. Set `SENTINEL_USERNAME` and `SENTINEL_PASSWORD`
3. Alternative: Use Sentinel Hub OAuth credentials
4. If unconfigured, the system returns `SATELLITE_NOT_CONFIGURED` (confidence = 0)

---

## Connecting to the Frontend

Set in the frontend `.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
```

The frontend connects to the real backend using this URL and shows error states if the backend is unavailable.

---

## Database

### Development (SQLite)
No setup needed. Tables auto-create on startup when `APP_ENV=development`.

### Production (PostgreSQL)
```bash
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/jal_saheli_db
alembic upgrade head
```

### Tables
- `cadre_profiles` — Field worker identity and registration
- `submissions` — Ground observations with coordinates and photos
- `earnings_ledger` — Incentive transactions with idempotency
- `verification_events` — AI/satellite/final audit trail

---

## Production Deployment

```bash
# Set APP_ENV=production in .env
# Generate a real JWT secret:
python -c "import secrets; print(secrets.token_hex(32))"

# Run migrations
alembic upgrade head

# Start with production workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Use Nginx or Caddy as a reverse proxy for HTTPS termination.

### Production Checklist
- [ ] `JWT_SECRET_KEY` — generate a real random secret
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `APP_ENV=production` — disables Swagger docs and auto table creation
- [ ] `CORS_ORIGINS` — restrict to your production domain
- [ ] `TELEGRAM_WEBHOOK_SECRET` — set for webhook auth
- [ ] HTTPS termination via reverse proxy
