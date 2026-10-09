import React, { useState } from 'react';
import { TrialCase, VerdictStatus } from '../types';

interface VerdictsViewProps {
  cases: TrialCase[];
  onOpenTrialModal: () => void;
  onAppealCase: (caseId: string) => void;
}

export const VerdictsView: React.FC<VerdictsViewProps> = ({ cases, onOpenTrialModal, onAppealCase }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<TrialCase | null>(cases[0]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.repository.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.prNumber).includes(searchTerm);

    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: VerdictStatus) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'MERGE APPROVED',
          style: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
          dot: 'bg-emerald-400'
        };
      case 'REJECTED':
        return {
          label: 'BLOCKED · FAILED',
          style: 'border-red-500/30 text-red-400 bg-red-950/20',
          dot: 'bg-red-400'
        };
      case 'CONDITIONAL':
        return {
          label: 'CONDITIONAL PASS',
          style: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
          dot: 'bg-amber-400'
        };
      case 'APPEALED':
        return {
          label: 'APPEAL RESTORED',
          style: 'border-sky-500/30 text-sky-400 bg-sky-950/20',
          dot: 'bg-sky-400'
        };
    }
  };

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
              {cases.length} ADJUDICATED CASES
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
          <span className="material-symbols-outlined text-[15px]">add</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 border-b border-white/[0.08] mb-8 font-mono text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PR #, filename, repo, author..."
            className="w-full bg-[#0e0e11] border border-white/10 text-white pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-white transition-colors"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-zinc-500 text-[16px]">
            search
          </span>
        </div>

        {/* Status Filters */}
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

      {/* Split layout: Docket Table / Grid on left, Selected Case Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Case List */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 border border-white/10 bg-[#0e0e11]">
              No dockets found matching criteria.
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
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{c.repository}</span>
                    <span className="text-zinc-500">by {c.author}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500">
                    <span>TRIED IN: {c.telemetry.clockMs}ms</span>
                    <span>RISK: {c.riskScore}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Case Dossier */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="border border-white/[0.08] bg-[#0e0e11] p-6 font-mono text-xs space-y-6">
              {/* Header */}
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
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedCase.status).dot}`}></span>
                    <span>{getStatusBadge(selectedCase.status).label}</span>
                  </span>
                </div>
              </div>

              {/* Indictment Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase">
                  <span className="w-2 h-2 bg-red-400"></span>
                  <span>Prosecution Indictment</span>
                  <span className="text-zinc-500 font-normal">
                    (Confidence: {selectedCase.prosecutionConfidence}%)
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {selectedCase.indictment.description}
                </p>
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 space-y-1">
                  <div className="font-semibold text-[11px]">REPRODUCED EXPLOIT:</div>
                  {selectedCase.indictment.exploitSynthesis.map((exp, i) => (
                    <div key={i}>{exp}</div>
                  ))}
                </div>
              </div>

              {/* Code Diff Snapshot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs uppercase text-white font-semibold">Evidence Code Diff</span>
                  <span className="text-[10px] text-zinc-500">
                    {selectedCase.evidenceDiff.filename} ({selectedCase.evidenceDiff.lines})
                  </span>
                </div>
                <div className="bg-[#050506] border border-white/[0.08] p-3 text-[11px] leading-relaxed">
                  {selectedCase.evidenceDiff.diffSnippet.map((diff, i) => (
                    <div
                      key={i}
                      className={
                        diff.type === 'del'
                          ? 'text-red-400 bg-red-950/20 px-1'
                          : diff.type === 'add'
                          ? 'text-emerald-400 bg-emerald-950/20 px-1'
                          : 'text-zinc-400 px-1'
                      }
                    >
                      {diff.code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Defense Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase">
                  <span className="w-2 h-2 bg-blue-400"></span>
                  <span>Defense Plea & Invariants</span>
                  <span className="text-zinc-500 font-normal">
                    (Confidence: {selectedCase.defenseConfidence}%)
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {selectedCase.defense.plea}
                </p>
                <div className="p-3 bg-blue-950/20 border border-blue-500/20 text-blue-300 space-y-1">
                  <div className="font-semibold text-[11px]">MATHEMATICAL SPEC:</div>
                  {selectedCase.defense.verifiedInvariant.map((inv, i) => (
                    <div key={i}>{inv}</div>
                  ))}
                </div>
              </div>

              {/* Jury Votes */}
              <div className="pt-4 border-t border-white/[0.08]">
                <div className="text-xs uppercase text-zinc-400 mb-3">Jury Triad Consensus</div>
                <div className="grid grid-cols-3 gap-3">
                  {selectedCase.juryVotes.map((j, i) => (
                    <div key={i} className="p-2.5 bg-[#050506] border border-white/10 text-center">
                      <div className="text-[10px] text-zinc-500">{j.juror}</div>
                      <div className="text-[10px] text-zinc-400">{j.role}</div>
                      <div className={`mt-1 font-bold ${
                        j.vote === 'PASS' ? 'text-emerald-400' : j.vote === 'FAIL' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        [{j.vote}]
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Cryptographic Tape Ledger Hash */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-500">
                <span>HASH: 0x9f7e8a...c3d2</span>
                <span>SIGNED BY: PR_COURT_ORACLE_KEY_2026</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 border border-white/10 bg-[#0e0e11] font-mono">
              Select a case from the docket list to inspect the trial.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
