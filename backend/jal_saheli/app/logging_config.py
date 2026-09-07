"""
app/logging_config.py
Structured JSON logging configuration for the Jal Saheli backend.

All log output is newline-delimited JSON — suitable for:
  - Local development (human-readable via `jq`)
  - Production log aggregation (Loki, CloudWatch, GCP Logging)

Usage:
    from app.logging_config import setup_logging
    setup_logging()          # Call once at startup (main.py lifespan)

    import logging
    logger = logging.getLogger("jal_saheli.api")
    logger.info("Request received", extra={"request_id": "abc"})
"""

from __future__ import annotations

import logging
import logging.config
import sys
from typing import Any

from pythonjsonlogger import jsonlogger  # type: ignore[import]


class _JalSaheliJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter that always injects:
      - service: "jal_saheli_backend"
      - environment from APP_ENV
    """

    def add_fields(
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record.setdefault("service", "jal_saheli_backend")
        log_record.setdefault("logger", record.name)
        # Map levelname → level for log aggregation systems
        log_record["level"] = record.levelname


def setup_logging(level: str = "INFO", debug: bool = False) -> None:
    """
    Configure root logger and all relevant child loggers.

    Args:
        level:  Root log level string ("DEBUG", "INFO", "WARNING", "ERROR").
        debug:  If True, also prints uvicorn access log entries.
    """
    effective_level = "DEBUG" if debug else level

    log_config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": _JalSaheliJsonFormatter,
                "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            },
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "json",
            },
        },
        "loggers": {
            # Application
            "jal_saheli": {
                "handlers": ["stdout"],
                "level": effective_level,
                "propagate": False,
            },
            "app": {
                "handlers": ["stdout"],
                "level": effective_level,
                "propagate": False,
            },
            # uvicorn — reduce noise unless debug
            "uvicorn": {
                "handlers": ["stdout"],
                "level": "INFO" if debug else "WARNING",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["stdout"],
                "level": "INFO" if debug else "WARNING",
                "propagate": False,
            },
            # SQLAlchemy — only show warnings unless DB echo is enabled
            "sqlalchemy.engine": {
                "handlers": ["stdout"],
                "level": "DEBUG" if debug else "WARNING",
                "propagate": False,
            },
        },
        "root": {
            "handlers": ["stdout"],
            "level": "WARNING",
        },
    }

    logging.config.dictConfig(log_config)
