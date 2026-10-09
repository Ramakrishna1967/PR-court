"""
SQLAlchemy 2.0 ORM models and async engine setup.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
    Uuid,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.config import settings
from app.schemas import (
    ClaimSeverity,
    ClaimSide,
    ClaimStatus,
    JurorVote,
    RiskLevel,
    TrialStatus,
    VerdictType,
)


class Base(DeclarativeBase):
    pass


# ── Engine / Session ──────────────────────────────────────────────────────────

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session


# ── ORM Models ────────────────────────────────────────────────────────────────

class Trial(Base):
    __tablename__ = "trials"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo: Mapped[str] = mapped_column(String(255), nullable=False)
    pr_number: Mapped[int] = mapped_column(Integer, nullable=False)
    head_sha: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    status: Mapped[TrialStatus] = mapped_column(
        Enum(TrialStatus, name="trial_status"), nullable=False, default=TrialStatus.QUEUED
    )
    risk: Mapped[RiskLevel | None] = mapped_column(
        Enum(RiskLevel, name="risk_level"), nullable=True
    )
    verdict: Mapped[VerdictType | None] = mapped_column(
        Enum(VerdictType, name="verdict_type"), nullable=True
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # relationships
    events: Mapped[list[Event]] = relationship("Event", back_populates="trial", lazy="selectin")
    evidence: Mapped[list[Evidence]] = relationship("Evidence", back_populates="trial", lazy="selectin")
    claims: Mapped[list[Claim]] = relationship("Claim", back_populates="trial", lazy="selectin")
    votes: Mapped[list[Vote]] = relationship("Vote", back_populates="trial", lazy="selectin")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trials.id", ondelete="CASCADE"), nullable=False
    )
    seq: Mapped[int] = mapped_column(BigInteger, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    agent: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    trial: Mapped[Trial] = relationship("Trial", back_populates="events")

    __table_args__ = (UniqueConstraint("trial_id", "seq"),)


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("trials.id", ondelete="CASCADE"), nullable=False
    )
    agent: Mapped[str] = mapped_column(String(64), nullable=False)
    command: Mapped[str] = mapped_column(Text, nullable=False)
    exit_code: Mapped[int] = mapped_column(Integer, nullable=False)
    stdout: Mapped[str] = mapped_column(Text, nullable=False, default="")
    stderr: Mapped[str] = mapped_column(Text, nullable=False, default="")
    artifact_paths: Mapped[list] = mapped_column(JSON, nullable=False, default=[])
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    trial: Mapped[Trial] = relationship("Trial", back_populates="evidence")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("trials.id", ondelete="CASCADE"), nullable=False
    )
    side: Mapped[ClaimSide] = mapped_column(Enum(ClaimSide, name="claim_side"), nullable=False)
    agent: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[ClaimSeverity] = mapped_column(
        Enum(ClaimSeverity, name="claim_severity"), nullable=False
    )
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evidence.id"), nullable=True
    )
    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus, name="claim_status"), nullable=False, default=ClaimStatus.PENDING
    )
    failing_test_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    trial: Mapped[Trial] = relationship("Trial", back_populates="claims")


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("trials.id", ondelete="CASCADE"), nullable=False
    )
    juror: Mapped[str] = mapped_column(String(64), nullable=False)
    vote: Mapped[JurorVote] = mapped_column(Enum(JurorVote, name="juror_vote"), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False, default="")

    trial: Mapped[Trial] = relationship("Trial", back_populates="votes")
