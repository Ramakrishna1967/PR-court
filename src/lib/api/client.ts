/**
 * Typed API client for PR Court backend.
 *
 * Uses VITE_API_URL (or falls back to NEXT_PUBLIC_API_URL for Next.js compat).
 * Set VITE_USE_MOCK=true to bypass real API calls.
 */

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof process !== 'undefined' && (process.env as any).NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000';

// ── Shared types (mirroring backend schemas.py) ────────────────────────────

export type TrialStatus =
  | 'QUEUED'
  | 'INTAKE'
  | 'ARGUMENTS'
  | 'EVIDENCE_FILTER'
  | 'REBUTTAL'
  | 'JURY'
  | 'VERDICT'
  | 'FINISHED'
  | 'ERROR'
  | 'INCONCLUSIVE';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerdictType = 'MERGE' | 'FIX_FIRST' | 'BLOCK' | 'INCONCLUSIVE';
export type ClaimSide = 'prosecution' | 'defense';
export type ClaimSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ClaimStatus = 'pending' | 'admitted' | 'discarded';
export type JurorVote = 'MERGE' | 'FIX_FIRST' | 'BLOCK';

export type EventType =
  | 'phase_changed'
  | 'agent_status'
  | 'agent_message'
  | 'claim_made'
  | 'evidence_recorded'
  | 'claim_discarded'
  | 'juror_voted'
  | 'verdict_issued'
  | 'error'
  | 'trial_finished';

export type AgentTeam = 'intake' | 'prosecution' | 'defense' | 'clerk' | 'jury' | 'judge';

export interface TrialEvent {
  seq: number;
  type: EventType;
  agent: string;
  team: AgentTeam | null;
  payload: Record<string, any>;
  ts: string;
}

export interface EvidenceRecord {
  id: string;
  trial_id: string;
  agent: string;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  artifact_paths: string[];
  sha256: string;
  started_at: string;
  duration_ms: number;
}

export interface ClaimRecord {
  id: string;
  trial_id: string;
  side: ClaimSide;
  agent: string;
  text: string;
  severity: ClaimSeverity;
  evidence_id: string | null;
  status: ClaimStatus;
  failing_test_snippet: string | null;
}

export interface VoteRecord {
  id: string;
  trial_id: string;
  juror: string;
  vote: JurorVote;
  reasoning: string;
}

export interface TrialSummary {
  id: string;
  repo: string;
  pr_number: number;
  head_sha: string;
  status: TrialStatus;
  risk: RiskLevel | null;
  verdict: VerdictType | null;
  summary: string | null;
  created_at: string;
  finished_at: string | null;
  cost_usd: number;
}

export interface TrialDetail extends TrialSummary {
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  votes: VoteRecord[];
}

export interface TrialListResponse {
  trials: TrialSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrialCreateResponse {
  trial_id: string;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new ApiError(`API error ${res.status}: ${detail}`, res.status);
  }
  return res.json() as Promise<T>;
}

// ── API surface ────────────────────────────────────────────────────────────

export const api = {
  /**
   * POST /api/trials – start a new trial
   */
  createTrial: (repo: string, pr_number: number): Promise<TrialCreateResponse> =>
    request<TrialCreateResponse>('/api/trials', {
      method: 'POST',
      body: JSON.stringify({ repo, pr_number }),
    }),

  /**
   * GET /api/trials – list trials with optional filters
   */
  listTrials: (params?: {
    repo?: string;
    verdict?: string;
    risk?: string;
    page?: number;
  }): Promise<TrialListResponse> => {
    const q = new URLSearchParams();
    if (params?.repo) q.set('repo', params.repo);
    if (params?.verdict) q.set('verdict', params.verdict);
    if (params?.risk) q.set('risk', params.risk);
    if (params?.page) q.set('page', String(params.page));
    return request<TrialListResponse>(`/api/trials?${q}`);
  },

  /**
   * GET /api/trials/{id} – full trial detail
   */
  getTrial: (id: string): Promise<TrialDetail> =>
    request<TrialDetail>(`/api/trials/${id}`),

  /**
   * POST /api/trials/{id}/appeal – re-run with appeal instructions
   */
  appealTrial: (id: string, instructions: string): Promise<TrialCreateResponse> =>
    request<TrialCreateResponse>(`/api/trials/${id}/appeal`, {
      method: 'POST',
      body: JSON.stringify({ instructions }),
    }),

  /**
   * GET /api/health
   */
  health: () => request<{ status: string; mock_mode: boolean }>('/api/health'),
};

export { ApiError };
