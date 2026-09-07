"""
app/config.py
Centralized configuration system for the Jal Saheli backend.

All settings are loaded from environment variables (via .env file or shell).
Each category is a nested Settings class:
  - App
  - Database
  - Authentication
  - Telegram
  - AI
  - Satellite
  - Storage
  - CORS

Usage:
    from app.config import get_settings
    settings = get_settings()
    print(settings.database.url)
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ─────────────────────────────────────────────────────────────────────────────
# Category: Application
# ─────────────────────────────────────────────────────────────────────────────

class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    env: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="APP_ENV",
        description="Runtime environment",
    )
    title: str = Field(default="GeoWise Backend API", validation_alias="APP_TITLE")
    version: str = Field(default="1.0.0", validation_alias="APP_VERSION")
    debug: bool = Field(default=False, validation_alias="DEBUG")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")


# ─────────────────────────────────────────────────────────────────────────────
# Category: Database
# ─────────────────────────────────────────────────────────────────────────────

class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    url: str = Field(
        default="sqlite+aiosqlite:///./jal_saheli_dev.db",
        validation_alias="DATABASE_URL",
        description=(
            "Async SQLAlchemy connection string. "
            "Use sqlite+aiosqlite:// for dev or postgresql+asyncpg:// for production."
        ),
    )
    pool_size: int = Field(default=10, validation_alias="DB_POOL_SIZE")
    max_overflow: int = Field(default=20, validation_alias="DB_MAX_OVERFLOW")
    echo: bool = Field(default=False, validation_alias="DB_ECHO")

    @field_validator("url", mode="before")
    @classmethod
    def check_url_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("DATABASE_URL must be set to a valid connection string")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Category: Authentication
# ─────────────────────────────────────────────────────────────────────────────

class AuthSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    jwt_secret_key: str = Field(
        default="",
        validation_alias="JWT_SECRET_KEY",
        description="MUST be changed before production deployment",
    )
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60, validation_alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    otp_expire_minutes: int = Field(default=10, validation_alias="OTP_EXPIRE_MINUTES")
    otp_length: int = Field(default=6, validation_alias="OTP_LENGTH")

    @property
    def jwt_configured(self) -> bool:
        """True only when JWT secret is set and non-trivial."""
        return bool(self.jwt_secret_key and self.jwt_secret_key != "CHANGEME_generate_a_real_secret_here")


# ─────────────────────────────────────────────────────────────────────────────
# Category: Telegram
# ─────────────────────────────────────────────────────────────────────────────

class TelegramSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    bot_token: str = Field(default="", validation_alias="TELEGRAM_BOT_TOKEN")
    webhook_url: str = Field(default="", validation_alias="TELEGRAM_WEBHOOK_URL")
    webhook_secret: str = Field(default="", validation_alias="TELEGRAM_WEBHOOK_SECRET")

    @property
    def configured(self) -> bool:
        """True only if a real bot token is provided."""
        return bool(self.bot_token and self.bot_token.strip())


# ─────────────────────────────────────────────────────────────────────────────
# Category: AI Service
# ─────────────────────────────────────────────────────────────────────────────

class AISettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    service_url: str = Field(default="", validation_alias="AI_SERVICE_URL")
    api_key: str = Field(default="", validation_alias="AI_SERVICE_API_KEY")
    timeout_seconds: int = Field(default=30, validation_alias="AI_REQUEST_TIMEOUT_SECONDS")
    confidence_threshold: float = Field(
        default=0.75,
        validation_alias="GEOAI_CONFIDENCE_THRESHOLD",
        description="Analyses below this confidence create a verification task",
    )

    @property
    def configured(self) -> bool:
        """True only if a real AI service URL is provided."""
        return bool(self.service_url and self.service_url.strip())


# ─────────────────────────────────────────────────────────────────────────────
# Category: Satellite Service
# ─────────────────────────────────────────────────────────────────────────────

class SatelliteSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    sentinel_username: str = Field(default="", validation_alias="SENTINEL_USERNAME")
    sentinel_password: str = Field(default="", validation_alias="SENTINEL_PASSWORD")
    sentinelhub_client_id: str = Field(default="", validation_alias="SENTINELHUB_CLIENT_ID")
    sentinelhub_client_secret: str = Field(default="", validation_alias="SENTINELHUB_CLIENT_SECRET")
    timeout_seconds: int = Field(default=60, validation_alias="SATELLITE_REQUEST_TIMEOUT_SECONDS")

    @property
    def configured(self) -> bool:
        """True if Copernicus CDSE or Sentinel Hub credentials are present."""
        cdse_ok = bool(self.sentinel_username and self.sentinel_password)
        hub_ok = bool(self.sentinelhub_client_id and self.sentinelhub_client_secret)
        return cdse_ok or hub_ok


# ─────────────────────────────────────────────────────────────────────────────
# Category: Bhuvan (ISRO WMS)
# ─────────────────────────────────────────────────────────────────────────────

class BhuvanSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    enabled: bool = Field(default=False, validation_alias="BHUVAN_ENABLED")
    wms_url: str = Field(default="", validation_alias="BHUVAN_WMS_URL")
    layer: str = Field(default="", validation_alias="BHUVAN_LAYER")
    version: str = Field(default="1.1.1", validation_alias="BHUVAN_VERSION")
    crs: str = Field(default="EPSG:4326", validation_alias="BHUVAN_CRS")
    format: str = Field(default="image/png", validation_alias="BHUVAN_FORMAT")
    timeout_seconds: float = Field(default=15.0, validation_alias="BHUVAN_TIMEOUT")
    bbox_delta_deg: float = Field(default=0.05, validation_alias="BHUVAN_BBOX_DELTA")
    map_width: int = Field(default=256, validation_alias="BHUVAN_MAP_WIDTH")
    map_height: int = Field(default=256, validation_alias="BHUVAN_MAP_HEIGHT")

    @property
    def configured(self) -> bool:
        """Enabled Bhuvan uses official defaults when URL/layer env vars are empty."""
        return bool(self.enabled)


# ─────────────────────────────────────────────────────────────────────────────
# Category: Storage
# ─────────────────────────────────────────────────────────────────────────────

class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    backend: Literal["local", "s3", "gcs"] = Field(
        default="local", validation_alias="STORAGE_BACKEND"
    )
    local_dir: str = Field(default="./uploads", validation_alias="LOCAL_STORAGE_DIR")
    aws_access_key_id: str = Field(default="", validation_alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", validation_alias="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="ap-south-1", validation_alias="AWS_REGION")
    s3_bucket: str = Field(default="", validation_alias="S3_BUCKET_NAME")
    gcs_bucket: str = Field(default="", validation_alias="GCS_BUCKET_NAME")
    max_photo_size_bytes: int = Field(
        default=10_485_760, validation_alias="MAX_PHOTO_SIZE_BYTES"  # 10 MB
    )

    @property
    def configured(self) -> bool:
        if self.backend == "local":
            return True
        if self.backend == "s3":
            return bool(self.aws_access_key_id and self.s3_bucket)
        if self.backend == "gcs":
            return bool(self.gcs_bucket)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Category: CORS
# ─────────────────────────────────────────────────────────────────────────────

class CORSSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    origins_raw: str = Field(
        default="http://localhost:5173,http://localhost:5174",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.origins_raw.split(",") if o.strip()]


# ─────────────────────────────────────────────────────────────────────────────
# Root Settings — aggregates all categories
# ─────────────────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    """
    Root settings object.

    Instantiated once via get_settings() and cached.
    Reads from environment variables directly (no nested env_prefix).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Each nested settings block reads from its own env vars.
    # We instantiate them explicitly to allow env_file override to propagate.
    app: AppSettings = Field(default_factory=AppSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    telegram: TelegramSettings = Field(default_factory=TelegramSettings)
    ai: AISettings = Field(default_factory=AISettings)
    satellite: SatelliteSettings = Field(default_factory=SatelliteSettings)
    bhuvan: BhuvanSettings = Field(default_factory=BhuvanSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    cors: CORSSettings = Field(default_factory=CORSSettings)

    def model_post_init(self, __context: object) -> None:
        """Re-read nested settings from the same environment source."""
        self.app = AppSettings()
        self.database = DatabaseSettings()
        self.auth = AuthSettings()
        self.telegram = TelegramSettings()
        self.ai = AISettings()
        self.satellite = SatelliteSettings()
        self.bhuvan = BhuvanSettings()
        self.storage = StorageSettings()
        self.cors = CORSSettings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    To override in tests:
        from unittest.mock import patch
        with patch("app.config.get_settings", return_value=my_test_settings):
            ...

    Or clear the cache:
        get_settings.cache_clear()
    """
    env_file = os.environ.get("ENV_FILE", ".env")
    return Settings(_env_file=env_file)  # type: ignore[call-arg]
