/**
 * Canned SSE events for the local mock trial replay.
 * These mirror what mock_trial.py emits through the backend SSE pipeline.
 * Used when VITE_USE_MOCK=true and for the Landing Page "Live Trial" section.
 */
import type { TrialEvent } from './api/client';

type MockEvent = TrialEvent & { _delay_ms: number };

export const MOCK_TRIAL_EVENTS: MockEvent[] = [
  {
    seq: 0, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'INTAKE', previous_phase: 'QUEUED' },
    ts: new Date().toISOString(), _delay_ms: 500,
  },
  {
    seq: 1, type: 'agent_status', agent: 'diff_analyst', team: 'intake',
    payload: { status: 'thinking', message: 'Parsing diff AST...' },
    ts: new Date().toISOString(), _delay_ms: 800,
  },
  {
    seq: 2, type: 'agent_status', agent: 'context_fetcher', team: 'intake',
    payload: { status: 'running', message: 'Fetching PR context from GitHub...' },
    ts: new Date().toISOString(), _delay_ms: 800,
  },
  {
    seq: 3, type: 'agent_status', agent: 'risk_classifier', team: 'intake',
    payload: { status: 'done', message: 'Risk classified: HIGH — authentication change detected' },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 4, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'ARGUMENTS', previous_phase: 'INTAKE' },
    ts: new Date().toISOString(), _delay_ms: 400,
  },
  {
    seq: 5, type: 'agent_status', agent: 'lead_prosecutor', team: 'prosecution',
    payload: { status: 'thinking', message: 'Analyzing case-insensitive login for bypass vectors...' },
    ts: new Date().toISOString(), _delay_ms: 900,
  },
  {
    seq: 6, type: 'agent_status', agent: 'lead_defender', team: 'defense',
    payload: { status: 'thinking', message: 'Verifying password hash invariants remain intact...' },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 7, type: 'agent_status', agent: 'fuzzer', team: 'prosecution',
    payload: { status: 'running', message: 'Synthesising rate-limit bypass fuzz cases...' },
    ts: new Date().toISOString(), _delay_ms: 1200,
  },
  {
    seq: 8, type: 'evidence_recorded', agent: 'fuzzer', team: 'clerk',
    payload: {
      evidence_id: 'ev-mock-001',
      command: 'python -m pytest tests/exploit/test_login_bypass.py -v',
      exit_code: 1,
      duration_ms: 2340,
      stdout_snippet: '=== Exploit Harness: login_case_insensitivity ===\n[FAIL] test_rate_limit_case_insensitive: Rate limit counter NOT shared across case variants.\nEXIT CODE: 1',
    },
    ts: new Date().toISOString(), _delay_ms: 500,
  },
  {
    seq: 9, type: 'claim_made', agent: 'lead_prosecutor', team: 'prosecution',
    payload: {
      claim_id: 'claim-mock-001',
      side: 'prosecution',
      text: "username.lower() breaks rate-limiting: key 'Admin' is distinct from 'admin', allowing unlimited login attempts via case variants.",
      severity: 'critical',
      evidence_id: 'ev-mock-001',
    },
    ts: new Date().toISOString(), _delay_ms: 700,
  },
  {
    seq: 10, type: 'agent_message', agent: 'lead_prosecutor', team: 'prosecution',
    payload: { message: 'EXPLOIT CONFIRMED: Rate-limit bypass via case-variant username. Exit code 1, test failed reproducibly.' },
    ts: new Date().toISOString(), _delay_ms: 500,
  },
  {
    seq: 11, type: 'evidence_recorded', agent: 'test_writer', team: 'clerk',
    payload: {
      evidence_id: 'ev-mock-002',
      command: 'python -m pytest tests/defense/ -v',
      exit_code: 0,
      duration_ms: 1820,
      stdout_snippet: '=== Defense Test Suite ===\n[+] test_password_hash_unchanged ... PASS\n[+] test_bcrypt_timing_safe ....... PASS\nAll 4 defense tests passed.\nEXIT CODE: 0',
    },
    ts: new Date().toISOString(), _delay_ms: 400,
  },
  {
    seq: 12, type: 'claim_made', agent: 'lead_defender', team: 'defense',
    payload: {
      claim_id: 'claim-mock-002',
      side: 'defense',
      text: 'Password hashing, SQL injection protection, and bcrypt timing-safe comparison are all preserved.',
      severity: 'info',
      evidence_id: 'ev-mock-002',
    },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 13, type: 'claim_made', agent: 'regression', team: 'prosecution',
    payload: {
      claim_id: 'claim-mock-003',
      side: 'prosecution',
      text: 'This change might also affect session token generation entropy.',
      severity: 'medium',
      evidence_id: null,
    },
    ts: new Date().toISOString(), _delay_ms: 400,
  },
  {
    seq: 14, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'EVIDENCE_FILTER', previous_phase: 'ARGUMENTS' },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 15, type: 'claim_discarded', agent: 'evidence_clerk', team: 'clerk',
    payload: { claim_id: 'claim-mock-003', reason: 'no_evidence' },
    ts: new Date().toISOString(), _delay_ms: 700,
  },
  {
    seq: 16, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'JURY', previous_phase: 'EVIDENCE_FILTER' },
    ts: new Date().toISOString(), _delay_ms: 500,
  },
  {
    seq: 17, type: 'agent_status', agent: 'juror_1_security', team: 'jury',
    payload: { status: 'thinking', message: 'Reviewing evidence records...' },
    ts: new Date().toISOString(), _delay_ms: 1200,
  },
  {
    seq: 18, type: 'juror_voted', agent: 'juror_1_security', team: 'jury',
    payload: {
      juror: 'JUROR-1 // SECURITY',
      vote: 'FIX_FIRST',
      reasoning: 'The rate-limit bypass is reproducible (exit code 1, failing test confirmed). Authentication security boundary is violated.',
    },
    ts: new Date().toISOString(), _delay_ms: 900,
  },
  {
    seq: 19, type: 'agent_status', agent: 'juror_2_logic', team: 'jury',
    payload: { status: 'thinking', message: 'Analyzing formal invariants...' },
    ts: new Date().toISOString(), _delay_ms: 1000,
  },
  {
    seq: 20, type: 'juror_voted', agent: 'juror_2_logic', team: 'jury',
    payload: {
      juror: 'JUROR-2 // LOGIC',
      vote: 'FIX_FIRST',
      reasoning: 'The rate-limit counter keying on pre-normalization username violates the invariant that equivalent identities share rate-limit state.',
    },
    ts: new Date().toISOString(), _delay_ms: 800,
  },
  {
    seq: 21, type: 'agent_status', agent: 'juror_3_perf', team: 'jury',
    payload: { status: 'thinking', message: 'Checking performance implications...' },
    ts: new Date().toISOString(), _delay_ms: 900,
  },
  {
    seq: 22, type: 'juror_voted', agent: 'juror_3_perf', team: 'jury',
    payload: {
      juror: 'JUROR-3 // PERFORMANCE',
      vote: 'MERGE',
      reasoning: 'No performance regression observed. Defense tests pass cleanly. Deferring to security jurors on the rate-limit concern.',
    },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 23, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'VERDICT', previous_phase: 'JURY' },
    ts: new Date().toISOString(), _delay_ms: 1000,
  },
  {
    seq: 24, type: 'agent_status', agent: 'judge', team: 'judge',
    payload: { status: 'thinking', message: 'Computing verdict from jury votes and evidence...' },
    ts: new Date().toISOString(), _delay_ms: 1200,
  },
  {
    seq: 25, type: 'verdict_issued', agent: 'judge', team: 'judge',
    payload: {
      verdict: 'FIX_FIRST',
      summary: "PR #42 introduces a case-insensitive username lookup that inadvertently bypasses rate-limiting protections. The prosecution's exploit test (exit_code=1) reproducibly demonstrates that a user 'Admin' receives a fresh rate-limit counter distinct from 'admin'. Jury voted 2-1 for FIX_FIRST. Required fix: normalize username to lowercase BEFORE rate-limit key lookup.",
      per_claim_status: [
        { claim_id: 'claim-mock-001', status: 'admitted', verdict_impact: 'decisive' },
        { claim_id: 'claim-mock-002', status: 'admitted', verdict_impact: 'mitigating' },
        { claim_id: 'claim-mock-003', status: 'discarded', reason: 'no_evidence' },
      ],
      failing_test_snippet: `def test_rate_limit_case_insensitive():
    create_user('admin', 'password123')
    for _ in range(4):
        login('admin', 'wrongpass')  # fills rate limit
    result = login('Admin', 'password123')  # bypasses!
    assert result.status == 'RATE_LIMITED'`,
    },
    ts: new Date().toISOString(), _delay_ms: 600,
  },
  {
    seq: 26, type: 'phase_changed', agent: 'system', team: null,
    payload: { phase: 'FINISHED', previous_phase: 'VERDICT' },
    ts: new Date().toISOString(), _delay_ms: 300,
  },
  {
    seq: 27, type: 'trial_finished', agent: 'system', team: null,
    payload: { verdict: 'FIX_FIRST', cost_usd: 0.0 },
    ts: new Date().toISOString(), _delay_ms: 0,
  },
];
