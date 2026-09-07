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
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("jal_saheli.db")

_NULLABLE_RELAX = {
    "watershed_features": ("confidence",),
    "analysis_results": ("confidence",),
    "verification_tasks": ("confidence",),
    "recommendations": ("suitability",),
    "feedback_records": ("confidence",),
}


def _relax_legacy_not_null(sync_conn: Any) -> None:
    """Allow NULL confidence/suitability on existing SQLite/Postgres tables."""
    dialect = sync_conn.dialect.name
    if dialect == "sqlite":
        sync_conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        for table, cols in _NULLABLE_RELAX.items():
            info = sync_conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
            if not info:
                continue
            needs = any(row[1] in cols and row[3] for row in info)
            if not needs:
                continue
            pieces: list[str] = []
            names: list[str] = []
            for _cid, name, typ, notnull, dflt, pk in info:
                names.append(f'"{name}"')
                nn = " NOT NULL" if notnull and name not in cols else ""
                default = f" DEFAULT {dflt}" if dflt is not None else ""
                key = " PRIMARY KEY" if pk else ""
                pieces.append(f'"{name}" {typ or "FLOAT"}{key}{nn}{default}')
            tmp = f"{table}__nullable"
            sync_conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{tmp}"')
            sync_conn.exec_driver_sql(f'CREATE TABLE "{tmp}" ({", ".join(pieces)})')
            cols_csv = ", ".join(names)
            sync_conn.exec_driver_sql(
                f'INSERT INTO "{tmp}" ({cols_csv}) SELECT {cols_csv} FROM "{table}"'
            )
            sync_conn.exec_driver_sql(f'DROP TABLE "{table}"')
            sync_conn.exec_driver_sql(f'ALTER TABLE "{tmp}" RENAME TO "{table}"')
            logger.info("Relaxed NOT NULL on SQLite table %s", table)
        sync_conn.exec_driver_sql("PRAGMA foreign_keys=ON")
        return
    if dialect in {"postgresql", "postgres"}:
        statements = [
            "ALTER TABLE watershed_features ALTER COLUMN confidence DROP NOT NULL",
            "ALTER TABLE analysis_results ALTER COLUMN confidence DROP NOT NULL",
            "ALTER TABLE verification_tasks ALTER COLUMN confidence DROP NOT NULL",
            "ALTER TABLE recommendations ALTER COLUMN suitability DROP NOT NULL",
            "ALTER TABLE feedback_records ALTER COLUMN confidence DROP NOT NULL",
        ]
        for stmt in statements:
            try:
                sync_conn.exec_driver_sql(stmt)
            except Exception:
                logger.debug("Skip schema relax: %s", stmt)


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
        engine = create_async_engine(
            database_url,
            echo=echo,
            connect_args=connect_args,
        )
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
            await conn.run_sync(_relax_legacy_not_null)
        logger.info("Database tables created (create_tables=True)")

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
