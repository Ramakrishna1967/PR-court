"""
Mock mode trial replay.

Replays a canned login case-insensitivity FIX_FIRST trial through the
REAL SSE pipeline with realistic delays and zero model calls or Docker.

Scenario: PR #42 adds case-insensitive login to 'acme/auth-service'.
The prosecution finds that username='Admin' bypasses rate-limiting for 'admin'.
A failing exploit test is synthesised. Jury votes 2-1 for FIX_FIRST.
"""
from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta

from app import event_bus
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

# ── Canned data ───────────────────────────────────────────────────────────────

MOCK_REPO = "acme/auth-service"
MOCK_PR = 42
MOCK_SHA = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"

MOCK_DIFF = """\
diff --git a/src/auth/login.py b/src/auth/login.py
index 1234567..abcdefg 100644
--- a/src/auth/login.py
+++ b/src/auth/login.py
@@ -12,7 +12,7 @@ def authenticate(username: str, password: str) -> bool:
-    user = db.find_user(username)
+    user = db.find_user(username.lower())
     if user is None:
         raise AuthError("User not found")
     return bcrypt.checkpw(password.encode(), user.password_hash)
"""

MOCK_EXPLOIT_STDOUT = """\
=== Exploit Harness: login_case_insensitivity ===
[+] Creating test user: 'admin' with rate-limit counter=4 (1 below lockout)
[+] Attempting login as 'Admin' (case-variant) ...
[+] Rate-limit key lookup: 'Admin' -> counter=0 (NEW KEY, no match for 'admin')
[+] Login succeeded as 'Admin' — rate limit bypassed!
[FAIL] test_rate_limit_case_insensitive: Rate limit counter NOT shared across case variants.
Expected: lockout after 5 attempts regardless of case
Got:      'Admin' starts fresh counter, bypasses lockout
EXIT CODE: 1
"""

MOCK_DEFENSE_STDOUT = """\
=== Defense Test Suite ===
[+] test_password_hash_unchanged ... PASS
[+] test_user_lookup_consistency ... PASS
[+] test_bcrypt_timing_safe ....... PASS
[+] test_sql_injection_lower ..... PASS
All 4 defense tests passed.
EXIT CODE: 0
"""

FAILING_TEST_SNIPPET = """\
def test_rate_limit_case_insensitive():
    # Create 'admin' and exhaust rate limit to 4 attempts
    create_user('admin', 'password123')
    for _ in range(4):
        login('admin', 'wrongpass')  # fills rate limit for 'admin'
    
    # Now try with capital A — should STILL be rate-limited
    result = login('Admin', 'password123')  # bypasses rate limit!
    assert result.status == 'RATE_LIMITED', f"Expected RATE_LIMITED, got {result.status}"
"""


async def _step(delay: float) -> None:
    await asyncio.sleep(delay)


