# Walkthrough: Jal Saheli Real Telegram Bot Integration (Phase 5)

Phase 5 implements the real, fully functional, multi-lingual Telegram Bot integration for Jal Saheli field cadres, connecting real Telegram users to backend database records and the verification pipeline.

---

## 1. Architecture & Workflow

```
Telegram User
      │
      ▼
Telegram Bot API
      │
      │  HTTPS POST with X-Telegram-Bot-Api-Secret-Token
      ▼
POST /api/jal-saheli/telegram/webhook (or /telegram/webhook)
      │
      ├── 1. Webhook Secret Validation (hmac.compare_digest)
      ├── 2. Duplicate Update Suppression (LRU cache on update_id)
      ├── 3. Identity Resolution (telegram_user_id ↔ CadreProfile)
      │
      ▼
State Machine (app/integrations/telegram_bot.py)
  [IDLE] ──/start──► [AWAITING_LANGUAGE]
                            │
                      (/lang_en, /lang_hi, /lang_mr)
                            ▼
                     [AWAITING_PHOTO]
                            │
                      (Photo upload + Magic bytes check)
                            ▼
                    [AWAITING_LOCATION]
                            │
                      (GPS Location: lat/lng validation)
                            ▼
                  [AWAITING_DESCRIPTION]
                            │
                      (Notes or /skip)
                            ▼
              [CREATE SUBMISSION & RUN DUAL-ENGINE VERIFICATION]
                            │
              (GeoBrain-v3 AI + Sentinel-2 Satellite Consensus)
                            ▼
               Return Localized Outcome (EN / HI / MR)
              [Reset Session to IDLE]
```

---

## 2. Core Capabilities Implemented

