"""
app/api/auth.py
Cadre authentication routes (Register & Login).
Issues signed JWT tokens for authenticating /api/jal-saheli/* requests.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services import auth_service
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger("jal_saheli.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Jal Saheli cadre",
    dependencies=[Depends(rate_limit(10, 60))],
)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """
    Register a new cadre profile and issue an initial JWT access token.
    Fails if the phone number is already registered.
    """
    try:
        return await auth_service.register_cadre(req, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "conflict", "message": str(exc)},
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login cadre with phone number",
    dependencies=[Depends(rate_limit(10, 60))],
)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """
    Login with registered phone number and return a JWT access token.
    Fails if the phone number is not registered.
    """
    try:
        return await auth_service.login_cadre(req, db)
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": str(exc)},
        ) from exc
