"""
app/utils/rate_limiter.py
In-memory sliding window rate limiter for API endpoints.

Protects against:
  - Brute force attacks on /auth/login and /auth/register
  - Automated flood attacks on POST /submissions
  - DoS on general API endpoints
"""
from __future__ import annotations

import collections
import logging
import time
from typing import Callable

from fastapi import HTTPException, Request, status

logger = logging.getLogger("jal_saheli.rate_limiter")


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter storing hit timestamps in a FIFO deque.
    """

    def __init__(self) -> None:
        # Mapping: key -> deque of timestamps
        self._records: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)
        self.enabled: bool = True

    def is_allowed(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Check whether the request is allowed within the sliding window.

        Returns:
            (allowed: bool, retry_after: int)
        """
        if not self.enabled:
            return True, 0

        now = time.time()
        window_start = now - window_seconds
        q = self._records[key]

        # Prune timestamps outside current window
        while q and q[0] <= window_start:
            q.popleft()

        if len(q) >= limit:
            retry_after = max(1, int(window_seconds - (now - q[0])))
            return False, retry_after

        q.append(now)
        return True, 0

    def reset(self) -> None:
        """Clear all rate limit state (useful in tests)."""
        self._records.clear()


# Global limiter singleton
limiter = SlidingWindowRateLimiter()


def get_client_identifier(request: Request) -> str:
    """
    Extract unique client identifier:
    Prefers Authorization header (for authenticated cadres)
    Falls back to X-Forwarded-For or client.host.
    """
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token_hash = str(hash(auth[-16:]))
        return f"auth:{token_hash}"

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        return f"ip:{client_ip}"

    if request.client and request.client.host:
        return f"ip:{request.client.host}"

    return "ip:unknown"


def rate_limit(limit: int, window_seconds: int = 60) -> Callable:
    """
    FastAPI dependency factory for applying rate limits to route handlers.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit(10, 60))])
    """
    async def dependency(request: Request) -> None:
        if not limiter.enabled:
            return

        from app.config import get_settings
        settings = get_settings()

        # In test environment, bypass rate limiting unless explicitly tested
        # via the 'X-Test-Rate-Limit: true' request header
        if settings.app.env == "test" and request.headers.get("X-Test-Rate-Limit") != "true":
            return

        client_id = get_client_identifier(request)
        path_key = f"{client_id}:{request.url.path}"
        allowed, retry_after = limiter.is_allowed(path_key, limit, window_seconds)

        if not allowed:
            logger.warning(
                "Rate limit exceeded",
                extra={"client": client_id, "path": request.url.path, "retry_after": retry_after},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Please try again after {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
