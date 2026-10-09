"""
PR Court FastAPI application – main entry point.
"""
from __future__ import annotations

import logging

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, trials, webhook

# ── Logging setup ─────────────────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    logger_factory=structlog.PrintLoggerFactory(),
)
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))

# ── LangSmith tracing (optional) ─────────────────────────────────────────────

if settings.langsmith_tracing and settings.langsmith_api_key:
    import os
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PR Court API",
    description="Adversarial PR trial backend",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router, prefix="/api")
app.include_router(trials.router, prefix="/api")
app.include_router(webhook.router, prefix="/api")
