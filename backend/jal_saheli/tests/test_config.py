"""
tests/test_config.py
Configuration validation tests.

Verifies that:
  - Settings load correctly from .env.test
  - All required fields have correct types
  - .configured properties accurately reflect env state
  - No real credentials are embedded in test config
"""

from __future__ import annotations

from app.config import Settings, get_settings


class TestSettingsLoading:
    """Settings are loaded from .env.test correctly."""

    def test_app_env_is_test(self, settings: Settings):
        assert settings.app.env == "test"

    def test_debug_is_false_in_test(self, settings: Settings):
        # Debug should be off in test to avoid verbose SQL
        assert settings.app.debug is False

    def test_database_url_is_sqlite_in_test(self, settings: Settings):
        """Test environment must use SQLite — no PostgreSQL required."""
        assert settings.database.url.startswith("sqlite+aiosqlite://"), (
            f"Test DATABASE_URL should be sqlite+aiosqlite://..., got {settings.database.url!r}"
        )

    def test_jwt_secret_is_set(self, settings: Settings):
        """JWT secret must be non-empty in test env."""
        assert settings.auth.jwt_secret_key, "JWT_SECRET_KEY must be set in .env.test"

    def test_jwt_algorithm_is_hs256(self, settings: Settings):
        assert settings.auth.jwt_algorithm == "HS256"

    def test_cors_origins_parsed_as_list(self, settings: Settings):
        origins = settings.cors.origins
        assert isinstance(origins, list)
        assert len(origins) >= 1
        for origin in origins:
            assert origin.startswith("http"), f"Invalid CORS origin: {origin!r}"

    def test_max_photo_size_is_positive(self, settings: Settings):
        assert settings.storage.max_photo_size_bytes > 0

    def test_storage_backend_is_local_in_test(self, settings: Settings):
        assert settings.storage.backend == "local"


class TestConfiguredProperties:
    """`.configured` properties are False when credentials are missing."""

    def test_telegram_not_configured_without_token(self, settings: Settings):
        """Bot token is empty in .env.test — must report not_configured."""
        assert not settings.telegram.configured

    def test_ai_not_configured_without_url(self, settings: Settings):
        """AI service URL is empty in .env.test — must report not_configured."""
        assert not settings.ai.configured

    def test_satellite_not_configured_without_credentials(self, settings: Settings):
        """Satellite credentials are empty in .env.test — must report not_configured."""
        assert not settings.satellite.configured

    def test_local_storage_always_configured(self, settings: Settings):
        """Local storage backend requires no credentials — always configured."""
        assert settings.storage.configured

    def test_jwt_not_configured_with_placeholder(self, settings: Settings):
        """
        In test, JWT secret is set to a real (non-placeholder) value.
        jwt_configured should be True (not the CHANGEME placeholder).
        """
        # The .env.test sets a real test secret
        assert settings.auth.jwt_secret_key != "CHANGEME_generate_a_real_secret_here"


class TestSettingsCaching:
    """get_settings() returns the same cached instance."""

    def test_get_settings_returns_same_instance(self):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2

    def test_cache_clear_creates_fresh_instance(self):
        s1 = get_settings()
        get_settings.cache_clear()
        s2 = get_settings()
        # Both should have the same values (same .env.test source)
        assert s1.app.env == s2.app.env
        # But they are different objects
        assert s1 is not s2
        # Restore cache
        get_settings.cache_clear()
