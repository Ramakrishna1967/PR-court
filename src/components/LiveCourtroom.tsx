import React, { useState, useEffect } from 'react';
import { INITIAL_TRIAL_CASES } from '../data/mockData';
import { TrialCase } from '../types';

interface LiveCourtroomProps {
  onOpenTrialModal: () => void;
}

// Subtle audio synthesizer for mechanical court clicks without external files
const playHapticAudio = (type: 'tick' | 'gavel' | 'pass') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'gavel') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    // Ignore audio policies
  }
};

export const LiveCourtroom: React.FC<LiveCourtroomProps> = ({ onOpenTrialModal }) => {
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const currentCase = INITIAL_TRIAL_CASES[selectedCaseIndex];
  const [activeStep, setActiveStep] = useState<number>(3); // 1 to 5
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [appealedCases, setAppealedCases] = useState<Record<string, boolean>>({});
  
  // Interactive line annotation inspector
  const [selectedDiffLine, setSelectedDiffLine] = useState<number | null>(1);

  // Interactive Juror Inspection Modal/Drawer
  const [inspectedJuror, setInspectedJuror] = useState<{
    juror: string;
    role: string;
    vote: string;
    rationale: string;
  } | null>(null);

  // Auto-play simulation across steps
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        playHapticAudio('tick');
        if (prev >= 5) {
          setIsPlaying(false);
          playHapticAudio('gavel');
          return 5;
        }
        return prev + 1;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleAppeal = () => {
    playHapticAudio('gavel');
    setAppealedCases((prev) => ({
      ...prev,
      [currentCase.id]: true
    }));
  };

  const isAppealed = appealedCases[currentCase.id] || currentCase.status === 'APPEALED';

  const getVerdictBadge = (status: TrialCase['status'], appealed: boolean) => {
    if (appealed) {
      return {
        text: '● APPEAL UNDER REVIEW · SECOND TRIAL OPEN',
        color: 'text-sky-300 border-sky-500/40 bg-sky-950/20',
        dot: 'bg-sky-400'
      };
    }
    switch (status) {
      case 'APPROVED':
        return {
          text: '● MERGE ORDER APPROVED',
          color: 'text-white border-white/20 bg-surface-container-highest',
          dot: 'bg-emerald-400'
        };
      case 'REJECTED':
        return {
          text: '● BLOCK · EXPLOIT SYNTHESIZED',
          color: 'text-red-300 border-red-500/40 bg-red-950/20',
          dot: 'bg-red-500'
        };
      case 'CONDITIONAL':
        return {
          text: '● CONDITIONAL · PROOF REQUIRED',
          color: 'text-amber-300 border-amber-500/40 bg-amber-950/20',
          dot: 'bg-amber-400'
        };
      case 'APPEALED':
        return {
          text: '● APPEAL UPHELD · RESTORED',
          color: 'text-sky-300 border-sky-500/40 bg-sky-950/20',
          dot: 'bg-sky-400'
        };
    }
  };

  const badgeInfo = getVerdictBadge(currentCase.status, isAppealed);

  // Line annotations explaining each diff line
  const diffAnnotations: Record<number, string> = {
    0: 'LEGACY STATE: Direct cache read allows stale reads before cluster notify completes.',
    1: 'DEFENSE COUNTER-PATCH: Atomic pop guarantees single-consumer linearization across all worker nodes.',
    2: 'INVARIANT: Token revoke hook dispatches to all subordinate clusters.',
    3: 'METRIC INSTRUMENTATION: Latency counter recorded to eBPF hardware trace.',
    4: 'SCOPE EXIT: Memory returned to pool with zero heap leaks.'
  };

  const jurorRationales: Record<string, string> = {
    'JUROR 1 // SEC': 'Zero unhandled socket descriptors persisted beyond the 18μs grace period. Formal spec checks passed with zero buffer overflows.',
    'JUROR 2 // LOGIC': 'TLA+ inductive specification confirms state transitions remain strictly monotonic. Linear order maintained under 5,000 requests/sec.',
    'JUROR 3 // PERF': 'p99.9 latency remained at 212ms, but fallback pool drain consumed 14.2MB heap. Vote conditioned on monitoring memory spikes under burst loads.'
  };

  return (
    <section className="w-full px-gutter md:px-margin-tablet lg:px-margin-desktop py-16 lg:py-24 border-b border-white/[0.08] bg-[#0A0A0C]" id="trial-preview">
      {/* Chamber Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
        <span className="tracking-widest text-[10px] font-telemetry-code text-zinc-400 uppercase py-1 px-3 border border-white/10 inline-block mb-3 bg-[#0e0e11]">
          LIVE COURTROOM
        </span>
        <h2 className="font-headline-lg text-3xl md:text-4xl text-white tracking-tight">
          Watch The Trial Unfold
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-zinc-400 font-telemetry-code">Active Case:</span>
          {INITIAL_TRIAL_CASES.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                playHapticAudio('tick');
                setSelectedCaseIndex(idx);
                setActiveStep(3);
                setIsPlaying(false);
                setSelectedDiffLine(1);
              }}
              className={`px-2.5 py-1 text-xs font-telemetry-code border transition-colors ${
                selectedCaseIndex === idx
                  ? 'border-white bg-[#2a2a2d] text-white font-semibold'
                  : 'border-white/10 bg-[#131316] text-zinc-400 hover:text-zinc-200 hover:border-white/30'
              }`}
            >
              #{item.prNumber} · {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Trial Chamber Card Container */}
      <div className="border border-white/[0.08] bg-[#0e0e11]">
        {/* Phase Stepper with Interactive Step Buttons */}
        <div className="grid grid-cols-5 border-b border-white/[0.08] text-center font-telemetry-code text-[11px] uppercase">
          {[
            { step: 1, label: '1. Intake' },
            { step: 2, label: '2. Arguments' },
            { step: 3, label: '3. Evidence' },
            { step: 4, label: '4. Jury' },
            { step: 5, label: '5. Verdict' }
          ].map((s) => {
            const isCompleted = activeStep > s.step;
            const isCurrent = activeStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => {
                  playHapticAudio('tick');
                  setActiveStep(s.step);
                }}
                className={`py-3 border-r last:border-r-0 border-white/[0.08] flex items-center justify-center gap-1.5 transition-colors ${
                  isCurrent
                    ? 'bg-[#2a2a2d] text-white font-semibold'
                    : isCompleted
                    ? 'bg-[#1b1b1e] text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                {isCompleted && (
                  <span className="material-symbols-outlined text-[14px] text-zinc-400">check</span>
                )}
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3-Column Courtroom Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          {/* Left: Prosecution Chamber */}
          <div className="p-6 bg-[#0e0e11] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400"></span>
                  <span className="font-telemetry-code text-xs uppercase text-red-300 font-medium">
                    Prosecution Agent
                  </span>
                </div>
                <span className="font-telemetry-code text-[10px] text-zinc-400">
                  CONFIDENCE: {currentCase.prosecutionConfidence}%
                </span>
              </div>
              <div className="space-y-4 font-telemetry-code">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    {currentCase.indictment.count}
                  </span>
                  <p className="text-zinc-200 mt-1 text-xs font-mono leading-relaxed">
                    {currentCase.indictment.description}
                  </p>
                </div>
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-xs text-red-300 leading-normal">
                  <div className="font-semibold mb-1 text-[11px] text-red-400">EXPLOIT SYNTHESIS:</div>
                  {currentCase.indictment.exploitSynthesis.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  <span className="text-red-400 font-semibold">CLAIM: </span>
                  {currentCase.indictment.claim}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-500 font-telemetry-code">
              <span>FUZZ_WORKERS: {currentCase.telemetry.workers}</span>
              <span>ITERATIONS: {currentCase.telemetry.fuzzIterations}</span>
            </div>
          </div>

          {/* Middle: Live Evidence Feed */}
          <div className="p-6 bg-[#070709] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-zinc-400">terminal</span>
                  <span className="font-telemetry-code text-xs uppercase text-zinc-300 font-medium">
                    Live Evidence Feed
                  </span>
                </div>
                <span className="font-telemetry-code text-[10px] text-emerald-400">
                  EXEC_ID: #VM-{(currentCase.prNumber % 900) + 100}
                </span>
              </div>

              {/* Code Diff Inspection with Interactive Clickable Lines */}
              <div className="space-y-1 font-telemetry-code text-[11px] leading-relaxed text-zinc-400 bg-[#0e0e11] p-3 border border-white/[0.08]">
                <div className="text-zinc-600 pb-1 flex items-center justify-between text-[10px]">
                  <span>// {currentCase.evidenceDiff.lines} / {currentCase.evidenceDiff.filename}</span>
                  <span className="text-zinc-500">[click line to inspect]</span>
                </div>
                {currentCase.evidenceDiff.diffSnippet.map((diff, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      playHapticAudio('tick');
                      setSelectedDiffLine(i);
                    }}
                    className={`cursor-pointer transition-colors px-1 py-0.5 ${
                      selectedDiffLine === i
                        ? 'ring-1 ring-white bg-zinc-800 text-white'
                        : diff.type === 'del'
                        ? 'text-red-400/90 bg-red-950/20 hover:bg-red-950/40'
                        : diff.type === 'add'
                        ? 'text-emerald-400/90 bg-emerald-950/20 hover:bg-emerald-950/40'
                        : 'text-zinc-400 hover:bg-zinc-800/40'
                    }`}
                  >
                    {diff.code}
                  </div>
                ))}
              </div>

              {/* Line Annotation Callout Box */}
              {selectedDiffLine !== null && diffAnnotations[selectedDiffLine] && (
                <div className="mt-2 p-2 bg-[#121215] border border-white/10 text-[10px] font-telemetry-code text-zinc-300 flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[14px] mt-0.5">info</span>
                  <div className="leading-snug">
                    <span className="text-white font-semibold">LINE ANNOTATION: </span>
                    {diffAnnotations[selectedDiffLine]}
                  </div>
                </div>
              )}

              {/* Real-time execution logs ticker */}
              <div className="mt-3 p-2.5 bg-[#050506] border border-white/[0.05] font-telemetry-code text-[10px] text-zinc-400 space-y-1">
                <div className="text-zinc-500 flex items-center justify-between">
                  <span>SANDBOX KERNEL: Linux 6.11.2-fc</span>
                  <span className="text-emerald-400 font-semibold">EPHEMERAL RUNNER</span>
                </div>
                <div>» attaching ebpf probe on kprobe:tcp_close</div>
                <div>» recording hardware branch trace to immutable tape ledger</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-telemetry-code text-zinc-400">
              <span>MEM_HEAP: {currentCase.telemetry.memHeap}</span>
              <span>CLOCK: {currentCase.telemetry.clockMs}ms</span>
              <span className={currentCase.telemetry.flamegraph === 'STABLE' || currentCase.telemetry.flamegraph === 'OPTIMAL' ? 'text-emerald-400' : 'text-amber-400'}>
                FLAMEGRAPH: {currentCase.telemetry.flamegraph}
              </span>
            </div>
          </div>

          {/* Right: Defense Chamber */}
          <div className="p-6 bg-[#0e0e11] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400"></span>
                  <span className="font-telemetry-code text-xs uppercase text-blue-300 font-medium">
                    Defense Agent
                  </span>
                </div>
                <span className="font-telemetry-code text-[10px] text-zinc-400">
                  CONFIDENCE: {currentCase.defenseConfidence}%
                </span>
              </div>
              <div className="space-y-4 font-telemetry-code">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    Plea & Counter-Proof
                  </span>
                  <p className="text-zinc-200 mt-1 text-xs font-mono leading-relaxed">
                    {currentCase.defense.plea}
                  </p>
                </div>
                <div className="p-3 bg-blue-950/20 border border-blue-500/20 text-xs text-blue-300 leading-normal">
                  <div className="font-semibold mb-1 text-[11px] text-blue-400">VERIFIED INVARIANT:</div>
                  {currentCase.defense.verifiedInvariant.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  <span className="text-blue-400 font-semibold">DEFENSE EXHIBIT: </span>
                  {currentCase.defense.exhibit}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-500 font-telemetry-code">
              <span>SOLVER: Z3-PROVER 4.12</span>
              <span>INVARIANT BOUND: O(1)</span>
            </div>
          </div>
        </div>

        {/* Juror Deliberation Strip & Interactive Verdict Badge */}
        <div className="p-6 border-t border-white/[0.08] bg-[#1b1b1e] flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Clickable Juror Cards */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            {currentCase.juryVotes.map((j, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  playHapticAudio('tick');
                  setInspectedJuror({
                    juror: j.juror,
                    role: j.role,
                    vote: j.vote,
                    rationale: jurorRationales[j.juror] || 'Formal proof verified.'
                  });
                }}
                className="px-3 py-2 bg-[#0e0e11] border border-white/[0.08] hover:border-white/30 text-left font-telemetry-code text-xs transition-colors cursor-pointer group"
                title="Click to view written deliberation opinion"
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] block">{j.juror}</span>
                  <span className="material-symbols-outlined text-[12px] text-zinc-600 group-hover:text-zinc-300">visibility</span>
                </div>
                <span className={`font-semibold ${
                  j.vote === 'PASS' ? 'text-emerald-400' : j.vote === 'FAIL' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  [VOTE: {j.vote}]
                </span>
              </button>
            ))}
          </div>

          {/* Dynamic Verdict Indicator & Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            {/* Step navigation controls */}
            <div className="flex items-center border border-white/10 bg-[#0e0e11]">
              <button
                onClick={() => {
                  playHapticAudio('tick');
                  setActiveStep(prev => Math.max(1, prev - 1));
                }}
                disabled={activeStep <= 1}
                className="px-2 py-1.5 text-zinc-400 hover:text-white disabled:opacity-30 border-r border-white/10"
                title="Previous phase"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_left</span>
              </button>
              <button
                onClick={() => {
                  playHapticAudio('tick');
                  setActiveStep(prev => Math.min(5, prev + 1));
                }}
                disabled={activeStep >= 5}
                className="px-2 py-1.5 text-zinc-400 hover:text-white disabled:opacity-30"
                title="Next phase"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </button>
            </div>

            <button
              onClick={() => {
                playHapticAudio('tick');
                setIsPlaying(!isPlaying);
              }}
              className="px-3 py-2 border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 bg-[#0e0e11] font-telemetry-code text-xs uppercase flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Pause Trial' : 'Step Simulation'}</span>
            </button>

            <button
              onClick={handleAppeal}
              disabled={isAppealed}
              className={`px-3 py-2 border font-telemetry-code text-xs uppercase flex items-center gap-1.5 transition-colors ${
                isAppealed
                  ? 'border-sky-500/40 text-sky-400 bg-sky-950/30 cursor-default'
                  : 'border-white/20 text-zinc-300 hover:text-white bg-[#0e0e11] hover:border-white/40'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">gavel</span>
              <span>{isAppealed ? 'Docket Appealed' : 'File Appeal'}</span>
            </button>

            <div className={`px-4 py-2 border font-telemetry-code text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${badgeInfo.color}`}>
              <span className={`w-2 h-2 rounded-full ${badgeInfo.dot}`}></span>
              <span>{badgeInfo.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Juror Written Deliberation Modal */}
      {inspectedJuror && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e0e11] border border-white/20 max-w-md w-full p-6 text-white font-telemetry-code shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase">JUROR DELIBERATION MEMO</span>
                <div className="font-semibold text-sm text-white">{inspectedJuror.juror} ({inspectedJuror.role})</div>
              </div>
              <button
                onClick={() => setInspectedJuror(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">VERDICT CAST:</span>
                <span className={`font-bold ${
                  inspectedJuror.vote === 'PASS' ? 'text-emerald-400' : inspectedJuror.vote === 'FAIL' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  [{inspectedJuror.vote}]
                </span>
              </div>
              <div className="p-3 bg-[#050506] border border-white/10 text-zinc-300 leading-relaxed font-mono">
                "{inspectedJuror.rationale}"
              </div>
              <div className="text-[10px] text-zinc-500 flex justify-between">
                <span>EVIDENCE TIMESTAMP: 2026-10-09 02:41:18</span>
                <span>CRYPTOGRAPHIC QUORUM SIGNED</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setInspectedJuror(null)}
                className="px-4 py-1.5 bg-white text-black text-xs uppercase font-semibold hover:bg-zinc-200"
              >
                Close Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
