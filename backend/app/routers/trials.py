"""
/api/trials routes:
  POST   /trials               create + start a trial
  GET    /trials               list trials (paginated, filterable)
  GET    /trials/{id}          trial detail
  POST   /trials/{id}/appeal   re-run with extra instructions
  GET    /trials/{id}/events   SSE stream
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import AsyncIterator

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import event_bus
from app.config import settings
from app.database import (
    AsyncSessionLocal,
    Claim,
    Evidence,
    Event,
    Trial,
    Vote,
    get_db,
)
from app.schemas import (
    AppealRequest,
    ClaimRecord,
    ClaimSide,
    ClaimStatus,
    EvidenceRecord,
    EventType,
    RiskLevel,
    TrialCreateRequest,
    TrialCreateResponse,
    TrialDetail,
    TrialListResponse,
    TrialStatus,
    TrialSummary,
    VerdictType,
    VoteRecord,
)

log = structlog.get_logger()
router = APIRouter(tags=["trials"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _trial_to_summary(t: Trial) -> TrialSummary:
    return TrialSummary(
        id=t.id,
        repo=t.repo,
        pr_number=t.pr_number,
        head_sha=t.head_sha,
        status=t.status,
        risk=t.risk,
        verdict=t.verdict,
        summary=t.summary,
        created_at=t.created_at,
        finished_at=t.finished_at,
        cost_usd=t.cost_usd,
    )


def _claim_to_schema(c: Claim) -> ClaimRecord:
    return ClaimRecord(
        id=c.id,
        trial_id=c.trial_id,
        side=c.side,
        agent=c.agent,
        text=c.text,
        severity=c.severity,
        evidence_id=c.evidence_id,
        status=c.status,
        failing_test_snippet=c.failing_test_snippet,
    )


def _evidence_to_schema(e: Evidence) -> EvidenceRecord:
    return EvidenceRecord(
        id=e.id,
        trial_id=e.trial_id,
        agent=e.agent,
        command=e.command,
        exit_code=e.exit_code,
        stdout=e.stdout,
        stderr=e.stderr,
        artifact_paths=e.artifact_paths or [],
        sha256=e.sha256,
        started_at=e.started_at,
        duration_ms=e.duration_ms,
    )


def _vote_to_schema(v: Vote) -> VoteRecord:
    return VoteRecord(
        id=v.id,
        trial_id=v.trial_id,
        juror=v.juror,
        vote=v.vote,
        reasoning=v.reasoning,
    )


async def _start_trial(trial_id: uuid.UUID, repo: str, pr_number: int, appeal_instructions: str = "") -> None:
    """Background task: run mock or real trial."""
    log.info("trial_start", trial_id=str(trial_id), repo=repo, pr_number=pr_number, mock=settings.mock_mode)

    if settings.mock_mode:
        from app.mock_trial import run_mock_trial
        await run_mock_trial(trial_id)
    else:
        from app.trial_runner import run_trial
        await run_trial(trial_id, repo, pr_number, appeal_instructions)


# ── Rate limiting (simple in-memory) ─────────────────────────────────────────

_rate_counts: dict[str, int] = {}
_rate_window: dict[str, float] = {}


def _check_rate_limit(client_ip: str) -> bool:
    import time
    now = time.time()
    window = _rate_window.get(client_ip, 0)
    if now - window > 60:
        _rate_counts[client_ip] = 0
        _rate_window[client_ip] = now
    count = _rate_counts.get(client_ip, 0) + 1
    _rate_counts[client_ip] = count
    return count <= settings.rate_limit_trials_per_minute


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/trials", response_model=TrialCreateResponse, status_code=201)
async def create_trial(
    body: TrialCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> TrialCreateResponse:
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in 1 minute.")

    trial = Trial(
        repo=body.repo,
        pr_number=body.pr_number,
        head_sha="pending",
        status=TrialStatus.QUEUED,
    )
    db.add(trial)
    await db.commit()
    await db.refresh(trial)

    log.info("trial_created", trial_id=str(trial.id))
    background_tasks.add_task(_start_trial, trial.id, body.repo, body.pr_number)

    return TrialCreateResponse(trial_id=trial.id)


@router.get("/trials", response_model=TrialListResponse)
async def list_trials(
    repo: str | None = Query(None),
    verdict: str | None = Query(None),
    risk: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> TrialListResponse:
    q = select(Trial)
    if repo:
        q = q.where(Trial.repo.ilike(f"%{repo}%"))
    if verdict:
        try:
            q = q.where(Trial.verdict == VerdictType(verdict))
        except ValueError:
            pass
    if risk:
        try:
            q = q.where(Trial.risk == RiskLevel(risk))
        except ValueError:
            pass

    total_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(total_q)
    total = total_result.scalar() or 0

    q = q.order_by(Trial.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    trials = result.scalars().all()

    return TrialListResponse(
        trials=[_trial_to_summary(t) for t in trials],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/trials/{trial_id}", response_model=TrialDetail)
async def get_trial(
    trial_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TrialDetail:
    result = await db.execute(select(Trial).where(Trial.id == trial_id))
    trial = result.scalar_one_or_none()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")

    # Also pull in-memory events to reconstruct live state even before DB flush
    live_events = event_bus.get_events(trial_id)

    # Reconstruct from live events if DB rows are missing (mock mode shortcut)
    claims = [_claim_to_schema(c) for c in (trial.claims or [])]
    evidence = [_evidence_to_schema(e) for e in (trial.evidence or [])]
    votes = [_vote_to_schema(v) for v in (trial.votes or [])]

    verdict = trial.verdict
    summary = trial.summary
    status = trial.status

    # In mock mode, read from event bus if DB not flushed yet
    for ev in live_events:
        if ev.type == EventType.VERDICT_ISSUED:
            if not verdict:
                try:
                    verdict = VerdictType(ev.payload.get("verdict", "INCONCLUSIVE"))
                except ValueError:
                    pass
                summary = ev.payload.get("summary", "")
        if ev.type == EventType.TRIAL_FINISHED:
            status = TrialStatus.FINISHED

    return TrialDetail(
        id=trial.id,
        repo=trial.repo,
        pr_number=trial.pr_number,
        head_sha=trial.head_sha,
        status=status,
        risk=trial.risk,
        verdict=verdict,
        summary=summary,
        created_at=trial.created_at,
        finished_at=trial.finished_at,
        cost_usd=trial.cost_usd,
        claims=claims,
        evidence=evidence,
        votes=votes,
    )


@router.post("/trials/{trial_id}/appeal", response_model=TrialCreateResponse, status_code=201)
async def appeal_trial(
    trial_id: uuid.UUID,
    body: AppealRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> TrialCreateResponse:
    result = await db.execute(select(Trial).where(Trial.id == trial_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Trial not found")

    new_trial = Trial(
        repo=original.repo,
        pr_number=original.pr_number,
        head_sha=original.head_sha,
        status=TrialStatus.QUEUED,
    )
    db.add(new_trial)
    await db.commit()
    await db.refresh(new_trial)

    background_tasks.add_task(
        _start_trial, new_trial.id, original.repo, original.pr_number, body.instructions
    )
    return TrialCreateResponse(trial_id=new_trial.id)


@router.get("/trials/{trial_id}/events")
async def stream_trial_events(
    trial_id: uuid.UUID,
    request: Request,
    last_event_id: str | None = Query(None, alias="lastEventId"),
) -> StreamingResponse:
    """SSE stream for a trial. Replays from last_event_id, then streams live."""

    last_id: int | None = None
    if last_event_id is not None:
        try:
            last_id = int(last_event_id)
        except ValueError:
            pass

    # Check trial exists (in mock mode it may only be in memory)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Trial).where(Trial.id == trial_id))
        trial = result.scalar_one_or_none()

    if not trial and not settings.mock_mode:
        raise HTTPException(status_code=404, detail="Trial not found")

    async def event_generator() -> AsyncIterator[str]:
        async for event in event_bus.subscribe(trial_id, last_id):
            if await request.is_disconnected():
                break

            if event is None:
                # keep-alive
                yield ": keep-alive\n\n"
                continue

            data = event.model_dump_json()
            yield f"id: {event.seq}\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
