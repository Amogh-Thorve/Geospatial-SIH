"""
Deprecated second-process entrypoint.

The unified application is `backend/jal_saheli` (`app.main:app` on port 8000).
This module re-exports that same app so `uvicorn main:app` from `backend/`
does not start a separate Geo AI server.
"""

from __future__ import annotations

import sys
from pathlib import Path

_JAL = Path(__file__).resolve().parent / "jal_saheli"
if str(_JAL) not in sys.path:
    sys.path.insert(0, str(_JAL))

from app.main import app  # noqa: E402

__all__ = ["app"]
