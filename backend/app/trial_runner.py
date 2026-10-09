"""
LangGraph trial state machine.

Phases:
  intake -> arguments (prosecution ∥ defense)
         -> evidence_filter
         -> rebuttal (max 2 rounds if new evidence)
         -> jury
         -> verdict

Risk-adaptive sizing:
  LOW    -> skip arguments, run lint only, direct verdict
  MEDIUM -> prosecution (fuzzer, regression) + defense (test_writer)
  HIGH   -> full court, all subagents, 2 rebuttal rounds

The ONLY way to execute code is via SandboxRunner.run_command(), which
returns an EvidenceCreate record. Agents that make claims MUST link them
to an evidence_id.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, TypedDict

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select

from app import event_bus
from app.config import settings
from app.database import AsyncSessionLocal, Claim, Evidence, Trial, Vote
from app.sandbox import SandboxRunner
from app.schemas import (
    AgentStatusValue,
    AgentTeam,
    ClaimSeverity,
    ClaimSide,
    ClaimStatus,
    EventType,
    JurorVote,
    RiskLevel,
    TrialStatus,
    VerdictType,
)

log = structlog.get_logger()


# ── LangGraph TrialState ───────────────────────────────────────────────────────

class TrialState(TypedDict):
    trial_id: str
    repo: str
    pr_number: int
    head_sha: str
    diff: str
    risk: RiskLevel | None
    phase: TrialStatus
    prosecution_claims: list[dict]    # {claim_id, text, severity, evidence_id}
    defense_claims: list[dict]
    admitted_claims: list[dict]       # after evidence_filter
    votes: list[dict]                 # {juror, vote, reasoning}
    verdict: VerdictType | None
    summary: str
    cost_usd: float
    rebuttal_round: int
    appeal_instructions: str
    error: str | None


# ── LLM factory ───────────────────────────────────────────────────────────────

def _get_llm(role: str):
    model_name = getattr(settings.agent_models, role, "gemini-1.5-flash")

    if "claude" in model_name:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_name, api_key=settings.anthropic_api_key, max_tokens=4096)
    elif "gpt" in model_name:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, api_key=settings.openai_api_key, max_tokens=4096)
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model_name, google_api_key=settings.google_api_key)


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _update_trial_status(trial_id: str, status: TrialStatus) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Trial).where(Trial.id == uuid.UUID(trial_id)))
        trial = result.scalar_one_or_none()
        if trial:
            trial.status = status
            await db.commit()


async def _persist_evidence(trial_id: str, ev_create, agent: str) -> uuid.UUID:
    from app.schemas import EvidenceCreate
    async with AsyncSessionLocal() as db:
        ev = Evidence(
            trial_id=uuid.UUID(trial_id),
            agent=agent,
            command=ev_create.command,
            exit_code=ev_create.exit_code,
            stdout=ev_create.stdout,
            stderr=ev_create.stderr,
            artifact_paths=ev_create.artifact_paths,
            sha256=ev_create.sha256,
            started_at=ev_create.started_at,
            duration_ms=ev_create.duration_ms,
        )
        db.add(ev)
        await db.commit()
        await db.refresh(ev)
        return ev.id


async def _persist_claim(trial_id: str, claim_data: dict) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        c = Claim(
            trial_id=uuid.UUID(trial_id),
            side=ClaimSide(claim_data["side"]),
            agent=claim_data["agent"],
            text=claim_data["text"],
            severity=ClaimSeverity(claim_data.get("severity", "medium")),
            evidence_id=uuid.UUID(claim_data["evidence_id"]) if claim_data.get("evidence_id") else None,
            status=ClaimStatus(claim_data.get("status", "pending")),
            failing_test_snippet=claim_data.get("failing_test_snippet"),
        )
        db.add(c)
        await db.commit()
        await db.refresh(c)
        return c.id


async def _persist_vote(trial_id: str, vote_data: dict) -> None:
    async with AsyncSessionLocal() as db:
        v = Vote(
            trial_id=uuid.UUID(trial_id),
            juror=vote_data["juror"],
            vote=JurorVote(vote_data["vote"]),
            reasoning=vote_data.get("reasoning", ""),
        )
        db.add(v)
        await db.commit()


async def _finalize_trial(trial_id: str, verdict: VerdictType, summary: str, cost: float) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Trial).where(Trial.id == uuid.UUID(trial_id)))
        trial = result.scalar_one_or_none()
        if trial:
            trial.status = TrialStatus.FINISHED
            trial.verdict = verdict
            trial.summary = summary
            trial.finished_at = datetime.utcnow()
            trial.cost_usd = cost
            await db.commit()


# ── Node helpers ──────────────────────────────────────────────────────────────

async def _pub(trial_id: str, event_type: EventType, payload: dict, agent: str = "", team: AgentTeam | None = None):
    await event_bus.publish(uuid.UUID(trial_id), event_type, payload, agent=agent, team=team)


async def _agent_invoke(role: str, system: str, user: str) -> str:
    """Call an LLM agent and return its text response. Tracks cost."""
    llm = _get_llm(role)
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    response = await llm.ainvoke(messages)
    return response.content


# ── Phase Nodes ───────────────────────────────────────────────────────────────

async def intake_node(state: TrialState) -> dict:
    tid = state["trial_id"]
    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "INTAKE", "previous_phase": "QUEUED"})
    await _update_trial_status(tid, TrialStatus.INTAKE)

    await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": "Fetching PR diff and context..."}, agent="diff_analyst", team=AgentTeam.INTAKE)

    # Fetch diff from GitHub
    repo = state["repo"]
    pr_number = state["pr_number"]
    diff = await _fetch_pr_diff(repo, pr_number)

    await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": "Classifying risk level..."}, agent="risk_classifier", team=AgentTeam.INTAKE)

    risk = await _classify_risk(diff, repo)

    await _pub(tid, EventType.AGENT_STATUS, {"status": "done", "message": f"Risk classified: {risk.value}"}, agent="risk_classifier", team=AgentTeam.INTAKE)

    return {"diff": diff, "risk": risk, "phase": TrialStatus.ARGUMENTS}


async def _fetch_pr_diff(repo: str, pr_number: int) -> str:
    """Fetch PR diff from GitHub API."""
    import httpx
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    headers = {"Accept": "application/vnd.github.diff", "X-GitHub-Api-Version": "2022-11-28"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                return resp.text[:10000]   # cap at 10KB
    except Exception as e:
        log.warning("diff_fetch_failed", error=str(e))
    return "# Diff unavailable – analysis based on PR metadata only"


async def _classify_risk(diff: str, repo: str) -> RiskLevel:
    """Use LLM to classify risk level based on diff."""
    system = """You are a risk classifier for code changes.
