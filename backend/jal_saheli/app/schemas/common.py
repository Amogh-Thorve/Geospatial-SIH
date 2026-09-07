"""
app/schemas/common.py
Shared response envelope schemas.

All API responses use a consistent structure:

  Single resource:
    { "success": true, "data": {...} }

  List (paginated):
    { "success": true, "data": [...], "meta": { "total": N, "page": 1, "page_size": 20, "pages": X } }

  Error (handled by exception handlers, not here):
    { "success": false, "error": "code", "message": "..." }
"""
from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int = Field(description="Total number of records matching the query")
    page: int = Field(description="Current page (1-indexed)")
    page_size: int = Field(description="Records per page")
    pages: int = Field(description="Total number of pages")


class DataResponse(BaseModel, Generic[T]):
    """Single-resource response envelope."""
    success: bool = True
    data: T


class PagedResponse(BaseModel, Generic[T]):
    """Paginated list response envelope."""
    success: bool = True
    data: list[T]
    meta: PaginationMeta


def paged(
    items: list[Any],
    total: int,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    """
    Build a paginated response dict.

    Args:
        items:     The current page's records.
        total:     Total matching records across all pages.
        page:      Current page number (1-indexed).
        page_size: Records per page.
    """
    pages = max(1, (total + page_size - 1) // page_size)
    return {
        "success": True,
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        },
    }


def single(data: Any) -> dict[str, Any]:
    """Build a single-resource response dict."""
    return {"success": True, "data": data}
