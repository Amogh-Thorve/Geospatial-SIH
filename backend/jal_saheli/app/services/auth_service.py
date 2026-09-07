"""
app/services/auth_service.py
Cadre registration and login business logic.
"""
from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import CadreProfile
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.utils.auth import create_access_token

logger = logging.getLogger("jal_saheli.services.auth")


async def register_cadre(req: RegisterRequest, db: AsyncSession) -> TokenResponse:
    """
    Register a new cadre. Raises ValueError if phone already exists.
    """
    result = await db.execute(
        select(CadreProfile).where(CadreProfile.phone == req.phone)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError(f"Phone {req.phone} is already registered. Use login instead.")

    cadre = CadreProfile(
        name=req.name,
        phone=req.phone,
        village=req.village,
        telegram_handle=req.telegram_handle,
    )
    db.add(cadre)
    await db.flush()   # get auto-generated id without committing
    await db.refresh(cadre)

    token, expires_in = create_access_token(cadre.id, cadre.phone)
    logger.info("Cadre registered", extra={"cadre_id": cadre.id, "phone": cadre.phone})

    return TokenResponse(
        access_token=token,
        cadre_id=cadre.id,
        name=cadre.name,
        expires_in=expires_in,
    )


async def login_cadre(req: LoginRequest, db: AsyncSession) -> TokenResponse:
    """
    Login an existing cadre by phone. Raises LookupError if not found.
    """
    result = await db.execute(
        select(CadreProfile).where(CadreProfile.phone == req.phone)
    )
    cadre = result.scalar_one_or_none()
    if cadre is None:
        raise LookupError(f"No cadre registered with phone {req.phone}. Please register first.")

    token, expires_in = create_access_token(cadre.id, cadre.phone)
    logger.info("Cadre login", extra={"cadre_id": cadre.id})

    return TokenResponse(
        access_token=token,
        cadre_id=cadre.id,
        name=cadre.name,
        expires_in=expires_in,
    )