async def run_mock_trial(trial_id: uuid.UUID) -> None:
    """
    Emit the canned FIX_FIRST trial through the event bus.
    Runs as a background task; the SSE endpoint streams the events live.
    """
    tid = trial_id

    async def pub(event_type: EventType, payload: dict, agent: str = "", team: AgentTeam | None = None):
        await event_bus.publish(tid, event_type, payload, agent=agent, team=team)

    # ── INTAKE ────────────────────────────────────────────────────────────
    await pub(EventType.PHASE_CHANGED, {"phase": "INTAKE", "previous_phase": "QUEUED"})
    await _step(0.8)

    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Parsing diff AST..."}, agent="diff_analyst", team=AgentTeam.INTAKE)
    await _step(1.0)

    await pub(EventType.AGENT_STATUS, {"status": "running", "message": "Fetching PR context from GitHub..."}, agent="context_fetcher", team=AgentTeam.INTAKE)
    await _step(0.8)

    await pub(EventType.AGENT_STATUS, {"status": "done", "message": "Risk classified: HIGH — authentication change detected"}, agent="risk_classifier", team=AgentTeam.INTAKE)
    await _step(0.5)

    # ── ARGUMENTS (prosecution + defense in parallel) ─────────────────────
    await pub(EventType.PHASE_CHANGED, {"phase": "ARGUMENTS", "previous_phase": "INTAKE"})
    await _step(0.3)

    # Prosecution starts
    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Analyzing case-insensitive login flow for bypass vectors..."}, agent="lead_prosecutor", team=AgentTeam.PROSECUTION)
    await pub(EventType.AGENT_STATUS, {"status": "running", "message": "Synthesising rate-limit bypass fuzz cases..."}, agent="fuzzer", team=AgentTeam.PROSECUTION)

    # Defense starts simultaneously
    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Verifying password hash invariants remain intact..."}, agent="lead_defender", team=AgentTeam.DEFENSE)
    await _step(1.5)

    # Prosecution runs exploit in sandbox
    evidence_id_1 = uuid.uuid4()
    sha = hashlib.sha256(MOCK_EXPLOIT_STDOUT.encode()).hexdigest()
    await pub(
        EventType.EVIDENCE_RECORDED,
        {
            "evidence_id": str(evidence_id_1),
            "command": "python -m pytest tests/exploit/test_login_bypass.py -v",
            "exit_code": 1,
            "duration_ms": 2340,
            "stdout_snippet": MOCK_EXPLOIT_STDOUT[:500],
        },
        agent="fuzzer",
        team=AgentTeam.CLERK,
    )
    await _step(0.4)

    # Prosecution makes a claim with evidence
    claim_id_1 = uuid.uuid4()
    await pub(
        EventType.CLAIM_MADE,
        {
            "claim_id": str(claim_id_1),
            "side": "prosecution",
            "text": "username.lower() breaks rate-limiting: key 'Admin' is distinct from 'admin', allowing unlimited login attempts via case variants.",
            "severity": "critical",
            "evidence_id": str(evidence_id_1),
        },
        agent="lead_prosecutor",
        team=AgentTeam.PROSECUTION,
    )
    await _step(0.6)

    await pub(EventType.AGENT_MESSAGE, {"message": "EXPLOIT CONFIRMED: Rate-limit bypass via case-variant username. Exit code 1, test failed reproducibly."}, agent="lead_prosecutor", team=AgentTeam.PROSECUTION)
    await _step(0.5)

    # Defense runs tests
    evidence_id_2 = uuid.uuid4()
    sha2 = hashlib.sha256(MOCK_DEFENSE_STDOUT.encode()).hexdigest()
    await pub(
        EventType.EVIDENCE_RECORDED,
        {
            "evidence_id": str(evidence_id_2),
            "command": "python -m pytest tests/defense/ -v",
            "exit_code": 0,
            "duration_ms": 1820,
            "stdout_snippet": MOCK_DEFENSE_STDOUT[:500],
        },
        agent="test_writer",
        team=AgentTeam.CLERK,
    )
    await _step(0.3)

    defense_claim_id = uuid.uuid4()
    await pub(
        EventType.CLAIM_MADE,
        {
            "claim_id": str(defense_claim_id),
            "side": "defense",
            "text": "Password hashing, SQL injection protection, and bcrypt timing-safe comparison are all preserved. The change only affects username lookup, not security primitives.",
            "severity": "info",
            "evidence_id": str(evidence_id_2),
        },
        agent="lead_defender",
        team=AgentTeam.DEFENSE,
    )
    await _step(0.4)

    # A prosecution claim without evidence (will be discarded)
    discarded_claim_id = uuid.uuid4()
    await pub(
        EventType.CLAIM_MADE,
        {
            "claim_id": str(discarded_claim_id),
            "side": "prosecution",
            "text": "This change might also affect session token generation entropy.",
            "severity": "medium",
            "evidence_id": None,
        },
        agent="regression",
        team=AgentTeam.PROSECUTION,
    )
    await _step(0.3)

    # ── EVIDENCE FILTER ───────────────────────────────────────────────────
    await pub(EventType.PHASE_CHANGED, {"phase": "EVIDENCE_FILTER", "previous_phase": "ARGUMENTS"})
    await _step(0.6)

    # Discard the claim without evidence
    await pub(
        EventType.CLAIM_DISCARDED,
        {
            "claim_id": str(discarded_claim_id),
            "reason": "no_evidence",
        },
        agent="evidence_clerk",
        team=AgentTeam.CLERK,
    )
    await _step(0.5)

    # ── JURY ──────────────────────────────────────────────────────────────
    await pub(EventType.PHASE_CHANGED, {"phase": "JURY", "previous_phase": "EVIDENCE_FILTER"})
    await _step(0.8)

    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Reviewing evidence records..."}, agent="juror_1_security", team=AgentTeam.JURY)
    await _step(1.2)

    await pub(
        EventType.JUROR_VOTED,
        {
            "juror": "JUROR-1 // SECURITY",
            "vote": "FIX_FIRST",
            "reasoning": "The rate-limit bypass is reproducible (exit code 1, failing test confirmed). Authentication security boundary is violated. PR must address rate-limit key normalization before merge.",
        },
        agent="juror_1_security",
        team=AgentTeam.JURY,
    )
    await _step(0.9)

    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Analyzing formal invariants..."}, agent="juror_2_logic", team=AgentTeam.JURY)
    await _step(1.0)

    await pub(
        EventType.JUROR_VOTED,
        {
            "juror": "JUROR-2 // LOGIC",
            "vote": "FIX_FIRST",
            "reasoning": "The rate-limit counter keying on pre-normalization username violates the invariant that equivalent identities share rate-limit state. Defense evidence shows no regressions in other areas.",
        },
        agent="juror_2_logic",
        team=AgentTeam.JURY,
    )
    await _step(0.8)

    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Checking performance implications..."}, agent="juror_3_perf", team=AgentTeam.JURY)
    await _step(0.9)

    await pub(
        EventType.JUROR_VOTED,
        {
            "juror": "JUROR-3 // PERFORMANCE",
            "vote": "MERGE",
            "reasoning": "No performance regression observed. Defense tests pass cleanly. However, deferring to security jurors on the rate-limit concern.",
        },
        agent="juror_3_perf",
        team=AgentTeam.JURY,
    )
    await _step(0.6)

    # ── VERDICT ───────────────────────────────────────────────────────────
    await pub(EventType.PHASE_CHANGED, {"phase": "VERDICT", "previous_phase": "JURY"})
    await _step(1.0)

    await pub(EventType.AGENT_STATUS, {"status": "thinking", "message": "Computing verdict from jury votes and evidence..."}, agent="judge", team=AgentTeam.JUDGE)
    await _step(1.2)

    await pub(
        EventType.VERDICT_ISSUED,
        {
            "verdict": "FIX_FIRST",
            "summary": "PR #42 introduces a case-insensitive username lookup that inadvertently bypasses rate-limiting protections. The prosecution's exploit test (exit_code=1) reproducibly demonstrates that a user 'Admin' receives a fresh rate-limit counter distinct from 'admin'. Jury voted 2-1 for FIX_FIRST. Required fix: normalize username to lowercase BEFORE rate-limit key lookup, not just before DB query.",
            "per_claim_status": [
                {"claim_id": str(claim_id_1), "status": "admitted", "verdict_impact": "decisive"},
                {"claim_id": str(defense_claim_id), "status": "admitted", "verdict_impact": "mitigating"},
                {"claim_id": str(discarded_claim_id), "status": "discarded", "reason": "no_evidence"},
            ],
            "failing_test_snippet": FAILING_TEST_SNIPPET,
        },
        agent="judge",
        team=AgentTeam.JUDGE,
    )
    await _step(0.5)

    await pub(EventType.PHASE_CHANGED, {"phase": "FINISHED", "previous_phase": "VERDICT"})
    await pub(EventType.TRIAL_FINISHED, {"trial_id": str(tid), "verdict": "FIX_FIRST", "cost_usd": 0.0})
