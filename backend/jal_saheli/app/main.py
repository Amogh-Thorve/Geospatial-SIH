"""
app/main.py
Jal Saheli Backend — FastAPI application entry point.

Responsibilities:
  1. Configure structured logging
  2. Load settings
  3. Set up lifespan (startup/shutdown hooks)
  4. Create FastAPI app instance
  5. Register CORS middleware
  6. Register global exception handlers
  7. Mount API routers
  8. Expose app for Uvicorn

Run development server:
    cd backend/jal_saheli
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Run with custom env file:
    ENV_FILE=.env.production uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ── Logging must be set up FIRST, before any other imports that log ──────────
# We do a minimal bootstrap here; setup_logging() is called in lifespan
# with full settings once config is loaded.
logging.basicConfig(level=logging.WARNING)

from app import models as _models  # noqa: F401  — register ORM metadata
from app.api.router import root_router
from app.config import get_settings
from app.db import close_db, get_session, init_db
from app.logging_config import setup_logging
from app.services.seed import seed_if_empty

logger = logging.getLogger("jal_saheli.main")


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan (startup + shutdown)
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan context manager.

    Executed once on startup and once on shutdown.
    All initialisation that requires async belongs here.
    """
    settings = get_settings()

    # 1. Configure logging with final settings
    setup_logging(level="DEBUG" if settings.app.debug else "INFO", debug=settings.app.debug)

    logger.info(
        "Jal Saheli backend starting",
        extra={
            "env": settings.app.env,
            "version": settings.app.version,
            "debug": settings.app.debug,
        },
    )

    # 2. Initialise database
    #    In development (SQLite) we auto-create tables.
    #    In production use Alembic migrations (create_tables=False).
    create_tables = settings.app.env in ("development", "test")
    try:
        await init_db(
            database_url=settings.database.url,
            pool_size=settings.database.pool_size,
            max_overflow=settings.database.max_overflow,
            echo=settings.database.echo,
            create_tables=create_tables,
        )
    except Exception as exc:
        logger.error("Failed to initialise database during startup", extra={"error": str(exc)})
        # Do NOT raise — allow the server to start so /health can report degraded state
    else:
        try:
            async with get_session() as session:
                if settings.app.seed_demo_data:
                    await seed_if_empty(session)
                else:
                    from app.services.seed import purge_demo_seed

                    removed = await purge_demo_seed(session)
                    if removed:
                        logger.info(
                            "Removed previously seeded demo records",
                            extra={"removed": removed},
                        )
                    else:
                        logger.info("Demo seed disabled (SEED_DEMO_DATA=false) — empty honest database")
        except Exception as exc:
            logger.error("Failed during seed/purge startup step", extra={"error": str(exc)})

    # 3. Log optional integration status
    if not settings.telegram.configured:
        logger.info("Telegram bot not configured (TELEGRAM_BOT_TOKEN not set) — bot disabled")
    if not settings.ai.configured:
        logger.info("AI service not configured (AI_SERVICE_URL not set) — using stub")
    if not settings.satellite.configured:
        logger.info("Satellite service not configured — using stub")

    try:
        from app.geoai.engine import load_geoai_assets

        load_geoai_assets()
    except Exception as exc:
        logger.error("Failed to load Geo AI assets", extra={"error": str(exc)})

    logger.info(
        "GeoWise unified backend ready",
        extra={"host": settings.app.host, "port": settings.app.port},
    )

    yield  # ← application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Jal Saheli backend shutting down")
    await close_db()
    logger.info("Shutdown complete")


# ─────────────────────────────────────────────────────────────────────────────
# Application factory
# ─────────────────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Separated into a factory function to support testing
    (each test can call create_app() to get a fresh instance).
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app.title,
        version=settings.app.version,
        description=(
            "GeoWise unified API: Jal Saheli, GIS, verification, and Ved Geo AI "
            "on a single FastAPI process. Optional Bhuvan WMS via BHUVAN_ENABLED."
        ),
        docs_url="/docs" if settings.app.debug else None,
        redoc_url="/redoc" if settings.app.debug else None,
        openapi_url="/openapi.json" if settings.app.debug else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ── Exception handlers ───────────────────────────────────────────────────

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """
        Return structured 422 errors that are readable by frontend clients.
        Never expose internal stack traces.
        """
        logger.warning(
            "Request validation error",
            extra={"path": str(request.url), "errors": exc.errors()},
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "validation_error",
                "message": "Request payload validation failed",
                "detail": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """
        Catch-all for unhandled exceptions.
        Logs full details server-side; returns safe generic message to client.
        """
        if isinstance(exc, StarletteHTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        logger.error(
            "Unhandled exception",
            extra={"path": str(request.url), "error": str(exc)},
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again later.",
            },
        )

    # ── Routers ──────────────────────────────────────────────────────────────
    app.include_router(root_router)

    return app


# ── Module-level app instance (used by uvicorn) ──────────────────────────────
app = create_app()
