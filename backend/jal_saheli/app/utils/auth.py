"""
app/utils/auth.py
JWT creation, decoding, and FastAPI dependency for authenticated routes.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.db.database import get_db_session

logger = logging.getLogger("jal_saheli.auth")

_bearer = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# Token creation
# ─────────────────────────────────────────────────────────────────────────────

def create_access_token(
    cadre_id: str,
    phone: str,
    expires_delta: timedelta | None = None,
) -> tuple[str, int]:
    """
    Create a signed JWT access token.

    Returns:
        (token_string, expire_seconds)
    """
    settings = get_settings()
    if expires_delta is not None:
        expire_at = datetime.now(timezone.utc) + expires_delta
        expire_seconds = int(expires_delta.total_seconds())
    else:
        expire_minutes = settings.auth.access_token_expire_minutes
        expire_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
        expire_seconds = expire_minutes * 60

    payload = {
        "sub": cadre_id,
        "phone": phone,
        "exp": expire_at,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(
        payload,
        settings.auth.jwt_secret_key,
        algorithm=settings.auth.jwt_algorithm,
    )
    return token, expire_seconds


def create_expired_token(cadre_id: str, phone: str) -> str:
    """
    Create an intentionally expired JWT access token for security testing.
    """
    settings = get_settings()
    expire_at = datetime.now(timezone.utc) - timedelta(minutes=15)
    payload = {
        "sub": cadre_id,
        "phone": phone,
        "exp": expire_at,
        "iat": datetime.now(timezone.utc) - timedelta(minutes=30),
    }
    return jwt.encode(
        payload,
        settings.auth.jwt_secret_key,
        algorithm=settings.auth.jwt_algorithm,
    )


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT. Raises JWTError or ExpiredSignatureError on failure.
    """
    settings = get_settings()
    return jwt.decode(
        token,
        settings.auth.jwt_secret_key,
        algorithms=[settings.auth.jwt_algorithm],
    )


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI dependency
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_cadre(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: AsyncSession = Depends(get_db_session),
):
    """
    FastAPI dependency: extract and validate JWT, return CadreProfile.

    Usage in routes:
        async def my_route(cadre = Depends(get_current_cadre)):
            ...
    """
    from app.models.profile import CadreProfile  # local import avoids circular

    _unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"success": False, "error": "unauthorized", "message": "Invalid or missing token"},
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise _unauthorized

    try:
        payload = decode_token(credentials.credentials)
        cadre_id: str = payload.get("sub", "")
        if not cadre_id:
            raise _unauthorized
    except ExpiredSignatureError as exc:
        logger.warning("JWT token expired", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "token_expired",
                "message": "Access token has expired. Please log in again.",
            },
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The token has expired"'},
        )
    except JWTError as exc:
        logger.warning("JWT decode failed", extra={"error": str(exc)})
        raise _unauthorized

    result = await db.execute(select(CadreProfile).where(CadreProfile.id == cadre_id))
    cadre = result.scalar_one_or_none()
    if cadre is None:
        raise _unauthorized

    return cadre