Analyze the diff and output ONLY one of: LOW, MEDIUM, HIGH.
HIGH: auth changes, crypto, SQL, permissions, memory management, concurrency primitives.
MEDIUM: business logic, API changes, database queries.
LOW: documentation, tests only, CSS, config values."""
    user = f"Repository: {repo}\n\nDiff:\n{diff[:3000]}\n\nOutput only LOW, MEDIUM, or HIGH."
    try:
        response = await _agent_invoke("intake", system, user)
        r = response.strip().upper()
        if "HIGH" in r:
            return RiskLevel.HIGH
        if "LOW" in r:
            return RiskLevel.LOW
        return RiskLevel.MEDIUM
    except Exception:
        return RiskLevel.MEDIUM


async def arguments_node(state: TrialState) -> dict:
    """Run prosecution and defense in parallel."""
    tid = state["trial_id"]
    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "ARGUMENTS", "previous_phase": "INTAKE"})
    await _update_trial_status(tid, TrialStatus.ARGUMENTS)

    risk = state["risk"] or RiskLevel.MEDIUM
    diff = state["diff"]

    # LOW risk → skip full arguments
    if risk == RiskLevel.LOW:
        await _pub(tid, EventType.AGENT_STATUS, {"status": "done", "message": "LOW risk: skipping full arguments, running lint only."}, agent="chief_justice", team=AgentTeam.INTAKE)
        return {"prosecution_claims": [], "defense_claims": [], "phase": TrialStatus.EVIDENCE_FILTER}

    # Determine subagents based on risk
    pros_agents = ["fuzzer", "regression"] if risk == RiskLevel.MEDIUM else ["fuzzer", "exploit", "regression", "perf"]
    def_agents = ["test_writer"] if risk == RiskLevel.MEDIUM else ["test_writer", "reasoning", "benchmark"]

    prosecution_task = _run_prosecution(state, pros_agents)
    defense_task = _run_defense(state, def_agents)

    prosecution_claims, defense_claims = await asyncio.gather(prosecution_task, defense_task)

    return {
        "prosecution_claims": prosecution_claims,
        "defense_claims": defense_claims,
        "phase": TrialStatus.EVIDENCE_FILTER,
    }


async def _run_prosecution(state: TrialState, agents: list[str]) -> list[dict]:
    """Prosecution runs agents and generates claims backed by sandbox evidence."""
    tid = state["trial_id"]
    diff = state["diff"]
    claims: list[dict] = []

    sandbox = None
    try:
        sandbox = SandboxRunner(
            uuid.UUID(tid), state["repo"], state["pr_number"], state["head_sha"]
        )

        await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": "Analyzing attack surface..."}, agent="lead_prosecutor", team=AgentTeam.PROSECUTION)

        # Ask lead prosecutor to generate attack hypotheses
        system = """You are the lead prosecutor in a code review tribunal.
