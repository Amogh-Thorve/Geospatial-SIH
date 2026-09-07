"""
app/db/database.py
Async SQLAlchemy engine, session factory, and base declarative model.

Supports:
  - PostgreSQL via asyncpg (production)
  - SQLite via aiosqlite (development / CI)

Usage:
    # In a FastAPI dependency:
    async def get_db():
        async with async_session() as session:
            yield session

    # In lifespan (startup/shutdown):
    await init_db()
    await close_db()
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text, event

logger = logging.getLogger("jal_saheli.db")

# Module-level singletons (initialised in init_db)
_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    """
    Base class for all ORM models.

    Subclass this to define database tables:
        class CadreProfile(Base):
            __tablename__ = "cadre_profiles"
            id: Mapped[str] = mapped_column(primary_key=True)
            ...
    """


def _build_engine(database_url: str, pool_size: int, max_overflow: int, echo: bool) -> AsyncEngine:
    """
    Create an async SQLAlchemy engine.

    SQLite and PostgreSQL require different kwargs —
    connection pool arguments are not applicable to SQLite.
    """
    is_sqlite = database_url.startswith("sqlite")

    connect_args: dict = {}
    if is_sqlite:
        # SQLite requires check_same_thread=False for async usage
        connect_args["check_same_thread"] = False
        connect_args["timeout"] = 60
        engine = create_async_engine(
            database_url,
            echo=echo,
            connect_args=connect_args,
        )

        @event.listens_for(engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=60000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
    else:
        engine = create_async_engine(
            database_url,
            echo=echo,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_pre_ping=True,   # Detect stale connections
        )

    return engine


async def init_db(
    database_url: str,
    pool_size: int = 10,
    max_overflow: int = 20,
    echo: bool = False,
    create_tables: bool = False,
) -> None:
    """
    Initialise the async engine and session factory.

    Call this once during FastAPI lifespan startup.

    Args:
        database_url:  Async SQLAlchemy connection string.
        pool_size:     Connection pool size (PostgreSQL only).
        max_overflow:  Max overflow connections (PostgreSQL only).
        echo:          Log all SQL statements (debug only).
        create_tables: If True, run CREATE TABLE for all ORM models.
                       Use False in production (rely on Alembic migrations).
    """
    global _engine, _async_session_factory

    logger.info("Initialising database engine", extra={"url_scheme": database_url.split("://")[0]})

    _engine = _build_engine(database_url, pool_size, max_overflow, echo)

    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )

    if create_tables:
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created (create_tables=True)")

    if database_url.startswith("sqlite"):
        async with _engine.begin() as conn:
            await conn.execute(text("PRAGMA journal_mode=WAL"))
            await conn.execute(text("PRAGMA busy_timeout=30000"))

    # Smoke-test the connection
    try:
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified")
    except Exception as exc:
        logger.error("Database connection failed", extra={"error": str(exc)})
        raise


async def close_db() -> None:
    """
    Dispose the engine connection pool.
    Call during FastAPI lifespan shutdown.
    """
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        logger.info("Database engine disposed")


def get_async_sessionmaker() -> async_sessionmaker[AsyncSession] | None:
    """Return the global session factory for background tasks."""
    return _async_session_factory


async def check_db_connection() -> bool:
    """
    Lightweight health check — returns True if DB is reachable, False otherwise.
    Does NOT raise; intended for /health endpoint use.
    """
    if _engine is None:
        return False
    try:
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("Database health check failed", extra={"error": str(exc)})
        return False


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager yielding a database session.

    Example:
        async with get_session() as session:
            result = await session.execute(select(CadreProfile))
    """
    if _async_session_factory is None:
        raise RuntimeError("Database not initialised. Call init_db() first.")
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an AsyncSession.

    Usage in a route:
        async def my_route(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    if _async_session_factory is None:
        raise RuntimeError("Database not initialised.")
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