### 1. Multi-Language Ground Cadre Support
- **Supported Languages**: English (`en`), Hindi (`hi`), Marathi (`mr`).
- **Language Selection**: Prompts user on `/start` or `/lang`.
- **Persistence**: Saved directly to `CadreProfile.preferred_language` in the database.
- **Localized Messages**: Implemented in [telegram_i18n.py](file:///backend/jal_saheli/app/utils/telegram_i18n.py):
  - Welcome & language prompt
  - Photo request instructions
  - GPS location request instructions
  - Processing status
  - Verification outcome (AI score, Satellite score, Consensus score, DBT reward notification)
  - Cadre status report (`/status`)

### 2. Cadre Profile Identity Resolution
- **Primary mapping**: `CadreProfile.telegram_user_id` (BigInteger, unique index).
- **Secondary fallback**: `CadreProfile.telegram_handle` (links existing web-registered cadre).
- **Auto-provisioning**: If a new Telegram user messages the bot, a new `CadreProfile` is created with their Telegram ID and display name.
- **Hijack Protection**: Web-registered handles are only linked if `telegram_user_id` is not already claimed.

### 3. Photo Download & Verification
- **TelegramClient** (`app/integrations/telegram_client.py`):
  - Asynchronous HTTP client wrapping Telegram Bot API.
  - Resolves file path via `getFile` and downloads raw photo bytes.
  - Inspects magic bytes (JPEG/PNG/WebP/HEIC) before saving to local disk storage via `save_photo`.
  - Strict unconfigured handling: If `TELEGRAM_BOT_TOKEN` is missing, logs clear warning and never pretends message delivery occurred.

### 4. Location & Coordinate Validation
- Receives native Telegram GPS location messages.
- Strictly validates latitude ($\in [-90, 90]$) and longitude ($\in [-180, 180]$).
- Rejects malformed coordinates with localized warnings.

### 5. Automatic Observation Type Detection
- Natural language keyword parser in English, Hindi, and Marathi:
  - "check dam", "चेक डैम", "चेक डॅम" $\rightarrow$ `check_dam`
  - "pond", "तालाब", "शेततळे" $\rightarrow$ `farm_pond`
  - "borewell", "बोरवेल", "बोअरवेल" $\rightarrow$ `borewell`
  - "water quality", "गुणवत्ता" $\rightarrow$ `water_quality`
  - "contour trench", "gully plug", "percolation tank", "irrigation", "groundwater"

### 6. Real Database Submission & Dual-Engine Verification
- Creates actual `Submission` record in SQLite/PostgreSQL with:
  - ID generated via `generate_submission_id()` (`GW-XXXXXX`)
  - `channel = "telegram"`
  - Captured coordinates, description, and saved photo URL
- Immediately triggers `run_full_verification()`:
  - GeoBrain-v3 AI vision analysis
  - Sentinel-2 MSI satellite cross-check
  - Consensus calculation: $0.40 \times \text{AI} + 0.60 \times \text{Sat}$
  - If score $\ge 80.0\%$, marks `VERIFIED` and creates DBT incentive credit in `EarningsLedger`.

### 7. Commands Supported
- `/start`: Starts conversation flow, prompts for language.
- `/status`: Returns live aggregated stats from the database (total submissions, verified count, pending count, accuracy rate, credited earnings in INR).
- `/lang`, `/lang_en`, `/lang_hi`, `/lang_mr`: Changes preferred language.
- `/cancel`: Cancels active observation submission and resets state.
- `/help`: Returns localized instructions and command list.

---

## 3. Test Suite & Verification Results

### Summary of Full Test Suite
- **118 passed** across the entire backend test suite in 6.27s (0 failures, 0 errors).
- **29 new tests** in `tests/test_telegram_bot.py`:
  - `TestWebhookSecurity`: Secret token verification and constant-time HMAC checking.
  - `TestStartCommand`: Multi-language prompt on `/start`.
  - `TestLanguageSelection`: English, Hindi, Marathi selection and reprompts.
  - `TestFullSubmissionFlow`: End-to-end photo $\rightarrow$ location $\rightarrow$ description $\rightarrow$ submission $\rightarrow$ consensus verification.
  - `TestCancelCommand`: Mid-flow cancellation.
  - `TestHelpCommand`: Localized command listing.
  - `TestStatusCommand`: Real DB aggregation of count and credited DBT earnings.
  - `TestDuplicateSuppression`: Suppression of duplicate `update_id`.
  - `TestInvalidLocation`: Boundary checking on GPS coordinates.
  - `TestStateMachineEdgeCases`: Handling text when photo expected, idle fallback.
  - `TestCadreMapping`: Telegram user ID persistence and cadre isolation.
  - `TestObservationTypeDetection`: Natural language parsing across 7 observation types.

---

---

# Phase 6: Real AI Analysis Integration

Phase 6 implements the real, provider-agnostic AI vision analysis pipeline for Jal Saheli field submissions.

---

## 1. Architecture

```
ai_service.analyze_submission()          ← single public entry point
        │
        ▼
AIAnalysisService                        ← orchestration layer
  ├── Idempotency check (DB lookup)
  ├── Configuration check
  ├── Bounded retries (MAX_RETRIES=3, exponential back-off)
  ├── Response validation
  └── DB persistence (VerificationEvent + ai_confidence)
        │
        ▼
AIProvider interface (abstract)          ← replaceable contract
        │
        ▼
GenericHTTPAIProvider                    ← concrete implementation
  ├── POST {AI_SERVICE_URL}/predict
  ├── Bearer auth (AI_SERVICE_API_KEY)
  ├── Configurable timeout (AI_REQUEST_TIMEOUT_SECONDS)
  └── Response schema validation
```

---

## 2. Key Design Decisions

### Provider Interface (`AIProvider` ABC)
Any future provider (OpenAI Vision, Vertex AI, on-device model) can be plugged in by implementing two methods: `is_configured()` and `analyze()`. No other file needs to change.

### Structured Error Hierarchy
| Error class | Status code stored | When raised |
|---|---|---|
| `AINotConfiguredError` | `AI_NOT_CONFIGURED` | URL/credentials missing |
| `AIUnavailableError` | `AI_UNAVAILABLE` | Timeout, HTTP error, connection failure |
| `AIResponseError` | `AI_RESPONSE_INVALID` | Schema validation failure |

Errors are **never swallowed** — they are persisted as `VerificationEvent` records so the audit trail is complete even on failures.

### Idempotency
If a successful `AI_OK` VerificationEvent already exists for a submission, the service returns the cached result immediately without re-calling the provider. Safe to call multiple times.

### Retry Policy
- Up to **3 attempts** on `AIUnavailableError` (transient).
- **No retry** on `AINotConfiguredError` or `AIResponseError` (non-transient).
- Exponential back-off: 1s, 2s, 4s between retries.

### Response Validation
All provider responses are validated before storage:
- `result` — non-empty string required
- `confidence` — float, strict range `[0.0, 100.0]`
- `model` — non-empty string required

---

## 3. New Files

| File | Purpose |
|---|---|
| [`app/integrations/ai_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_provider.py) | Abstract `AIProvider` interface + `AIAnalysisResult` dataclass + error hierarchy |
| [`app/integrations/ai_http_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_http_provider.py) | Concrete `GenericHTTPAIProvider` — calls any REST endpoint with Bearer auth |
| [`app/services/ai_analysis_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/ai_analysis_service.py) | `AIAnalysisService` — idempotency, retries, DB persistence, error capture |
| [`tests/test_ai_analysis.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_ai_analysis.py) | 33 tests across all Phase 6 scenarios |

### Modified Files

| File | Change |
|---|---|
| [`app/integrations/ai_client.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_client.py) | Rewritten as thin factory (`get_ai_provider`, `set_ai_provider`, `reset_ai_provider`) + backward-compatible legacy shim |
| [`app/services/ai_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/ai_service.py) | Rewritten to delegate to `AIAnalysisService` |
| `tests/test_verification_pipeline.py` | Inject `_ConfiguredMockProvider` in AI-dependent tests |
| `tests/test_telegram.py` | Inject `_TelegramTestAIProvider` in photo submission test |

---

## 4. Configuration (Environment Variables)

```env
# Required for real AI inference
AI_SERVICE_URL=https://your-ai-provider.example.com

# Optional: Bearer auth header
AI_SERVICE_API_KEY=your-api-key-here

# Optional: Timeout in seconds (default 30)
AI_REQUEST_TIMEOUT_SECONDS=30
```

If `AI_SERVICE_URL` is not set, the service returns `AI_NOT_CONFIGURED` immediately (no external call, no crash). The verification pipeline continues with `ai_confidence = 0.0`.

---

## 5. Test Suite — Phase 6

**33 tests** in `tests/test_ai_analysis.py` covering:

| Group | Tests |
|---|---|
| `TestAIProviderInterface` | Abstract provider enforcement, singleton swap, `AIAnalysisResult.to_dict()` |
| `TestResponseValidation` | 11 cases: missing fields, bad types, out-of-range confidence, boundary values |
| `TestAIAnalysisService` | Success, unconfigured, timeout, HTTP failure, malformed response, idempotency, retry-success on 2nd attempt, ai_confidence not set on failure |
| `TestGenericHTTPAIProvider` | Configured/unconfigured checks, successful HTTP call, timeout → `AIUnavailableError`, non-200 → `AIUnavailableError`, JSON decode failure → `AIResponseError`, auth header injection |
| `TestAnalyzeSubmissionEndpoint` | Endpoint integration with unconfigured + mock provider |

**Full suite: 151 passed, 0 failed (6.89s)**


Phase 5 implements the real, fully functional, multi-lingual Telegram Bot integration for Jal Saheli field cadres, connecting real Telegram users to backend database records and the verification pipeline.

---

## 1. Architecture & Workflow

```
Telegram User
      │
      ▼
Telegram Bot API
      │
      │  HTTPS POST with X-Telegram-Bot-Api-Secret-Token
      ▼
POST /api/jal-saheli/telegram/webhook (or /telegram/webhook)
      │
      ├── 1. Webhook Secret Validation (hmac.compare_digest)
      ├── 2. Duplicate Update Suppression (LRU cache on update_id)
      ├── 3. Identity Resolution (telegram_user_id ↔ CadreProfile)
      │
      ▼
State Machine (app/integrations/telegram_bot.py)
  [IDLE] ──/start──► [AWAITING_LANGUAGE]
                            │
                      (/lang_en, /lang_hi, /lang_mr)
                            ▼
                     [AWAITING_PHOTO]
                            │
                      (Photo upload + Magic bytes check)
                            ▼
                    [AWAITING_LOCATION]
                            │
                      (GPS Location: lat/lng validation)
                            ▼
                  [AWAITING_DESCRIPTION]
                            │
                      (Notes or /skip)
                            ▼
              [CREATE SUBMISSION & RUN DUAL-ENGINE VERIFICATION]
                            │
              (GeoBrain-v3 AI + Sentinel-2 Satellite Consensus)
                            ▼
               Return Localized Outcome (EN / HI / MR)
              [Reset Session to IDLE]
```

---

## 2. Core Capabilities Implemented

### 1. Multi-Language Ground Cadre Support
- **Supported Languages**: English (`en`), Hindi (`hi`), Marathi (`mr`).
- **Language Selection**: Prompts user on `/start` or `/lang`.
- **Persistence**: Saved directly to `CadreProfile.preferred_language` in the database.
- **Localized Messages**: Implemented in [telegram_i18n.py](file:///backend/jal_saheli/app/utils/telegram_i18n.py):
  - Welcome & language prompt
  - Photo request instructions
  - GPS location request instructions
  - Processing status
  - Verification outcome (AI score, Satellite score, Consensus score, DBT reward notification)
  - Cadre status report (`/status`)

### 2. Cadre Profile Identity Resolution
- **Primary mapping**: `CadreProfile.telegram_user_id` (BigInteger, unique index).
- **Secondary fallback**: `CadreProfile.telegram_handle` (links existing web-registered cadre).
- **Auto-provisioning**: If a new Telegram user messages the bot, a new `CadreProfile` is created with their Telegram ID and display name.
- **Hijack Protection**: Web-registered handles are only linked if `telegram_user_id` is not already claimed.

### 3. Photo Download & Verification
- **TelegramClient** (`app/integrations/telegram_client.py`):
  - Asynchronous HTTP client wrapping Telegram Bot API.
  - Resolves file path via `getFile` and downloads raw photo bytes.
  - Inspects magic bytes (JPEG/PNG/WebP/HEIC) before saving to local disk storage via `save_photo`.
  - Strict unconfigured handling: If `TELEGRAM_BOT_TOKEN` is missing, logs clear warning and never pretends message delivery occurred.

### 4. Location & Coordinate Validation
- Receives native Telegram GPS location messages.
- Strictly validates latitude ($\in [-90, 90]$) and longitude ($\in [-180, 180]$).
- Rejects malformed coordinates with localized warnings.

### 5. Automatic Observation Type Detection
- Natural language keyword parser in English, Hindi, and Marathi:
  - "check dam", "चेक डैम", "चेक डॅम" $\rightarrow$ `check_dam`
  - "pond", "तालाब", "शेततळे" $\rightarrow$ `farm_pond`
  - "borewell", "बोरवेल", "बोअरवेल" $\rightarrow$ `borewell`
  - "water quality", "गुणवत्ता" $\rightarrow$ `water_quality`
  - "contour trench", "gully plug", "percolation tank", "irrigation", "groundwater"

### 6. Real Database Submission & Dual-Engine Verification
- Creates actual `Submission` record in SQLite/PostgreSQL with:
  - ID generated via `generate_submission_id()` (`GW-XXXXXX`)
  - `channel = "telegram"`
  - Captured coordinates, description, and saved photo URL
- Immediately triggers `run_full_verification()`:
  - GeoBrain-v3 AI vision analysis
  - Sentinel-2 MSI satellite cross-check
  - Consensus calculation: $0.40 \times \text{AI} + 0.60 \times \text{Sat}$
  - If score $\ge 80.0\%$, marks `VERIFIED` and creates DBT incentive credit in `EarningsLedger`.

### 7. Commands Supported
- `/start`: Starts conversation flow, prompts for language.
- `/status`: Returns live aggregated stats from the database (total submissions, verified count, pending count, accuracy rate, credited earnings in INR).
- `/lang`, `/lang_en`, `/lang_hi`, `/lang_mr`: Changes preferred language.
- `/cancel`: Cancels active observation submission and resets state.
- `/help`: Returns localized instructions and command list.

---

## 3. Test Suite & Verification Results

### Summary of Full Test Suite
- **118 passed** across the entire backend test suite in 6.27s (0 failures, 0 errors).
- **29 new tests** in `tests/test_telegram_bot.py`:
  - `TestWebhookSecurity`: Secret token verification and constant-time HMAC checking.
  - `TestStartCommand`: Multi-language prompt on `/start`.
  - `TestLanguageSelection`: English, Hindi, Marathi selection and reprompts.
  - `TestFullSubmissionFlow`: End-to-end photo $\rightarrow$ location $\rightarrow$ description $\rightarrow$ submission $\rightarrow$ consensus verification.
  - `TestCancelCommand`: Mid-flow cancellation.
  - `TestHelpCommand`: Localized command listing.
  - `TestStatusCommand`: Real DB aggregation of count and credited DBT earnings.
  - `TestDuplicateSuppression`: Suppression of duplicate `update_id`.
  - `TestInvalidLocation`: Boundary checking on GPS coordinates.
  - `TestStateMachineEdgeCases`: Handling text when photo expected, idle fallback.
  - `TestCadreMapping`: Telegram user ID persistence and cadre isolation.
  - `TestObservationTypeDetection`: Natural language parsing across 7 observation types.

---

---

# Phase 6: Real AI Analysis Integration

Phase 6 implements the real, provider-agnostic AI vision analysis pipeline for Jal Saheli field submissions.

---

## 1. Architecture

```
ai_service.analyze_submission()          ← single public entry point
        │
        ▼
AIAnalysisService                        ← orchestration layer
  ├── Idempotency check (DB lookup)
  ├── Configuration check
  ├── Bounded retries (MAX_RETRIES=3, exponential back-off)
  ├── Response validation
  └── DB persistence (VerificationEvent + ai_confidence)
        │
        ▼
AIProvider interface (abstract)          ← replaceable contract
        │
        ▼
GenericHTTPAIProvider                    ← concrete implementation
  ├── POST {AI_SERVICE_URL}/predict
  ├── Bearer auth (AI_SERVICE_API_KEY)
  ├── Configurable timeout (AI_REQUEST_TIMEOUT_SECONDS)
  └── Response schema validation
```

---

## 2. Key Design Decisions

### Provider Interface (`AIProvider` ABC)
Any future provider (OpenAI Vision, Vertex AI, on-device model) can be plugged in by implementing two methods: `is_configured()` and `analyze()`. No other file needs to change.

### Structured Error Hierarchy
| Error class | Status code stored | When raised |
|---|---|---|
| `AINotConfiguredError` | `AI_NOT_CONFIGURED` | URL/credentials missing |
| `AIUnavailableError` | `AI_UNAVAILABLE` | Timeout, HTTP error, connection failure |
| `AIResponseError` | `AI_RESPONSE_INVALID` | Schema validation failure |

Errors are **never swallowed** — they are persisted as `VerificationEvent` records so the audit trail is complete even on failures.

### Idempotency
If a successful `AI_OK` VerificationEvent already exists for a submission, the service returns the cached result immediately without re-calling the provider. Safe to call multiple times.

### Retry Policy
- Up to **3 attempts** on `AIUnavailableError` (transient).
- **No retry** on `AINotConfiguredError` or `AIResponseError` (non-transient).
- Exponential back-off: 1s, 2s, 4s between retries.

### Response Validation
All provider responses are validated before storage:
- `result` — non-empty string required
- `confidence` — float, strict range `[0.0, 100.0]`
- `model` — non-empty string required

---

## 3. New Files

| File | Purpose |
|---|---|
| [`app/integrations/ai_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_provider.py) | Abstract `AIProvider` interface + `AIAnalysisResult` dataclass + error hierarchy |
| [`app/integrations/ai_http_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_http_provider.py) | Concrete `GenericHTTPAIProvider` — calls any REST endpoint with Bearer auth |
| [`app/services/ai_analysis_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/ai_analysis_service.py) | `AIAnalysisService` — idempotency, retries, DB persistence, error capture |
| [`tests/test_ai_analysis.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_ai_analysis.py) | 33 tests across all Phase 6 scenarios |

### Modified Files

| File | Change |
|---|---|
| [`app/integrations/ai_client.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/ai_client.py) | Rewritten as thin factory (`get_ai_provider`, `set_ai_provider`, `reset_ai_provider`) + backward-compatible legacy shim |
| [`app/services/ai_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/ai_service.py) | Rewritten to delegate to `AIAnalysisService` |
| `tests/test_verification_pipeline.py` | Inject `_ConfiguredMockProvider` in AI-dependent tests |
| `tests/test_telegram.py` | Inject `_TelegramTestAIProvider` in photo submission test |

---

## 4. Configuration (Environment Variables)

```env
# Required for real AI inference
AI_SERVICE_URL=https://your-ai-provider.example.com

# Optional: Bearer auth header
AI_SERVICE_API_KEY=your-api-key-here

# Optional: Timeout in seconds (default 30)
AI_REQUEST_TIMEOUT_SECONDS=30
```

If `AI_SERVICE_URL` is not set, the service returns `AI_NOT_CONFIGURED` immediately (no external call, no crash). The verification pipeline continues with `ai_confidence = 0.0`.

---

## 5. Test Suite — Phase 6

**33 tests** in `tests/test_ai_analysis.py` covering:

| Group | Tests |
|---|---|
| `TestAIProviderInterface` | Abstract provider enforcement, singleton swap, `AIAnalysisResult.to_dict()` |
| `TestResponseValidation` | 11 cases: missing fields, bad types, out-of-range confidence, boundary values |
| `TestAIAnalysisService` | Success, unconfigured, timeout, HTTP failure, malformed response, idempotency, retry-success on 2nd attempt, ai_confidence not set on failure |
| `TestGenericHTTPAIProvider` | Configured/unconfigured checks, successful HTTP call, timeout → `AIUnavailableError`, non-200 → `AIUnavailableError`, JSON decode failure → `AIResponseError`, auth header injection |
| `TestAnalyzeSubmissionEndpoint` | Endpoint integration with unconfigured + mock provider |


---

---

# Phase 7: Real Satellite / Geospatial Data Integration

Phase 7 implements the real satellite imagery cross-check integration using the **Copernicus Data Space Ecosystem (CDSE)** STAC API for Sentinel-2 L2A data.

## 1. Provider Selection: Copernicus CDSE
CDSE was chosen over commercial/mirror alternatives (e.g., Sentinel Hub, Planetary Computer) because:
1. **Official ESA Source:** Authoritative, globally complete archive.
2. **Open Access Metadata:** STAC metadata search requires no OAuth/credentials. We only need metadata (cloud cover, water percentage) to compute confidence, not raw pixel downloads.
3. **High Revisit Rate:** Sentinel-2 passes over India every 5 days, yielding a high probability of a recent clear scene.

---

# Phase 8: Real Verification Pipeline

Integrated the final state machine and business rules for verification, replacing the simple weighted average formula with deterministic, defensible rules.

- **Asynchronous Execution:** Shifted the verification to a FastAPI background task to prevent Telegram webhook timeouts, immediately responding with a "Processing..." message.
- **Defensible Rules (5 States):**
  - **Rule 1:** AI or Satellite API Unavailable → `PROCESSING/PENDING`
  - **Rule 2:** AI clearly rejects the image → `REJECTED`
  - **Rule 3:** Conflicting evidence (AI says yes, Satellite says no) → `PROCESSING/PENDING` (needs human review)
  - **Rule 4:** Dual confirmation (both AI & Sat agree) → `VERIFIED`
  - **Rule 5:** Inconclusive/mediocre evidence → `PROCESSING/PENDING`
- **Auditability:** Expanded `VerificationEvent` logs with detailed reason text alongside confidence scores.
- **Localized Final Notifications:** The bot pushes the final outcome directly back to the user via Telegram's API upon completion.

---

## 2. Architecture

```text
satellite_service.verify_submission()
        │
        ▼
SatelliteVerificationService             ← Orchestrates retries, idempotency, DB writes
        │
        ▼
SatelliteProvider (Interface)            ← Replaceable contract
        │
        ▼
CDSESatelliteProvider (Primary)          ← STAC API query engine (open access)
  ├── POST https://stac.dataspace.copernicus.eu/v1/search
  ├── bbox = ±0.1° (~11km square)
  ├── time = [capture_time - 30d, capture_time]
  ├── filter = eo:cloud_cover <= 80%
  └── Extract: eo:cloud_cover, s2:water_percentage, datetime
```

---

## 3. Confidence Formula

Confidence is strictly derived from **real provider data** — no hardcoded fallback values:
```python
confidence = 100.0
confidence -= cloud_cover_pct * 0.5          # Penalty for cloud cover
confidence -= min(temporal_gap_days * 0.3, 15)  # Penalty for older scenes
if water_pct is not None:
    confidence += min(water_pct * 0.4, 10)   # Bonus for confirmed surface water
confidence = max(30.0, min(confidence, 98.0))  # Clamp to [30, 98]
```

---

## 4. Structured Error Hierarchy

| Error code | When it happens | Retried? |
|---|---|---|
| `SATELLITE_NOT_CONFIGURED` | Required credentials missing (N/A for open CDSE) | No |
| `SATELLITE_UNAVAILABLE` | HTTP 5xx, timeout, connection drop | Yes (Max 3) |
| `NO_SATELLITE_DATA` | 0 matching scenes found in 30-day window | No |
| `SATELLITE_OK` | Scene found, real confidence computed | N/A |

---

## 5. New Files

| File | Purpose |
|---|---|
| [`satellite_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/satellite_provider.py) | Abstract interface + `SatelliteVerificationResult` + error hierarchy |
| [`cdse_satellite_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/cdse_satellite_provider.py) | Concrete CDSE STAC provider (primary) |
| [`planetary_computer_provider.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/planetary_computer_provider.py) | Concrete MPC STAC provider (fallback) |
| [`satellite_verification_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/satellite_verification_service.py) | Idempotency, retries, and persistence orchestrator |
| [`test_satellite_analysis.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_satellite_analysis.py) | 35 comprehensive integration/unit tests |

### Modified Files
| File | Change |
|---|---|
| [`satellite_client.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/integrations/satellite_client.py) | Rewritten as singleton provider factory + backward compat shim |
| [`satellite_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/satellite_service.py) | Rewritten to delegate to orchestrator |
| `test_verification_pipeline.py` | Injected configured mock satellite provider to prevent network calls in CI |

---

## 7. Phase 8 Test Suite & Full System Verification
- **5 new defensible rule tests** added in [`tests/test_verification_rules.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_verification_rules.py):
  - Rule 1: Provider Unavailable (`AI_UNAVAILABLE` / `SATELLITE_NOT_CONFIGURED`) $\rightarrow$ `PENDING`
  - Rule 2: AI Rejected (confidence < 30%) $\rightarrow$ `REJECTED`
  - Rule 3: Conflicting Evidence (AI high, Satellite low or vice-versa) $\rightarrow$ `PENDING`
  - Rule 4: Dual Confirmation (AI $\ge$ 60%, Satellite $\ge$ 60%, Final $\ge$ 75%) $\rightarrow$ `VERIFIED` + DBT Credit
  - Rule 5: Default / Inconclusive evidence $\rightarrow$ `PENDING`
- **Asynchronous Webhook & Concurrency Hardening**:
  - SQLite async engine configured with `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=30000` to prevent concurrent write contention.
  - Background verification tasks cleanly managed and tracked with teardown awaiting.
  - Full background session isolation using `get_async_sessionmaker()`.
- **Full Backend Test Suite: 189 passed, 0 failures, 0 errors in 12.23s.**
- **Frontend Quality:** 0 warnings and 0 errors across all 26 Jal Saheli modules via `npx oxlint`. Production build compiled cleanly in 2.44s.

---

---

# Phase 9: Real Earnings and Notification System

Phase 9 implements the real earnings governance policy and multi-lingual lifecycle notification system for Jal Saheli field cadres.

## 1. Earnings Architecture

```text
Verification Decision (VERIFIED)
           │
           ▼
     Eligibility Check
           │
           ▼
EarningsPolicy.evaluate(submission)
   ├── Check status == VERIFIED (REJECTED/PENDING receive ₹0)
   ├── Resolve reward schedule by observation_type
   └── Returns EarningsEligibilityResult(is_eligible, amount, reason)
           │
           ▼
EarningsService.process_submission_earnings(submission, db)
   ├── Idempotency Check: Query EarningsLedger by submission_id
   │     └── Exists? → Return existing (no duplicate payout)
   ├── Insert new EarningsLedger entry (TXN-XXXXXX, status=CREDITED)
   └── Returns (ledger_entry, is_new)
           │
           ▼
NotificationService: EARNING_RECORDED (UPI / Jan Dhan DBT)
```

## 2. Multi-Lingual Notification System

Lifecycle notifications are delivered to field cadres across 3 supported languages: **English (`en`)**, **Hindi (`hi`)**, and **Marathi (`mr`)**.

| Notification Event | Trigger Condition | Content / Highlights |
|---|---|---|
| `SUBMISSION_RECEIVED` | Observation received via Telegram / Web | Submission ID (`GW-XXXXXX`), observation type label |
| `PROCESSING_STARTED` | Verification background task begins | Notification that AI and Satellite models are analyzing the scene |
| `VERIFICATION_COMPLETED` | Dual-engine consensus reached | Detailed confidence scores, consensus result, and status badge |
| `SUBMISSION_PENDING` | Rule 1, 3, or 5 triggered | Reason for manual review, zero earnings credited |
| `SUBMISSION_REJECTED` | Rule 2 triggered (AI confidence < 30%) | Reason for rejection, zero earnings credited |
| `EARNING_RECORDED` | Verified observation credited | Exact INR reward (₹15–₹25), transaction ID (`TXN-XXXXXX`), Jan Dhan note |

### Fault-Tolerant Delivery
The `NotificationService.notify` method wraps network calls to Telegram in a safe exception handler. If Telegram's Bot API times out, returns HTTP 4xx/5xx, or is unconfigured, the failure is logged and returns `False` **without aborting or rolling back the database transaction**.

## 3. New Files Created

| File | Purpose |
|---|---|
| [`app/services/earnings_policy.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/earnings_policy.py) | `EarningsPolicy` ABC, `EarningsEligibilityResult`, and `StandardEarningsPolicy` |
| [`app/services/notification_service.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/app/services/notification_service.py) | `NotificationService`, `NotificationEvent` enum, non-blocking delivery |
| [`tests/test_earnings_notifications.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_earnings_notifications.py) | 13 comprehensive tests covering all required Phase 9 scenarios |

## 4. Phase 9 Test Suite & Full System Verification

- **13 new tests** added in [`tests/test_earnings_notifications.py`](file:///c:/Users/shubh/Desktop/Geospatial-SIH/backend/jal_saheli/tests/test_earnings_notifications.py):
  - `TestEarningsPolicy`: Verified eligible, rejected ineligible, pending ineligible, unknown type fallback.
  - `TestEarningsServiceIdempotency`: Duplicate verification cannot create duplicate earnings or inflate ledger balances.
  - `TestLifecycleNotifications`: Verified earnings dispatch, rejected notification with reason, pending notification, and failure resilience.
  - `TestMultiLanguageSelection`: Formatted templates in English, Hindi, and Marathi, and language routing.
- **Full Backend Test Suite: 202 passed in 13.02s (0 failures, 0 errors).**
- **Frontend Quality:** 0 warnings and 0 errors across all 26 files with `oxlint`. Production build compiled in 1.69s.


