"""
Pydantic v2 schemas – the single source of truth for API request/response shapes.

OpenAPI is generated from these; TypeScript types are derived from OpenAPI.
"""
from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enumerations ──────────────────────────────────────────────────────────────

class TrialStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    INTAKE = "INTAKE"
    ARGUMENTS = "ARGUMENTS"
    EVIDENCE_FILTER = "EVIDENCE_FILTER"
    REBUTTAL = "REBUTTAL"
    JURY = "JURY"
    VERDICT = "VERDICT"
    FINISHED = "FINISHED"
    ERROR = "ERROR"
    INCONCLUSIVE = "INCONCLUSIVE"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class VerdictType(str, enum.Enum):
    MERGE = "MERGE"
    FIX_FIRST = "FIX_FIRST"
    BLOCK = "BLOCK"
    INCONCLUSIVE = "INCONCLUSIVE"


class ClaimSide(str, enum.Enum):
    PROSECUTION = "prosecution"
    DEFENSE = "defense"


class ClaimSeverity(str, enum.Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    ADMITTED = "admitted"
    DISCARDED = "discarded"   # no evidence_id


class JurorVote(str, enum.Enum):
    MERGE = "MERGE"
    FIX_FIRST = "FIX_FIRST"
    BLOCK = "BLOCK"


class EventType(str, enum.Enum):
    PHASE_CHANGED = "phase_changed"
    AGENT_STATUS = "agent_status"
    AGENT_MESSAGE = "agent_message"
    CLAIM_MADE = "claim_made"
    EVIDENCE_RECORDED = "evidence_recorded"
    CLAIM_DISCARDED = "claim_discarded"
    JUROR_VOTED = "juror_voted"
    VERDICT_ISSUED = "verdict_issued"
    ERROR = "error"
    TRIAL_FINISHED = "trial_finished"


class AgentTeam(str, enum.Enum):
    INTAKE = "intake"
    PROSECUTION = "prosecution"
    DEFENSE = "defense"
    CLERK = "clerk"
    JURY = "jury"
    JUDGE = "judge"


class AgentStatusValue(str, enum.Enum):
    IDLE = "idle"
    THINKING = "thinking"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


# ── Evidence ──────────────────────────────────────────────────────────────────

class EvidenceRecord(BaseModel):
    id: UUID
    trial_id: UUID
    agent: str
    command: str
    exit_code: int
    stdout: str
    stderr: str
    artifact_paths: list[str] = []
    sha256: str
    started_at: datetime
    duration_ms: int


class EvidenceCreate(BaseModel):
    agent: str
    command: str
    exit_code: int
    stdout: str
    stderr: str
    artifact_paths: list[str] = []
    sha256: str
    started_at: datetime
    duration_ms: int


# ── Claims ────────────────────────────────────────────────────────────────────

class ClaimRecord(BaseModel):
    id: UUID
    trial_id: UUID
    side: ClaimSide
    agent: str
    text: str
    severity: ClaimSeverity
    evidence_id: UUID | None
    status: ClaimStatus
    failing_test_snippet: str | None = None


class ClaimCreate(BaseModel):
    side: ClaimSide
    agent: str
    text: str
    severity: ClaimSeverity
    evidence_id: UUID | None = None
    failing_test_snippet: str | None = None


# ── Votes ─────────────────────────────────────────────────────────────────────

class VoteRecord(BaseModel):
    id: UUID
    trial_id: UUID
    juror: str
    vote: JurorVote
    reasoning: str


# ── Verdict ───────────────────────────────────────────────────────────────────

class VerdictSummary(BaseModel):
    verdict: VerdictType
    summary: str
    per_claim_status: list[dict[str, Any]] = []
    failing_test_snippet: str | None = None


# ── Trials ────────────────────────────────────────────────────────────────────

class TrialCreateRequest(BaseModel):
    repo: str = Field(..., description="GitHub repo in 'owner/name' format")
    pr_number: int = Field(..., gt=0)


class TrialCreateResponse(BaseModel):
    trial_id: UUID


class TrialSummary(BaseModel):
    id: UUID
    repo: str
    pr_number: int
    head_sha: str
    status: TrialStatus
    risk: RiskLevel | None
    verdict: VerdictType | None
    summary: str | None
    created_at: datetime
    finished_at: datetime | None
    cost_usd: float


class TrialDetail(TrialSummary):
    claims: list[ClaimRecord] = []
    evidence: list[EvidenceRecord] = []
    votes: list[VoteRecord] = []


class TrialListResponse(BaseModel):
    trials: list[TrialSummary]
    total: int
    page: int
    page_size: int


# ── Appeal ────────────────────────────────────────────────────────────────────

class AppealRequest(BaseModel):
    instructions: str = Field(..., min_length=10, max_length=2000)


# ── SSE Events ────────────────────────────────────────────────────────────────

class TrialEvent(BaseModel):
    """Single SSE event payload.  Serialised as JSON in the SSE data field."""

    seq: int
    type: EventType
    agent: str = ""
    team: AgentTeam | None = None
    payload: dict[str, Any] = {}
    ts: datetime = Field(default_factory=datetime.utcnow)


# Typed payload helpers (serialised into TrialEvent.payload)

class PhaseChangedPayload(BaseModel):
    phase: TrialStatus
    previous_phase: TrialStatus | None = None


class AgentStatusPayload(BaseModel):
    status: AgentStatusValue
    message: str = ""


class ClaimMadePayload(BaseModel):
    claim_id: str
    side: ClaimSide
    text: str
    severity: ClaimSeverity
    evidence_id: str | None = None


class EvidenceRecordedPayload(BaseModel):
    evidence_id: str
    command: str
    exit_code: int
    duration_ms: int
    stdout_snippet: str   # first 500 chars


class ClaimDiscardedPayload(BaseModel):
    claim_id: str
    reason: str = "no_evidence"


class JurorVotedPayload(BaseModel):
    juror: str
    vote: JurorVote
    reasoning: str


class VerdictIssuedPayload(BaseModel):
    verdict: VerdictType
    summary: str
    per_claim_status: list[dict[str, Any]] = []
    failing_test_snippet: str | None = None


# ── Webhook ───────────────────────────────────────────────────────────────────

class GitHubWebhookPayload(BaseModel):
    action: str
    number: int | None = None
    pull_request: dict[str, Any] | None = None
    repository: dict[str, Any] | None = None


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = "0.1.0"
    mock_mode: bool = False
