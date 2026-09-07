"""
app/schemas/auth.py
Auth request/response schemas.

Registration: phone + name → create cadre + return JWT
Login: phone → return JWT if cadre exists
"""
from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator


_PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")


class RegisterRequest(BaseModel):
    """Create a new cadre profile."""
    phone: str = Field(
        description="Phone number in E.164 or local format (e.g. +919876543210 or 9876543210)",
        examples=["+919876543210"],
    )
    name: str = Field(min_length=2, max_length=120, description="Cadre full name")
    village: str | None = Field(default=None, max_length=120, description="Village/block name")
    telegram_handle: str | None = Field(default=None, max_length=80, description="Telegram @handle")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip().replace(" ", "").replace("-", "")
        if not _PHONE_RE.match(cleaned):
            raise ValueError("Invalid phone number. Use format: +919876543210 or 9876543210")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be blank")
        return stripped


class LoginRequest(BaseModel):
    """Login with phone. Returns JWT if cadre is registered."""
    phone: str = Field(description="Registered phone number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return v.strip().replace(" ", "").replace("-", "")


class TokenResponse(BaseModel):
    """JWT access token response."""
    access_token: str
    token_type: str = "bearer"
    cadre_id: str
    name: str
    expires_in: int = Field(description="Token lifetime in seconds")
