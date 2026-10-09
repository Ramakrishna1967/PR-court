import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client';
import type { TrialSummary, VerdictType } from '../lib/api/client';
import { INITIAL_TRIAL_CASES } from '../data/mockData';
import type { TrialCase, VerdictStatus } from '../types';

const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true';

interface VerdictsViewProps {
  cases: TrialCase[];
  onOpenTrialModal: () => void;
  onAppealCase: (caseId: string) => void;
}

type DisplayCase = {
  id: string;
  prNumber: number;
  title: string;
  repository: string;
  author: string;
  date: string;
  status: VerdictStatus;
  riskScore: 'LOW' | 'MEDIUM' | 'CRITICAL';
  clockMs: number;
  summary: string | null;
  // extended (from real API)
  isReal?: boolean;
};

function apiToDisplay(t: TrialSummary): DisplayCase {
  const statusMap: Record<string, VerdictStatus> = {
    MERGE: 'APPROVED',
    FIX_FIRST: 'CONDITIONAL',
    BLOCK: 'REJECTED',
    INCONCLUSIVE: 'CONDITIONAL',
  };
  const riskMap: Record<string, 'LOW' | 'MEDIUM' | 'CRITICAL'> = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'CRITICAL',
  };
  return {
    id: t.id,
    prNumber: t.pr_number,
    title: `${t.repo} PR #${t.pr_number}`,
    repository: t.repo,
    author: 'github',
    date: new Date(t.created_at).toUTCString(),
    status: statusMap[t.verdict || 'INCONCLUSIVE'] || 'CONDITIONAL',
    riskScore: riskMap[t.risk || 'LOW'] || 'LOW',
    clockMs: 0,
    summary: t.summary,
    isReal: true,
  };
}

function mockToDisplay(c: TrialCase): DisplayCase {
  return {
    id: c.id,
    prNumber: c.prNumber,
    title: c.title,
    repository: c.repository,
    author: c.author,
    date: c.date,
    status: c.status,
    riskScore: c.riskScore,
    clockMs: c.telemetry.clockMs,
    summary: c.determinationSummary,
    isReal: false,
  };
}

