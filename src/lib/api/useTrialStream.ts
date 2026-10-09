/**
 * useTrialStream – React hook that:
 * 1. Opens an EventSource to /api/trials/{id}/events
 * 2. Reduces SSE events into a TrialState object
 * 3. Handles reconnect with Last-Event-ID
 * 4. Exposes { phase, agents, claims, evidence, jurors, verdict, status, error }
 *
 * When VITE_USE_MOCK=true, uses the local mock replay instead.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentTeam,
  ClaimRecord,
  EvidenceRecord,
  EventType,
  JurorVote,
  RiskLevel,
  TrialEvent,
  TrialStatus,
  VerdictType,
  VoteRecord,
} from './client';

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:8000';

const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true';

// ── Per-agent state ──────────────────────────────────────────────────────────

export interface AgentState {
  name: string;
  team: AgentTeam | null;
  status: 'idle' | 'thinking' | 'running' | 'done' | 'error';
  message: string;
  lastUpdated: number;
}

// ── Juror state ──────────────────────────────────────────────────────────────

export interface JurorState {
  juror: string;
  vote: JurorVote | null;
  reasoning: string;
  voted: boolean;
}

// ── Full trial UI state ───────────────────────────────────────────────────────

export interface LiveTrialState {
  trialId: string;
  status: TrialStatus;
  phase: TrialStatus;
  risk: RiskLevel | null;
  agents: Record<string, AgentState>;
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  jurors: JurorState[];
  verdict: VerdictType | null;
  verdictSummary: string | null;
  failingTestSnippet: string | null;
  perClaimStatus: Array<Record<string, any>>;
  error: string | null;
  isConnected: boolean;
  isReconnecting: boolean;
  lastSeq: number;
}

const INITIAL_STATE = (trialId: string): LiveTrialState => ({
  trialId,
  status: 'QUEUED',
  phase: 'QUEUED',
  risk: null,
  agents: {},
  claims: [],
  evidence: [],
  jurors: [
    { juror: 'JUROR-1 // SECURITY', vote: null, reasoning: '', voted: false },
    { juror: 'JUROR-2 // LOGIC', vote: null, reasoning: '', voted: false },
    { juror: 'JUROR-3 // PERFORMANCE', vote: null, reasoning: '', voted: false },
  ],
  verdict: null,
  verdictSummary: null,
  failingTestSnippet: null,
  perClaimStatus: [],
  error: null,
  isConnected: false,
  isReconnecting: false,
  lastSeq: -1,
});

// ── Event reducer ─────────────────────────────────────────────────────────────

function reduceEvent(state: LiveTrialState, event: TrialEvent): LiveTrialState {
  const next = { ...state, lastSeq: event.seq };

  switch (event.type as EventType) {
    case 'phase_changed': {
      const phase = event.payload.phase as TrialStatus;
      return { ...next, phase, status: phase };
    }

    case 'agent_status': {
      const prev = state.agents[event.agent] || {};
      return {
        ...next,
        agents: {
          ...state.agents,
          [event.agent]: {
            name: event.agent,
            team: event.team,
            status: event.payload.status || 'idle',
            message: event.payload.message || '',
            lastUpdated: Date.now(),
            ...prev,
            // Override with fresh data
            status: event.payload.status,
            message: event.payload.message || '',
            lastUpdated: Date.now(),
          } as AgentState,
        },
      };
    }

    case 'agent_message': {
      const prev = state.agents[event.agent] || {};
      return {
        ...next,
        agents: {
          ...state.agents,
          [event.agent]: {
            ...(prev as AgentState),
            name: event.agent,
            team: event.team,
            message: event.payload.message || '',
            lastUpdated: Date.now(),
          } as AgentState,
        },
      };
    }

    case 'claim_made': {
      const p = event.payload;
      const claim: ClaimRecord = {
        id: p.claim_id,
        trial_id: state.trialId,
        side: p.side,
        agent: event.agent,
        text: p.text,
        severity: p.severity || 'medium',
        evidence_id: p.evidence_id || null,
        status: 'pending',
        failing_test_snippet: null,
      };
      // Avoid duplicates
      const existing = state.claims.find(c => c.id === claim.id);
      if (existing) return next;
      return { ...next, claims: [...state.claims, claim] };
    }

    case 'evidence_recorded': {
      const p = event.payload;
      const ev: EvidenceRecord = {
        id: p.evidence_id,
        trial_id: state.trialId,
        agent: event.agent,
        command: p.command,
        exit_code: p.exit_code,
        stdout: p.stdout_snippet || '',
        stderr: '',
        artifact_paths: [],
        sha256: '',
        started_at: event.ts,
        duration_ms: p.duration_ms || 0,
      };
      const existing = state.evidence.find(e => e.id === ev.id);
      if (existing) return next;
      return { ...next, evidence: [...state.evidence, ev] };
    }

    case 'claim_discarded': {
      const claimId = event.payload.claim_id;
      return {
        ...next,
        claims: state.claims.map(c =>
          c.id === claimId ? { ...c, status: 'discarded' } : c
        ),
      };
    }

    case 'juror_voted': {
      const p = event.payload;
      const updated = state.jurors.map(j =>
        j.juror === p.juror
          ? { ...j, vote: p.vote as JurorVote, reasoning: p.reasoning || '', voted: true }
          : j
      );
      // If juror not in initial list, add it
      const found = state.jurors.find(j => j.juror === p.juror);
      const jurors = found
        ? updated
        : [...updated, { juror: p.juror, vote: p.vote as JurorVote, reasoning: p.reasoning || '', voted: true }];
      return { ...next, jurors };
    }

    case 'verdict_issued': {
      const p = event.payload;
      return {
        ...next,
        verdict: p.verdict as VerdictType,
        verdictSummary: p.summary || null,
        failingTestSnippet: p.failing_test_snippet || null,
        perClaimStatus: p.per_claim_status || [],
      };
    }

    case 'trial_finished': {
      return { ...next, status: 'FINISHED', isConnected: false };
    }

    case 'error': {
      return {
        ...next,
        error: event.payload.error || 'Unknown error',
        status: 'ERROR',
        isConnected: false,
      };
    }

    default:
      return next;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTrialStream(trialId: string | null) {
  const [state, setState] = useState<LiveTrialState | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastSeqRef = useRef<number>(-1);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!trialId) return;

    const url = new URL(`${API_BASE}/api/trials/${trialId}/events`);
    if (lastSeqRef.current >= 0) {
      url.searchParams.set('lastEventId', String(lastSeqRef.current));
    }

    const es = new EventSource(url.toString());
    esRef.current = es;

    setState(prev => prev ? { ...prev, isConnected: true, isReconnecting: false } : {
      ...INITIAL_STATE(trialId),
      isConnected: true,
    });

    es.onmessage = (e) => {
      try {
        const event: TrialEvent = JSON.parse(e.data);
        lastSeqRef.current = event.seq;
        setState(prev => {
          const base = prev || INITIAL_STATE(trialId);
          return reduceEvent(base, event);
        });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setState(prev => prev ? { ...prev, isConnected: false, isReconnecting: true } : null);

      // Exponential backoff reconnect
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [trialId]);

  useEffect(() => {
    if (!trialId) return;
    if (USE_MOCK) return; // mock mode handled by MockTrialStream

    setState(INITIAL_STATE(trialId));
    connect();

    return () => {
      esRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [trialId, connect]);

  return state;
}

// ── Mock trial stream (local replay, no backend needed) ────────────────────

import { MOCK_TRIAL_EVENTS } from '../mockTrialEvents';

export function useMockTrialStream(trialId: string): LiveTrialState {
  const [state, setState] = useState<LiveTrialState>(INITIAL_STATE(trialId));
  const indexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    indexRef.current = 0;

    async function replay() {
      for (const event of MOCK_TRIAL_EVENTS) {
        if (cancelled) break;
        await new Promise(r => setTimeout(r, event._delay_ms || 600));
        if (cancelled) break;
        setState(prev => reduceEvent(prev, event));
      }
    }

    replay();
    return () => { cancelled = true; };
  }, [trialId]);

  return state;
}
