/**
 * LiveTrialView – the real-time courtroom screen wired to the SSE backend.
 * Shown when a trial is in progress.
 * Uses useTrialStream (real) or useMockTrialStream (VITE_USE_MOCK=true).
 */
import React, { useEffect, useRef } from 'react';
import type { LiveTrialState, AgentState } from '../lib/api/useTrialStream';
import type { ClaimRecord, EvidenceRecord, JurorVote, TrialStatus } from '../lib/api/client';

interface Props {
  trialId: string;
  trial: LiveTrialState;
  onClose?: () => void;
}

const PHASE_STEPS: TrialStatus[] = ['QUEUED', 'INTAKE', 'ARGUMENTS', 'EVIDENCE_FILTER', 'JURY', 'VERDICT', 'FINISHED'];
const PHASE_LABELS: Record<string, string> = {
  QUEUED: '0. Queued',
  INTAKE: '1. Intake',
  ARGUMENTS: '2. Arguments',
  EVIDENCE_FILTER: '3. Evidence',
  REBUTTAL: '3b. Rebuttal',
  JURY: '4. Jury',
  VERDICT: '5. Verdict',
  FINISHED: '✓ Finished',
  ERROR: '✗ Error',
  INCONCLUSIVE: '? Inconclusive',
};

function StatusDot({ status }: { status: AgentState['status'] }) {
  const colors: Record<string, string> = {
    idle: 'bg-zinc-500',
    thinking: 'bg-amber-400 animate-pulse',
    running: 'bg-emerald-400 animate-ping',
    done: 'bg-emerald-400',
    error: 'bg-red-500',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-zinc-500'}`} />;
}

function AgentCard({ agent }: { agent: AgentState }) {
  const teamColors: Record<string, string> = {
    prosecution: 'border-red-500/30 bg-red-950/10',
    defense: 'border-blue-500/30 bg-blue-950/10',
    intake: 'border-zinc-500/30 bg-zinc-900/20',
    clerk: 'border-amber-500/30 bg-amber-950/10',
    jury: 'border-purple-500/30 bg-purple-950/10',
    judge: 'border-white/30 bg-zinc-900/20',
  };
  const borderClass = agent.team ? (teamColors[agent.team] || 'border-zinc-700') : 'border-zinc-700';

  return (
    <div className={`p-2 border ${borderClass} font-mono text-[10px] space-y-1`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-zinc-300 font-semibold truncate">{agent.name}</span>
        <div className="flex items-center gap-1">
          <StatusDot status={agent.status} />
          <span className="text-zinc-500 uppercase">{agent.status}</span>
        </div>
      </div>
      {agent.message && (
        <p className="text-zinc-400 leading-snug truncate" title={agent.message}>
          {agent.message}
        </p>
      )}
    </div>
  );
}

function PhaseStepper({ current }: { current: string }) {
  const steps = PHASE_STEPS;
  const currentIdx = steps.indexOf(current as TrialStatus);

  return (
    <div className="grid grid-cols-7 border-b border-white/[0.08] text-center font-mono text-[10px] uppercase">
      {steps.map((step, i) => {
        const isCompleted = currentIdx > i;
        const isCurrent = currentIdx === i;
        return (
          <div
            key={step}
            className={`py-2 border-r last:border-r-0 border-white/[0.08] flex items-center justify-center gap-1 ${
              isCurrent
                ? 'bg-[#2a2a2d] text-white font-semibold'
                : isCompleted
                ? 'bg-[#1b1b1e] text-zinc-300'
                : 'text-zinc-600'
            }`}
          >
            {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            {isCompleted && <span className="text-emerald-400">✓</span>}
            <span className="hidden md:inline">{PHASE_LABELS[step] || step}</span>
            <span className="md:hidden">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function ClaimFeed({ claims }: { claims: ClaimRecord[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [claims.length]);

  return (
    <div ref={feedRef} className="h-48 overflow-y-auto space-y-1 font-mono text-[10px]">
      {claims.length === 0 && (
        <div className="text-zinc-600 text-center pt-8">Awaiting claims...</div>
      )}
      {claims.map((claim) => {
        const isDiscarded = claim.status === 'discarded';
        const sideColor = claim.side === 'prosecution' ? 'text-red-400' : 'text-blue-400';
        const severityBg: Record<string, string> = {
          critical: 'bg-red-950/30 border-red-500/20',
          high: 'bg-orange-950/20 border-orange-500/20',
          medium: 'bg-zinc-900 border-zinc-700',
          low: 'bg-zinc-900 border-zinc-800',
          info: 'bg-blue-950/10 border-blue-900/30',
        };
        return (
          <div
            key={claim.id}
            className={`p-2 border rounded-none ${isDiscarded ? 'opacity-40' : ''} ${severityBg[claim.severity] || 'border-zinc-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`uppercase font-semibold ${sideColor}`}>{claim.side}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500 uppercase">{claim.severity}</span>
              {isDiscarded && (
                <span className="ml-auto text-zinc-500 line-through">NO EVIDENCE</span>
              )}
              {claim.evidence_id && !isDiscarded && (
                <span className="ml-auto text-emerald-400">✓ evidence</span>
              )}
            </div>
            <p className={`text-zinc-300 mt-0.5 leading-snug ${isDiscarded ? 'line-through text-zinc-500' : ''}`}>
              {claim.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EvidenceFeed({ evidence }: { evidence: EvidenceRecord[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [evidence.length]);

  return (
    <div ref={feedRef} className="h-48 overflow-y-auto space-y-1 font-mono text-[10px]">
      {evidence.length === 0 && (
        <div className="text-zinc-600 text-center pt-8">Awaiting sandbox results...</div>
      )}
      {evidence.map((ev) => (
        <div key={ev.id} className="p-2 bg-[#050506] border border-white/[0.06]">
          <div className="flex items-center justify-between gap-2">
            <span className={ev.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'}>
              EXIT:{ev.exit_code}
            </span>
            <span className="text-zinc-500">{ev.duration_ms}ms</span>
            <span className="text-zinc-600 truncate flex-1 text-right">{ev.agent}</span>
          </div>
          <code className="text-zinc-500 block truncate">$ {ev.command}</code>
          {ev.stdout && (
            <pre className="text-zinc-400 mt-1 whitespace-pre-wrap leading-snug max-h-16 overflow-hidden">
              {ev.stdout.slice(0, 300)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function JuryPanel({ jurors, votes }: { jurors: LiveTrialState['jurors']; votes?: never[] }) {
  const voteColor: Record<string, string> = {
    FIX_FIRST: 'text-amber-400',
    BLOCK: 'text-red-400',
    MERGE: 'text-emerald-400',
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {jurors.map((j) => (
        <div key={j.juror} className="p-3 bg-[#0e0e11] border border-white/[0.08] font-mono text-[10px] space-y-1">
          <div className="text-zinc-500 uppercase">{j.juror}</div>
          {j.voted ? (
            <>
              <div className={`font-bold text-sm ${voteColor[j.vote || ''] || 'text-zinc-300'}`}>
                [{j.vote}]
              </div>
              <p className="text-zinc-400 leading-snug line-clamp-3">{j.reasoning}</p>
            </>
          ) : (
            <div className="text-zinc-600 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" />
              Deliberating...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VerdictCard({ verdict, summary, failingTest }: {
  verdict: string;
  summary: string | null;
  failingTest: string | null;
}) {
  const verdictStyles: Record<string, { color: string; border: string; label: string }> = {
    MERGE: { color: 'text-emerald-400', border: 'border-emerald-500/40 bg-emerald-950/20', label: '✓ MERGE ORDER APPROVED' },
    FIX_FIRST: { color: 'text-amber-400', border: 'border-amber-500/40 bg-amber-950/20', label: '⚠ FIX FIRST — BLOCK UNTIL RESOLVED' },
    BLOCK: { color: 'text-red-400', border: 'border-red-500/40 bg-red-950/20', label: '✗ BLOCK — CRITICAL EXPLOIT CONFIRMED' },
    INCONCLUSIVE: { color: 'text-zinc-400', border: 'border-zinc-600/40 bg-zinc-900/20', label: '? INCONCLUSIVE' },
  };
  const style = verdictStyles[verdict] || verdictStyles.INCONCLUSIVE;

  return (
    <div className={`p-4 border font-mono ${style.border} space-y-3`}>
      <div className={`text-lg font-bold tracking-wider ${style.color}`}>{style.label}</div>
      {summary && <p className="text-zinc-300 text-xs leading-relaxed">{summary}</p>}
      {failingTest && (
        <div>
          <div className="text-[10px] uppercase text-red-400 mb-1">Reproducible Failing Test:</div>
          <pre className="text-red-300 bg-red-950/20 border border-red-500/20 p-2 text-[10px] whitespace-pre-wrap overflow-auto max-h-32">
            {failingTest}
          </pre>
        </div>
      )}
    </div>
  );
}

export const LiveTrialView: React.FC<Props> = ({ trialId, trial, onClose }) => {
  const agents = Object.values(trial.agents);
  const prosecutionAgents = agents.filter(a => a.team === 'prosecution');
  const defenseAgents = agents.filter(a => a.team === 'defense');

  const connectionBadge = trial.isReconnecting
    ? <span className="text-amber-400 animate-pulse text-[10px]">● RECONNECTING...</span>
    : trial.isConnected
    ? <span className="text-emerald-400 text-[10px]">● LIVE</span>
    : <span className="text-zinc-500 text-[10px]">● DISCONNECTED</span>;

  return (
    <div className="border border-white/[0.08] bg-[#0e0e11]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase text-zinc-400 border border-white/10 px-2 py-0.5">
            TRIAL #{trialId.slice(-8).toUpperCase()}
          </span>
          {connectionBadge}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">✕</button>
        )}
      </div>

      {/* Phase stepper */}
      <PhaseStepper current={trial.phase} />

      {trial.error && (
        <div className="p-4 bg-red-950/20 border-b border-red-500/30 font-mono text-xs text-red-300">
          ✗ ERROR: {trial.error}
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
        {/* Prosecution column */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
            <span className="w-2 h-2 bg-red-400" />
            <span className="font-mono text-xs text-red-300 uppercase font-semibold">Prosecution</span>
          </div>
          {prosecutionAgents.length === 0 ? (
            <div className="text-zinc-600 font-mono text-[10px]">Awaiting prosecution agents...</div>
          ) : (
            prosecutionAgents.map(a => <AgentCard key={a.name} agent={a} />)
          )}
        </div>

        {/* Center: evidence feed */}
        <div className="p-4 bg-[#070709] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-300 uppercase">Evidence Feed</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              {trial.evidence.length} records
            </span>
          </div>

          <div>
            <div className="text-[10px] uppercase text-zinc-500 mb-1">Claims</div>
            <ClaimFeed claims={trial.claims} />
          </div>

          <div className="mt-2">
            <div className="text-[10px] uppercase text-zinc-500 mb-1">Sandbox Output</div>
            <EvidenceFeed evidence={trial.evidence} />
          </div>
        </div>

        {/* Defense column */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
            <span className="w-2 h-2 bg-blue-400" />
            <span className="font-mono text-xs text-blue-300 uppercase font-semibold">Defense</span>
          </div>
          {defenseAgents.length === 0 ? (
            <div className="text-zinc-600 font-mono text-[10px]">Awaiting defense agents...</div>
          ) : (
            defenseAgents.map(a => <AgentCard key={a.name} agent={a} />)
          )}
        </div>
      </div>

      {/* Jury deliberation strip */}
      <div className="p-4 border-t border-white/[0.08] bg-[#1b1b1e] space-y-3">
        <div className="text-[10px] uppercase text-zinc-500 font-mono">Jury Triad Deliberation</div>
        <JuryPanel jurors={trial.jurors} />
      </div>

      {/* Verdict card (shows when done) */}
      {trial.verdict && (
        <div className="p-4 border-t border-white/[0.08]">
          <VerdictCard
            verdict={trial.verdict}
            summary={trial.verdictSummary}
            failingTest={trial.failingTestSnippet}
          />
        </div>
      )}
    </div>
  );
};
