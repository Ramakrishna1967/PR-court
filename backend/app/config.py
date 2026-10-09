"""
PR Court backend configuration.

Every agent role maps to a model name here. Swap models without touching agent code.
Default DB is SQLite (zero install). Switch to Postgres by setting DATABASE_URL.
"""
from __future__ import annotations

import os
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Default SQLite path (relative to backend working dir)
_DEFAULT_SQLITE = "sqlite+aiosqlite:///./prcourt.db"
_DEFAULT_SQLITE_SYNC = "sqlite:///./prcourt.db"


class AgentModels(BaseSettings):
    """Per-role model assignments. Override any via env vars (prefix PRCOURT_MODEL_)."""

    model_config = SettingsConfigDict(env_prefix="PRCOURT_MODEL_", env_file=".env", extra="ignore")

    # Cheap fast models for early pipeline stages
    intake: str = "gemini-1.5-flash"
    fuzzer: str = "gemini-1.5-flash"

    # Mid-tier for argument generation
    prosecutor: str = "gemini-1.5-pro"
    defender: str = "gemini-1.5-pro"
    exploit: str = "gemini-1.5-pro"
    regression: str = "gemini-1.5-pro"
    perf: str = "gemini-1.5-pro"
    test_writer: str = "gemini-1.5-pro"
    reasoning: str = "gemini-1.5-pro"
    benchmark: str = "gemini-1.5-pro"

    # Strong models for deliberation & verdict
    juror_1: str = "gemini-1.5-pro"
    juror_2: str = "gemini-1.5-pro"
    juror_3: str = "gemini-1.5-pro"
    judge: str = "gemini-1.5-pro"


class SandboxLimits(BaseSettings):
    """Resource limits for the subprocess sandbox (no Docker)."""

    model_config = SettingsConfigDict(env_prefix="PRCOURT_SANDBOX_", env_file=".env", extra="ignore")

    # Wall-clock seconds allowed per trial total
    wall_clock_timeout_s: int = 300
    # Wall-clock seconds allowed per individual command
    command_timeout_s: int = 30
    # Memory limit in MB (enforced via POSIX resource module on Linux/macOS)
    memory_mb: int = 256
    # Max subprocesses (anti-fork-bomb, POSIX only)
    max_procs: int = 32
    # Base working directory for temp sandboxes (None = system temp)
    base_work_dir: str | None = None


class Settings(BaseSettings):
    """Top-level application settings loaded from env / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Core ──────────────────────────────────────────────────────────────
    environment: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"
    debug: bool = False

    # ── Database ──────────────────────────────────────────────────────────
    # Default: SQLite (zero install, file in ./prcourt.db)
    # Switch to Postgres: DATABASE_URL=postgresql+asyncpg://user:pw@host/db
    database_url: str = _DEFAULT_SQLITE
    database_url_sync: str = _DEFAULT_SQLITE_SYNC

    # ── Mock mode ─────────────────────────────────────────────────────────
    mock_mode: bool = True   # True by default – safe out-of-the-box

    # ── API keys (optional – unused in mock mode) ─────────────────────────
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # ── GitHub App ────────────────────────────────────────────────────────
    github_app_id: str = ""
    github_app_private_key: str = ""
    github_webhook_secret: str = ""

    # ── CORS / Rate-limit ─────────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"]
    )
    rate_limit_trials_per_minute: int = 5

    # ── Cost / Budget ─────────────────────────────────────────────────────
    trial_budget_usd: float = 2.0

    # ── Observability ─────────────────────────────────────────────────────
    langsmith_api_key: str = ""
    langsmith_project: str = "pr-court"
    langsmith_tracing: bool = False

    # ── Nested configs (lazy) ─────────────────────────────────────────────
    @property
    def agent_models(self) -> AgentModels:
        return AgentModels()

    @property
    def sandbox(self) -> SandboxLimits:
        return SandboxLimits()

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v: str | list) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


# Singleton – import this everywhere
settings = Settings()