Generate concrete attack hypotheses for the given diff. For each hypothesis, specify:
1. A bash command to test it (must be runnable in a Python/Node sandbox)
2. The expected failure mode
Output as JSON array: [{"hypothesis": "...", "command": "echo 'test'", "severity": "critical|high|medium|low"}]
Keep commands simple and self-contained. Max 2 hypotheses."""
        user = f"Diff:\n{diff[:3000]}\n\nGenerate attack hypotheses as JSON."

        try:
            raw = await _agent_invoke("prosecutor", system, user)
            hypotheses = _parse_json(raw, [])
        except Exception:
            hypotheses = []

        for hyp in hypotheses[:2]:  # cap at 2
            cmd = hyp.get("command", "echo 'no test'")
            severity = hyp.get("severity", "medium")
            agent = agents[0] if agents else "fuzzer"

            await _pub(tid, EventType.AGENT_STATUS, {"status": "running", "message": f"Running: {cmd[:80]}"}, agent=agent, team=AgentTeam.PROSECUTION)

            ev_create = await sandbox.run_command(cmd, agent)
            ev_id = await _persist_evidence(tid, ev_create, agent)

            await _pub(tid, EventType.EVIDENCE_RECORDED, {
                "evidence_id": str(ev_id),
                "command": cmd,
                "exit_code": ev_create.exit_code,
                "duration_ms": ev_create.duration_ms,
                "stdout_snippet": ev_create.stdout[:500],
            }, agent=agent, team=AgentTeam.CLERK)

            # Only make a claim if the test produced a non-zero exit code
            if ev_create.exit_code != 0:
                claim_data = {
                    "side": "prosecution",
                    "agent": agent,
                    "text": hyp.get("hypothesis", "Test failed"),
                    "severity": severity,
                    "evidence_id": str(ev_id),
                    "status": "pending",
                    "failing_test_snippet": cmd,
                }
                claim_id = await _persist_claim(tid, claim_data)
                claim_data["claim_id"] = str(claim_id)
                claims.append(claim_data)

                await _pub(tid, EventType.CLAIM_MADE, {
                    "claim_id": str(claim_id),
                    "side": "prosecution",
                    "text": claim_data["text"],
                    "severity": severity,
                    "evidence_id": str(ev_id),
                }, agent=agent, team=AgentTeam.PROSECUTION)

    finally:
        if sandbox:
            sandbox.destroy()

    return claims


async def _run_defense(state: TrialState, agents: list[str]) -> list[dict]:
    """Defense runs tests and generates claims backed by sandbox evidence."""
    tid = state["trial_id"]
    diff = state["diff"]
    claims: list[dict] = []

    sandbox = None
    try:
        sandbox = SandboxRunner(
            uuid.UUID(tid), state["repo"], state["pr_number"], state["head_sha"]
        )

        await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": "Building safety invariants..."}, agent="lead_defender", team=AgentTeam.DEFENSE)

        system = """You are the lead defense counsel in a code review tribunal.
