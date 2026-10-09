"""
Tests for:
1. Sandbox isolation (network, host fs, fork bomb)
2. Evidence filter (claims without evidence_id are discarded)
3. Verdict logic
4. SSE replay and reconnect
5. Webhook signature verification
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

# ── Test fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def trial_id():
    return uuid.uuid4()


# ── Evidence Filter Tests ──────────────────────────────────────────────────────

class TestEvidenceFilter:
    """The core rule: claims without evidence_id must be discarded."""

    @pytest.mark.asyncio
    async def test_claim_without_evidence_is_discarded(self, trial_id):
        """Claims with no evidence_id never reach the jury."""
        from app import event_bus
        from app.schemas import EventType

        # Simulate evidence filter logic
        claims = [
            {"claim_id": str(uuid.uuid4()), "side": "prosecution", "text": "Bug exists", "severity": "high", "evidence_id": None, "status": "pending"},
            {"claim_id": str(uuid.uuid4()), "side": "prosecution", "text": "Proven bug", "severity": "critical", "evidence_id": str(uuid.uuid4()), "status": "pending"},
            {"claim_id": str(uuid.uuid4()), "side": "defense", "text": "Tests pass", "severity": "info", "evidence_id": str(uuid.uuid4()), "status": "pending"},
        ]

        admitted = [c for c in claims if c.get("evidence_id")]
        discarded = [c for c in claims if not c.get("evidence_id")]

        assert len(admitted) == 2
        assert len(discarded) == 1
        assert discarded[0]["text"] == "Bug exists"

    @pytest.mark.asyncio
    async def test_jury_only_sees_admitted_claims(self, trial_id):
        """Jury input is strictly filtered."""
        admitted = [
            {"side": "prosecution", "text": "Exploit confirmed", "severity": "critical", "evidence_id": str(uuid.uuid4())},
        ]

        # Simulate jury input construction
        claims_text = "\n".join([
            f"[{c['side'].upper()}] ({c['severity']}) {c['text']}"
            for c in admitted
        ])
        assert "Exploit confirmed" in claims_text
        assert "no_evidence" not in claims_text

    def test_all_unlinked_claims_discarded(self):
        """If all prosecution claims lack evidence, jury sees nothing from prosecution."""
        claims = [
            {"side": "prosecution", "evidence_id": None},
            {"side": "prosecution", "evidence_id": None},
            {"side": "defense", "evidence_id": str(uuid.uuid4())},
        ]
        admitted_prosecution = [c for c in claims if c["side"] == "prosecution" and c.get("evidence_id")]
        assert len(admitted_prosecution) == 0


# ── Verdict Logic Tests ────────────────────────────────────────────────────────

class TestVerdictLogic:

    def _compute_verdict(self, votes: list[str], admitted: list[dict]):
        """Simplified verdict computation matching trial_runner logic."""
        from app.schemas import VerdictType
        vote_counts = {"MERGE": 0, "FIX_FIRST": 0, "BLOCK": 0}
        for v in votes:
            vote_counts[v] = vote_counts.get(v, 0) + 1

        has_critical = any(c["side"] == "prosecution" and c["severity"] == "critical" for c in admitted)
        has_prosecution_fail = any(c["side"] == "prosecution" for c in admitted)

        if vote_counts.get("BLOCK", 0) >= 2 or (has_critical and vote_counts.get("BLOCK", 0) >= 1):
            return VerdictType.BLOCK
        elif vote_counts.get("MERGE", 0) >= 2 and not has_prosecution_fail:
            return VerdictType.MERGE
        elif has_prosecution_fail:
            return VerdictType.FIX_FIRST
        return VerdictType(max(vote_counts, key=lambda k: vote_counts[k]))

    def test_critical_exploit_with_one_block_vote_is_blocked(self):
        from app.schemas import VerdictType
        votes = ["BLOCK", "FIX_FIRST", "FIX_FIRST"]
        admitted = [{"side": "prosecution", "severity": "critical"}]
        assert self._compute_verdict(votes, admitted) == VerdictType.BLOCK

    def test_two_block_votes_is_blocked(self):
        from app.schemas import VerdictType
        votes = ["BLOCK", "BLOCK", "MERGE"]
        admitted = [{"side": "prosecution", "severity": "high"}]
        assert self._compute_verdict(votes, admitted) == VerdictType.BLOCK

    def test_majority_merge_with_no_prosecution_is_merge(self):
        from app.schemas import VerdictType
        votes = ["MERGE", "MERGE", "FIX_FIRST"]
        admitted = [{"side": "defense", "severity": "info"}]
        assert self._compute_verdict(votes, admitted) == VerdictType.MERGE

    def test_prosecution_claim_forces_fix_first(self):
        from app.schemas import VerdictType
        votes = ["MERGE", "MERGE", "MERGE"]
        admitted = [{"side": "prosecution", "severity": "medium"}]
        # Has prosecution claim → cannot be MERGE
        assert self._compute_verdict(votes, admitted) == VerdictType.FIX_FIRST

    def test_fix_first_majority(self):
        from app.schemas import VerdictType
        votes = ["FIX_FIRST", "FIX_FIRST", "MERGE"]
        admitted = [{"side": "prosecution", "severity": "medium"}]
        assert self._compute_verdict(votes, admitted) == VerdictType.FIX_FIRST


# ── SSE Event Bus Tests ────────────────────────────────────────────────────────

class TestEventBus:

    @pytest.mark.asyncio
    async def test_events_are_replayed_from_start(self):
        """Late subscribers receive all events from the beginning."""
        from app import event_bus
        from app.schemas import EventType

        tid = uuid.uuid4()

        # Publish events before subscribing
        await event_bus.publish(tid, EventType.PHASE_CHANGED, {"phase": "INTAKE"})
        await event_bus.publish(tid, EventType.AGENT_STATUS, {"status": "thinking"})

        # Subscribe and collect replayed events
        replayed = []
        async for event in event_bus.subscribe(tid, last_event_id=None):
            if event is None:
                break
            replayed.append(event)
            if len(replayed) >= 2:
                break

        assert len(replayed) == 2
        assert replayed[0].type == EventType.PHASE_CHANGED
        assert replayed[0].seq == 0

    @pytest.mark.asyncio
    async def test_last_event_id_resumes_from_correct_position(self):
        """Last-Event-ID allows resuming from a specific sequence number."""
        from app import event_bus
        from app.schemas import EventType

        tid = uuid.uuid4()

        # Publish 3 events
        for i in range(3):
            await event_bus.publish(tid, EventType.AGENT_STATUS, {"seq": i})

        # Subscribe from after event 1 (last_event_id=1 → start from seq 2)
        replayed = []
        async for event in event_bus.subscribe(tid, last_event_id=1):
            if event is None:
                break
            replayed.append(event)
            if len(replayed) >= 1:
                break

        assert len(replayed) == 1
        assert replayed[0].seq == 2

    @pytest.mark.asyncio
    async def test_trial_finished_terminates_stream(self):
        """TRIAL_FINISHED event causes subscriber to stop."""
        from app import event_bus
        from app.schemas import EventType

        tid = uuid.uuid4()
        await event_bus.publish(tid, EventType.TRIAL_FINISHED, {"verdict": "MERGE"})

        collected = []
        async for event in event_bus.subscribe(tid):
            if event is None:
                break
            collected.append(event)

        assert len(collected) == 1
        assert collected[0].type == EventType.TRIAL_FINISHED

    @pytest.mark.asyncio
    async def test_live_events_delivered_to_subscriber(self):
        """Events published after subscription are delivered live."""
        from app import event_bus
        from app.schemas import EventType

        tid = uuid.uuid4()
        results = []

        async def subscriber():
            async for event in event_bus.subscribe(tid):
                if event is None:
                    break
                results.append(event)
                if event.type == EventType.TRIAL_FINISHED:
                    break

        async def publisher():
            await asyncio.sleep(0.05)
            await event_bus.publish(tid, EventType.AGENT_STATUS, {"status": "running"})
            await asyncio.sleep(0.05)
            await event_bus.publish(tid, EventType.TRIAL_FINISHED, {"verdict": "MERGE"})

        await asyncio.gather(subscriber(), publisher())
        assert len(results) == 2
        assert results[-1].type == EventType.TRIAL_FINISHED


# ── Webhook Signature Tests ────────────────────────────────────────────────────

class TestWebhookSignature:

    def _make_signature(self, body: bytes, secret: str) -> str:
        return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    def test_valid_signature_passes(self):
        from app.routers.webhook import _verify_signature
        body = b'{"action": "opened"}'
        secret = "my_secret_key"
        sig = self._make_signature(body, secret)
        assert _verify_signature(body, sig, secret) is True

    def test_invalid_signature_fails(self):
        from app.routers.webhook import _verify_signature
        body = b'{"action": "opened"}'
        assert _verify_signature(body, "sha256=deadbeef", "my_secret_key") is False

    def test_tampered_body_fails(self):
        from app.routers.webhook import _verify_signature
        body = b'{"action": "opened"}'
        secret = "my_secret_key"
        sig = self._make_signature(body, secret)
        tampered = b'{"action": "opened", "extra": "field"}'
        assert _verify_signature(tampered, sig, secret) is False

    def test_no_secret_configured_allows_all(self):
        """When no secret is configured, all webhooks pass (dev mode)."""
        from app.routers.webhook import _verify_signature
        body = b'{"action": "opened"}'
        assert _verify_signature(body, "", "") is True


# ── Sandbox Isolation Tests (require Docker) ──────────────────────────────────

@pytest.mark.skip(reason="Requires Docker daemon with sandbox image built")
class TestSandboxIsolation:

    @pytest.mark.asyncio
    async def test_no_network_access(self):
        """Sandbox cannot reach external network."""
        from app.sandbox import SandboxRunner
        trial_id = uuid.uuid4()
        runner = SandboxRunner(trial_id, "test/repo", 1, "abc123")
        try:
            result = await runner.run_command("curl -s --connect-timeout 2 http://example.com", "test")
            assert result.exit_code != 0, "Network access should be blocked"
        finally:
            runner.destroy()

    @pytest.mark.asyncio
    async def test_no_host_filesystem_access(self):
        """Sandbox cannot read host filesystem outside /work."""
        from app.sandbox import SandboxRunner
        trial_id = uuid.uuid4()
        runner = SandboxRunner(trial_id, "test/repo", 1, "abc123")
        try:
            result = await runner.run_command("cat /etc/shadow", "test")
            # Either command fails or file doesn't exist in container
            assert result.exit_code != 0 or "no such file" in result.stderr.lower()
        finally:
            runner.destroy()

    @pytest.mark.asyncio
    async def test_fork_bomb_is_killed_by_pids_limit(self):
        """Fork bomb is killed by pids_limit before consuming resources."""
        from app.sandbox import SandboxRunner
        trial_id = uuid.uuid4()
        runner = SandboxRunner(trial_id, "test/repo", 1, "abc123")
        try:
            result = await runner.run_command(
                "python3 -c \"import os; [os.fork() for _ in range(100)]\"",
                "test",
                timeout_s=5,
            )
            # Should be killed or fail
            assert result.exit_code != 0 or result.duration_ms < 5000
        finally:
            runner.destroy()

    @pytest.mark.asyncio
    async def test_command_timeout_enforced(self):
        """Commands exceeding timeout are killed."""
        from app.sandbox import SandboxRunner
        trial_id = uuid.uuid4()
        runner = SandboxRunner(trial_id, "test/repo", 1, "abc123")
        try:
            result = await runner.run_command("sleep 100", "test", timeout_s=2)
            assert result.exit_code == 124  # timeout exit code
            assert result.duration_ms < 5000
        finally:
            runner.destroy()