const getStatusBadge = (status: VerdictStatus) => {
  switch (status) {
    case 'APPROVED': return { label: 'MERGE APPROVED', style: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20', dot: 'bg-emerald-400' };
    case 'REJECTED': return { label: 'BLOCKED · FAILED', style: 'border-red-500/30 text-red-400 bg-red-950/20', dot: 'bg-red-400' };
    case 'CONDITIONAL': return { label: 'CONDITIONAL PASS', style: 'border-amber-500/30 text-amber-400 bg-amber-950/20', dot: 'bg-amber-400' };
    case 'APPEALED': return { label: 'APPEAL RESTORED', style: 'border-sky-500/30 text-sky-400 bg-sky-950/20', dot: 'bg-sky-400' };
  }
};

export const VerdictsView: React.FC<VerdictsViewProps> = ({ cases, onOpenTrialModal, onAppealCase }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [apiCases, setApiCases] = useState<DisplayCase[]>([]);
  const [isLoading, setIsLoading] = useState(!USE_MOCK);
  const [apiError, setApiError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch real trials from backend
  useEffect(() => {
    if (USE_MOCK) return;
    setIsLoading(true);
    api.listTrials({ page })
      .then(res => {
        setApiCases(res.trials.map(apiToDisplay));
        setTotal(res.total);
      })
      .catch(e => setApiError(String(e)))
      .finally(() => setIsLoading(false));
  }, [page]);

  // Combine mock + real cases
  const mockDisplayCases = cases.map(mockToDisplay);
  const allCases: DisplayCase[] = USE_MOCK
    ? mockDisplayCases
    : [...apiCases, ...mockDisplayCases];

  const filteredCases = allCases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.repository.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.prNumber).includes(searchTerm);
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const [selectedCase, setSelectedCase] = useState<DisplayCase | null>(filteredCases[0] || null);

  useEffect(() => {
    if (!selectedCase && filteredCases.length > 0) {
      setSelectedCase(filteredCases[0]);
    }
  }, [filteredCases.length]);

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-12 text-[#e4e1e6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 border border-white/10 px-2 py-0.5 bg-[#0e0e11]">
              IMMUTABLE DOCKET LEDGER
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {total || allCases.length} ADJUDICATED CASES
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-white tracking-tight">
            Court <span className="font-serif italic text-zinc-300 font-normal">Verdicts.</span>
          </h1>
          <p className="mt-2 font-mono text-zinc-400 text-xs sm:text-sm">
            Auditable trail of PR trials, adversarial claims, formal invariants, and signed jury consensus tokens.
          </p>
        </div>
        <button
          onClick={onOpenTrialModal}
          className="px-5 py-2.5 bg-white text-black font-mono text-xs uppercase font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <span>Submit PR for Verdict</span>
          <span>+</span>
        </button>
      </div>

      {/* Error state */}
      {apiError && (
        <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 font-mono text-xs text-red-300">
          ✗ Backend unavailable: {apiError}. Showing demo data.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="mb-4 flex items-center gap-2 font-mono text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
          Fetching trial records...
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 border-b border-white/[0.08] mb-8 font-mono text-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PR #, filename, repo, author..."
            className="w-full bg-[#0e0e11] border border-white/10 text-white pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-white transition-colors"
          />
          <span className="absolute left-2.5 top-2 text-zinc-500 text-[16px]">⌕</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'APPROVED', 'REJECTED', 'CONDITIONAL', 'APPEALED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 border transition-colors whitespace-nowrap text-[11px] uppercase ${
                filterStatus === status
                  ? 'border-white bg-[#2a2a2d] text-white font-semibold'
                  : 'border-white/10 bg-[#131316] text-zinc-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Case list */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 border border-white/10 bg-[#0e0e11]">
              {isLoading ? 'Loading...' : 'No dockets found matching criteria.'}
            </div>
          ) : (
            filteredCases.map((c) => {
              const badge = getStatusBadge(c.status);
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-white bg-[#1b1b1e] shadow-lg'
                      : 'border-white/[0.08] bg-[#0e0e11] hover:border-white/20 hover:bg-[#131316]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-white font-semibold text-xs">
                      #{c.prNumber} · {c.title}
                    </span>
                    <span className={`px-2 py-0.5 border text-[10px] uppercase flex items-center gap-1.5 ${badge.style}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{c.repository}</span>
                    <span className="text-zinc-500">by {c.author}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{c.clockMs ? `TRIED IN: ${c.clockMs}ms` : new Date(c.date).toLocaleDateString()}</span>
                    <span>RISK: {c.riskScore}</span>
                    {c.isReal && <span className="text-emerald-400">● LIVE</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected case dossier */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="border border-white/[0.08] bg-[#0e0e11] p-6 font-mono text-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-zinc-500">DOCKET DOSSIER</span>
                    <span className="text-[10px] text-zinc-400">ID: {selectedCase.id}</span>
                  </div>
                  <h2 className="font-serif text-2xl text-white mt-1">
                    #{selectedCase.prNumber} · {selectedCase.title}
                  </h2>
                  <div className="text-zinc-400 text-xs mt-1">
                    Repo: <span className="text-white">{selectedCase.repository}</span> · Author: <span className="text-white">{selectedCase.author}</span> · {selectedCase.date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCase.status !== 'APPEALED' && (
                    <button
                      onClick={() => onAppealCase(selectedCase.id)}
                      className="px-3 py-1.5 border border-white/20 hover:border-white/40 text-xs text-white uppercase bg-[#18181b] transition-colors"
                    >
                      File Appeal
                    </button>
                  )}
                  <span className={`px-3 py-1 border text-xs uppercase flex items-center gap-1.5 ${getStatusBadge(selectedCase.status).style}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedCase.status).dot}`} />
                    <span>{getStatusBadge(selectedCase.status).label}</span>
                  </span>
                </div>
              </div>

              {/* Summary / verdict */}
              {selectedCase.summary && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-white font-semibold">Verdict Summary</div>
                  <p className="text-zinc-300 leading-relaxed">{selectedCase.summary}</p>
                </div>
              )}

              {/* Hash footer */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-500">
                <span>ID: {selectedCase.id.slice(0, 16)}...</span>
                <span>PR_COURT_ORACLE_KEY_2026</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 border border-white/10 bg-[#0e0e11] font-mono">
              Select a case from the docket list to inspect the trial.
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!USE_MOCK && total > 20 && (
        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-zinc-500">Page {page}</span>
          <button
            disabled={apiCases.length < 20}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