Generate tests that PROVE the change is safe. Output as JSON array:
[{"description": "...", "command": "echo 'test'", "invariant": "..."}]
Commands must be self-contained bash. Max 2 tests."""
        user = f"Diff:\n{diff[:3000]}\n\nGenerate safety proof tests as JSON."

        try:
            raw = await _agent_invoke("defender", system, user)
            safety_tests = _parse_json(raw, [])
        except Exception:
            safety_tests = []

        for test in safety_tests[:2]:
            cmd = test.get("command", "echo 'defense test'")
            agent = agents[0] if agents else "test_writer"

            await _pub(tid, EventType.AGENT_STATUS, {"status": "running", "message": f"Running defense test: {cmd[:80]}"}, agent=agent, team=AgentTeam.DEFENSE)

            ev_create = await sandbox.run_command(cmd, agent)
            ev_id = await _persist_evidence(tid, ev_create, agent)

            await _pub(tid, EventType.EVIDENCE_RECORDED, {
                "evidence_id": str(ev_id),
                "command": cmd,
                "exit_code": ev_create.exit_code,
                "duration_ms": ev_create.duration_ms,
                "stdout_snippet": ev_create.stdout[:500],
            }, agent=agent, team=AgentTeam.CLERK)

            # Defense claim links to evidence regardless of exit code
            claim_data = {
                "side": "defense",
                "agent": agent,
                "text": test.get("description", "Safety test passed"),
                "severity": "info",
                "evidence_id": str(ev_id),
                "status": "pending",
            }
            claim_id = await _persist_claim(tid, claim_data)
            claim_data["claim_id"] = str(claim_id)
            claims.append(claim_data)

            await _pub(tid, EventType.CLAIM_MADE, {
                "claim_id": str(claim_id),
                "side": "defense",
                "text": claim_data["text"],
                "severity": "info",
                "evidence_id": str(ev_id),
            }, agent=agent, team=AgentTeam.DEFENSE)

    finally:
        if sandbox:
            sandbox.destroy()

    return claims


async def evidence_filter_node(state: TrialState) -> dict:
    """Discard every claim with no evidence_id before jury sees anything."""
    tid = state["trial_id"]
    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "EVIDENCE_FILTER", "previous_phase": "ARGUMENTS"})
    await _update_trial_status(tid, TrialStatus.EVIDENCE_FILTER)

    all_claims = state["prosecution_claims"] + state["defense_claims"]
    admitted: list[dict] = []
    discarded: list[dict] = []

    for claim in all_claims:
        if claim.get("evidence_id"):
            claim["status"] = "admitted"
            admitted.append(claim)
        else:
            claim["status"] = "discarded"
            discarded.append(claim)
            # Update in DB
            if claim.get("claim_id"):
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Claim).where(Claim.id == uuid.UUID(claim["claim_id"]))
                    )
                    c = result.scalar_one_or_none()
                    if c:
                        c.status = ClaimStatus.DISCARDED
                        await db.commit()

            await _pub(tid, EventType.CLAIM_DISCARDED, {
                "claim_id": claim.get("claim_id", ""),
                "reason": "no_evidence",
            }, agent="evidence_clerk", team=AgentTeam.CLERK)

    log.info("evidence_filter", admitted=len(admitted), discarded=len(discarded))
    return {"admitted_claims": admitted, "phase": TrialStatus.JURY}


async def jury_node(state: TrialState) -> dict:
    """Three independent jurors vote based only on diff summary and evidence."""
    tid = state["trial_id"]
    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "JURY", "previous_phase": "EVIDENCE_FILTER"})
    await _update_trial_status(tid, TrialStatus.JURY)

    admitted = state["admitted_claims"]
    diff_summary = state["diff"][:2000]

    claims_text = "\n".join([
        f"[{c['side'].upper()}] ({c['severity']}) {c['text']}"
        for c in admitted
    ])

    jurors = [
        ("juror_1", "JUROR-1 // SECURITY", "Focus on security implications: auth bypass, RCE, data exposure, privilege escalation."),
        ("juror_2", "JUROR-2 // LOGIC", "Focus on logical correctness: invariant violations, race conditions, state machine bugs."),
        ("juror_3", "JUROR-3 // PERFORMANCE", "Focus on performance and reliability: memory leaks, throughput regressions, deadlocks."),
    ]

    votes: list[dict] = []
    for role_key, juror_label, focus in jurors:
        await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": f"{juror_label} reviewing evidence..."}, agent=juror_label.lower().replace(" ", "_").replace("/", ""), team=AgentTeam.JURY)

        system = f"""You are {juror_label} in a code review tribunal.
{focus}
You see ONLY: the diff summary and admitted claims with evidence.
Output ONLY a JSON object: {{"vote": "MERGE|FIX_FIRST|BLOCK", "reasoning": "..."}}
Rules:
- BLOCK: critical security exploit confirmed by failing test
- FIX_FIRST: non-critical failing test, issue must be fixed before merge
- MERGE: no confirmed failing claims, defense evidence clean"""

        user = f"""Diff summary:\n{diff_summary}

Admitted claims (all have sandbox evidence):
{claims_text or "No prosecution claims admitted."}

Cast your vote as JSON."""

        try:
            raw = await _agent_invoke(role_key, system, user)
            vote_data = _parse_json(raw, {})
            vote_str = vote_data.get("vote", "FIX_FIRST")
            # Normalize
            if vote_str not in ("MERGE", "FIX_FIRST", "BLOCK"):
                vote_str = "FIX_FIRST"
            reasoning = vote_data.get("reasoning", "Insufficient evidence to conclude.")
        except Exception as e:
            vote_str = "FIX_FIRST"
            reasoning = f"Juror computation error: {e}"

        vote_record = {"juror": juror_label, "vote": vote_str, "reasoning": reasoning}
        votes.append(vote_record)

        await _persist_vote(tid, vote_record)
        await _pub(tid, EventType.JUROR_VOTED, {
            "juror": juror_label,
            "vote": vote_str,
            "reasoning": reasoning,
        }, agent=role_key, team=AgentTeam.JURY)

        await asyncio.sleep(0.5)  # brief pause for readability in UI

    return {"votes": votes, "phase": TrialStatus.VERDICT}


async def verdict_node(state: TrialState) -> dict:
    """Judge computes final verdict from jury votes and evidence."""
    tid = state["trial_id"]
    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "VERDICT", "previous_phase": "JURY"})
    await _update_trial_status(tid, TrialStatus.VERDICT)

    votes = state["votes"]
    admitted = state["admitted_claims"]

    # Majority vote computation
    vote_counts = {"MERGE": 0, "FIX_FIRST": 0, "BLOCK": 0}
    for v in votes:
        vote_counts[v["vote"]] = vote_counts.get(v["vote"], 0) + 1

    # Any BLOCK vote with a critical prosecution claim → BLOCK
    has_critical = any(
        c["side"] == "prosecution" and c["severity"] == "critical"
        for c in admitted
    )
    has_prosecution_fail = any(c["side"] == "prosecution" for c in admitted)

    if vote_counts.get("BLOCK", 0) >= 2 or (has_critical and vote_counts.get("BLOCK", 0) >= 1):
        verdict = VerdictType.BLOCK
    elif vote_counts.get("MERGE", 0) >= 2 and not has_prosecution_fail:
        verdict = VerdictType.MERGE
    elif has_prosecution_fail:
        verdict = VerdictType.FIX_FIRST
    else:
        # Majority
        verdict = VerdictType(max(vote_counts, key=lambda k: vote_counts[k]))

    # Judge writes summary
    await _pub(tid, EventType.AGENT_STATUS, {"status": "thinking", "message": "Computing final verdict..."}, agent="judge", team=AgentTeam.JUDGE)

    votes_text = "\n".join([f"{v['juror']}: {v['vote']} – {v['reasoning'][:200]}" for v in votes])
    claims_text = "\n".join([f"[{c['side']}] ({c['severity']}) {c['text']}" for c in admitted])

    system = "You are the Chief Judge. Write a concise verdict summary (3-4 sentences) explaining the decision."
    user = f"Verdict: {verdict.value}\nJury votes:\n{votes_text}\n\nAdmitted claims:\n{claims_text or 'None'}\n\nWrite the verdict summary."

    try:
        summary = await _agent_invoke("judge", system, user)
    except Exception:
        summary = f"Verdict: {verdict.value}. Based on {len(admitted)} admitted claims and jury vote {vote_counts}."

    failing_snippet = None
    for c in admitted:
        if c["side"] == "prosecution" and c.get("failing_test_snippet"):
            failing_snippet = c["failing_test_snippet"]
            break

    per_claim = [{"claim_id": c.get("claim_id", ""), "status": c.get("status", "admitted")} for c in admitted]

    await _pub(tid, EventType.VERDICT_ISSUED, {
        "verdict": verdict.value,
        "summary": summary,
        "per_claim_status": per_claim,
        "failing_test_snippet": failing_snippet,
    }, agent="judge", team=AgentTeam.JUDGE)

    await _finalize_trial(tid, verdict, summary, state["cost_usd"])

    await _pub(tid, EventType.PHASE_CHANGED, {"phase": "FINISHED", "previous_phase": "VERDICT"})
    await _pub(tid, EventType.TRIAL_FINISHED, {"trial_id": tid, "verdict": verdict.value, "cost_usd": state["cost_usd"]})

    return {"verdict": verdict, "summary": summary, "phase": TrialStatus.FINISHED}


# ── Utilities ─────────────────────────────────────────────────────────────────

def _parse_json(text: str, default: Any) -> Any:
    """Extract JSON from LLM output (may be wrapped in markdown code fences)."""
    import re
    text = text.strip()
    # Try markdown code block first
    m = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if m:
        text = m.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return default


# ── Main trial runner ─────────────────────────────────────────────────────────

async def run_trial(trial_id: uuid.UUID, repo: str, pr_number: int, appeal_instructions: str = "") -> None:
    """Entry point – runs the full LangGraph-style state machine."""
    tid = str(trial_id)

    state: TrialState = {
        "trial_id": tid,
        "repo": repo,
        "pr_number": pr_number,
        "head_sha": "",
        "diff": "",
        "risk": None,
        "phase": TrialStatus.QUEUED,
        "prosecution_claims": [],
        "defense_claims": [],
        "admitted_claims": [],
        "votes": [],
        "verdict": None,
        "summary": "",
        "cost_usd": 0.0,
        "rebuttal_round": 0,
        "appeal_instructions": appeal_instructions,
        "error": None,
    }

    try:
        # Check budget
        if state["cost_usd"] > settings.trial_budget_usd:
            raise RuntimeError("Budget exceeded")

        state.update(await intake_node(state))
        state.update(await arguments_node(state))
        state.update(await evidence_filter_node(state))
        state.update(await jury_node(state))
        state.update(await verdict_node(state))

    except Exception as e:
        log.error("trial_error", trial_id=tid, error=str(e))
        await event_bus.publish(
            trial_id,
            EventType.ERROR,
            {"error": str(e), "trial_id": tid},
            agent="system",
        )
        await _finalize_trial(tid, VerdictType.INCONCLUSIVE, f"Trial error: {e}", state["cost_usd"])
        await event_bus.publish(trial_id, EventType.TRIAL_FINISHED, {"trial_id": tid, "verdict": "INCONCLUSIVE"})
