import React, { useState, useEffect } from 'react';
import { Hero3DCanvas } from '../components/Hero3DCanvas';
import { TopologyDiagram } from '../components/TopologyDiagram';
import { LiveCourtroom } from '../components/LiveCourtroom';
import { FaqSection } from '../components/FaqSection';
import { TESTIMONIALS } from '../data/mockData';
import { NavigationPage } from '../types';

interface HomeViewProps {
  onOpenTrialModal: () => void;
  onNavigate: (page: NavigationPage) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenTrialModal, onNavigate }) => {
  // Rotating kinetic headline word
  const words = ['Trial.', 'Defense.', 'Verdict.', 'Proof.'];
  const [wordIndex, setWordIndex] = useState(0);
  const [animatingWord, setAnimatingWord] = useState(false);

  // Email form state
  const [emailInput, setEmailInput] = useState('');
  const [enrolled, setEnrolled] = useState(false);

  // Interactive dynamic heuristics blast radius state
  const [selectedHeuristic, setSelectedHeuristic] = useState<'auth' | 'concurrency' | 'schema' | 'css'>('auth');

  // Interactive terminal logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '$ fuzz login --case-insensitive --workers 32',
    '» generating 24,000 permutations over auth_provider.go:142',
    'exit 1 · collision found: [0x7f..e1] ≠ [0x7f..e2]',
    '#evidence #a3f9 · recorded to immutable tape ledger',
    '» artifact attached to indictment docket #PR-1042'
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isFuzzing, setIsFuzzing] = useState(false);

  // Interactive metric card drilldown state
  const [expandedMetric, setExpandedMetric] = useState<number | null>(null);

  // Interactive testimonial case study modal
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<{
    company: string;
    author: string;
    title: string;
    breakdown: string;
    incidentTime: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatingWord(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setAnimatingWord(false);
      }, 350);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setEnrolled(true);
  };

  const handleRunCommand = (cmd: string) => {
    const clean = cmd.trim().toLowerCase();
    if (clean === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    }

    setIsFuzzing(true);
    setTerminalLogs((prev) => [...prev, `$ ${cmd}`]);
    setTerminalInput('');

    if (clean.includes('fuzz') || clean === '1') {
      setTimeout(() => {
        setTerminalLogs((prev) => [
          ...prev,
          '» spawning 32 fuzzer threads across ephemeral vCPUs...',
          '» testing 48,000 permutations in isolation microVM...',
          'exit 1 · deadlock collision observed at worker_4:futex_wait',
          '» evidence #bf81 committed to ledger'
        ]);
        setIsFuzzing(false);
      }, 700);
    } else if (clean.includes('asan') || clean === '2') {
      setTimeout(() => {
        setTerminalLogs((prev) => [
          ...prev,
          '» compiling target with clang -fsanitize=address,undefined...',
          '» running test_allocator_stress...',
          'ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000050',
          '» attached core dump artifact to trial docket'
        ]);
        setIsFuzzing(false);
      }, 700);
    } else if (clean.includes('flamegraph') || clean === '3') {
      setTimeout(() => {
        setTerminalLogs((prev) => [
          ...prev,
          '» sampling eBPF call stack at 999Hz...',
          '» flamegraph generated: 4.8MB uncompressed svg',
          '» p99.9 latency variance: ±1.2ms (acceptable threshold)'
        ]);
        setIsFuzzing(false);
      }, 700);
    } else {
      setTimeout(() => {
        setTerminalLogs((prev) => [
          ...prev,
          `» command "${cmd}" executed in sandbox container`,
          '» exit code: 0 (clean execution)'
        ]);
        setIsFuzzing(false);
      }, 500);
    }
  };

  const heuristicMetrics = {
    auth: { vcpu: '32 vCPUs', duration: '180s', cost: '$0.18', isolation: 'MicroVM Ring-0', status: 'Full Trial' },
    concurrency: { vcpu: '64 vCPUs', duration: '340s', cost: '$0.34', isolation: 'Kernel eBPF Prober', status: 'Stress Arena' },
    schema: { vcpu: '16 vCPUs', duration: '90s', cost: '$0.08', isolation: 'Shadow DB Replay', status: 'Migration Test' },
    css: { vcpu: '0 vCPUs', duration: '0.0s', cost: '$0.00', isolation: 'AST Static Parse', status: 'Skipped · Fast-Pass' }
  };

  return (
    <div className="flex flex-col w-full text-[#e4e1e6]">
      {/* ========================================== */}
      {/* 1. HERO SECTION (Split Grid Blueprint)     */}
      {/* ========================================== */}
      <section className="w-full px-4 md:px-8 lg:px-12 pt-8 pb-16 lg:pb-24 border-b border-white/[0.08] relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Adversarial Thesis & Headline */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Top Docket Metric Micro-Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-telemetry-code uppercase tracking-widest text-zinc-300 bg-[#0e0e11] border border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                DOCKET ACTIVE // CT-9904-L
              </span>
              <span className="text-[10px] font-telemetry-code uppercase tracking-wider text-zinc-500">
                CODE CIVIL PROTOCOL
              </span>
            </div>

            {/* 3-Line Kinetic Headline */}
            <h1 className="text-white font-serif text-3xl sm:text-5xl lg:text-[54px] lg:leading-[1.12] tracking-tight">
              <span className="font-bold tracking-tight block">Every Pull Request Deserves A</span>
              <span className="inline-block relative h-[1.25em] overflow-hidden align-bottom min-w-[240px]">
                <span
                  className={`font-serif italic font-normal text-zinc-100 transition-all duration-300 block transform ${
                    animatingWord ? '-translate-y-4 opacity-0 blur-sm' : 'translate-y-0 opacity-100 blur-0'
                  }`}
                >
                  {words[wordIndex]}
                </span>
              </span>
            </h1>

            {/* Ruthless Subtext */}
            <p className="mt-6 text-zinc-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl font-mono">
              Autonomous prosecution and defense agents attack and defend every PR in an isolated sandbox. A cryptographic jury rules strictly on evidence that actually executed—not opinions.
            </p>

            {/* CTA Row */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenTrialModal}
                className="inline-flex items-center justify-center gap-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#0A0A0A] px-6 py-3.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                <span>Put a PR on Trial</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              <a
                href="#trial-preview"
                className="inline-flex items-center justify-center gap-2 bg-[#0e0e11] hover:bg-[#1b1b1e] border border-white/20 hover:border-white/40 text-white px-6 py-3.5 text-xs font-mono uppercase tracking-wider transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Watch a Trial</span>
              </a>
            </div>

            {/* Social Proof Telemetry */}
            <div className="mt-10 pt-6 border-t border-white/[0.08] flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#2a2a2d] border border-white/20 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                  PX
                </div>
                <div className="w-7 h-7 rounded-full bg-[#353438] border border-white/20 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                  01
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                  VK
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-700 border border-white/20 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                  KR
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                  +
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                Trusted by <strong className="text-white font-medium">1,880+</strong> systems engineers across distributed runtimes
              </div>
            </div>
          </div>

          {/* Right Column: 3D Holographic Artifact Canvas with Monospace HUD */}
          <div className="lg:col-span-5 relative">
            <Hero3DCanvas />
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 2. THE COURT (Adversarial Bento Grid)      */}
      {/* ========================================== */}
      <section className="w-full px-4 md:px-8 lg:px-12 py-16 lg:py-24 border-b border-white/[0.08]" id="court-overview">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="tracking-widest text-[10px] font-mono text-zinc-400 uppercase py-1 px-3 border border-white/10 inline-block mb-3 bg-[#0e0e11]">
            THE COURT
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight">
            Adversarial Code Review <span className="font-serif italic text-zinc-400 font-normal">Automated</span>
          </h2>
          <p className="mt-3 font-mono text-zinc-400 text-xs sm:text-sm">
            Two specialized LLM factions enter a sandboxed runtime. No pull request merges on polite consensus.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Card: Live Animated Agent Hierarchy (Spans 2 columns) */}
          <div className="lg:col-span-2 border border-white/[0.08] bg-[#0e0e11] p-6 lg:p-8 relative">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>TRIBUNAL TOPOLOGY // DECENTRALIZED RUNTIME</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500 uppercase">DIALECTIC ENGINE V3.2</span>
            </div>

            {/* Topology SVG + Interactive Node Inspector */}
            <TopologyDiagram />

            {/* Two Feature Descriptions side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/[0.08] pt-6">
              <div>
                <h3 className="font-serif text-white text-lg mb-2">Adversarial Agents</h3>
                <p className="font-mono text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  A prosecutor actively synthesizes targeted exploits, malicious edge-cases, and heap corruptions. Simultaneously, a defense counsel generates mathematical proofs and unit safety invariants to defend the diff.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-white text-lg mb-2">Evidence or Nothing</h3>
                <p className="font-mono text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  Speculative assertions are inadmissible. The trial clerk only forwards stdout logs, differential flamegraphs, and reproducible test fixtures executed directly within ephemeral microVMs.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom-Left Card: Sandbox Terminal Evidence (Fully Interactive!) */}
          <div className="border border-white/[0.08] bg-[#0e0e11] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase text-white font-semibold">Sandbox Evidence</span>
                  <span className="text-[10px] text-zinc-500 font-mono">[interactive]</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {isFuzzing ? 'EXECUTING...' : 'RUNNING · SANDBOX'}
                </span>
              </div>

              {/* Quick Command Bar */}
              <div className="flex items-center gap-1 mb-2 font-mono text-[10px] overflow-x-auto pb-1">
                <span className="text-zinc-500 uppercase">QUICK RUN:</span>
                <button
                  onClick={() => handleRunCommand('fuzz login --case-insensitive --workers 32')}
                  disabled={isFuzzing}
                  className="px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white bg-[#18181b]"
                >
                  fuzz login
                </button>
                <button
                  onClick={() => handleRunCommand('asan-check --track-origins=yes')}
                  disabled={isFuzzing}
                  className="px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white bg-[#18181b]"
                >
                  asan check
                </button>
                <button
                  onClick={() => handleRunCommand('ebpf-flamegraph --sample-hz=999')}
                  disabled={isFuzzing}
                  className="px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white bg-[#18181b]"
                >
                  flamegraph
                </button>
                <button
                  onClick={() => handleRunCommand('clear')}
                  className="px-1.5 py-0.5 border border-white/10 hover:border-white/30 text-zinc-500 hover:text-zinc-300"
                >
                  clear
                </button>
              </div>

              {/* Terminal Output Box */}
              <div className="bg-[#050506] border border-white/[0.08] p-3 font-mono text-[11px] text-zinc-300 space-y-1 mb-2 h-44 overflow-y-auto leading-relaxed">
                {terminalLogs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.startsWith('$')
                        ? 'text-zinc-400 font-semibold'
                        : log.includes('exit 1') || log.includes('ERROR')
                        ? 'text-red-400 font-semibold'
                        : log.includes('#evidence')
                        ? 'text-emerald-400'
                        : 'text-zinc-400'
                    }
                  >
                    {log}
                  </div>
                ))}
                {isFuzzing && (
                  <div className="text-amber-400 flex items-center gap-1">
                    <span className="animate-spin material-symbols-outlined text-[12px]">refresh</span>
                    <span>synthesizing permutations...</span>
                  </div>
                )}
              </div>

              {/* Interactive Shell Prompt */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (terminalInput.trim()) handleRunCommand(terminalInput);
                }}
                className="flex items-center gap-1.5 border border-white/10 bg-[#050506] px-2 py-1 font-mono text-xs text-white"
              >
                <span className="text-emerald-400">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="type command (e.g. 'fuzz', 'asan', 'flamegraph', 'clear')..."
                  className="w-full bg-transparent text-white focus:outline-none placeholder:text-zinc-600 text-[11px]"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[9px] uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Run
                </button>
              </form>
            </div>

            <p className="font-mono text-xs text-zinc-400 leading-relaxed mt-3">
              Real execution environments run isolated Linux kernels per trial. Zero mocks. Zero theoretical hallucination.
            </p>
          </div>

          {/* Bottom-Right Card: Risk-Adaptive Trials (Interactive Heuristics & Tooltips!) */}
          <div className="border border-white/[0.08] bg-[#0e0e11] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                <span className="font-mono text-xs uppercase text-white font-semibold">Risk-Adaptive Trials</span>
                <span className="font-mono text-[10px] text-zinc-500 uppercase">DYNAMIC HEURISTICS</span>
              </div>

              {/* Dynamic Blast Radius Metric Chart */}
              <div className="bg-[#050506] border border-white/[0.08] p-4 mb-4 relative h-40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>COMPUTE PROFILE: {selectedHeuristic.toUpperCase()}</span>
                  <div className="flex items-center gap-1">
                    {(['auth', 'concurrency', 'schema', 'css'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedHeuristic(key)}
                        className={`px-1.5 py-0.5 border text-[9px] uppercase transition-colors ${
                          selectedHeuristic === key
                            ? 'border-white text-white bg-zinc-800'
                            : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                <svg className="w-full h-20" fill="none" viewBox="0 0 380 110">
                  <line stroke="rgba(255,255,255,0.05)" x1="0" x2="380" y1="30" y2="30" />
                  <line stroke="rgba(255,255,255,0.05)" x1="0" x2="380" y1="70" y2="70"></line>

                  {selectedHeuristic === 'auth' && (
                    <>
                      <path d="M 10 90 L 70 85 L 120 78 L 170 82 L 230 18 L 290 24 L 340 70 L 370 75" stroke="#FFFFFF" strokeWidth="1.75" />
                      <circle cx="230" cy="18" fill="#EF4444" r="4" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text fill="#F4F4F5" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="230" y="11">auth change · full trial</text>
                      <circle cx="70" cy="85" fill="#A1A1AA" r="3" />
                      <text fill="#71717A" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="70" y="102">typo fix · skipped</text>
                    </>
                  )}

                  {selectedHeuristic === 'concurrency' && (
                    <>
                      <path d="M 10 88 L 60 80 L 130 50 L 190 22 L 240 12 L 310 18 L 370 45" stroke="#FFFFFF" strokeWidth="1.75" />
                      <circle cx="240" cy="12" fill="#EF4444" r="4" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text fill="#F4F4F5" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="240" y="9">atomic lock · max sandboxes (64 vCPUs)</text>
                    </>
                  )}

                  {selectedHeuristic === 'schema' && (
                    <>
                      <path d="M 10 90 L 90 85 L 160 55 L 220 38 L 280 40 L 370 65" stroke="#FFFFFF" strokeWidth="1.75" />
                      <circle cx="220" cy="38" fill="#F59E0B" r="4" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text fill="#F4F4F5" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="220" y="30">migration · shadow replay</text>
                    </>
                  )}

                  {selectedHeuristic === 'css' && (
                    <>
                      <path d="M 10 95 L 80 92 L 150 94 L 230 90 L 300 92 L 370 94" stroke="#FFFFFF" strokeWidth="1.75" />
                      <circle cx="150" cy="94" fill="#10B981" r="3" />
                      <text fill="#10B981" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="150" y="82">styling · instant merge certification</text>
                    </>
                  )}
                </svg>

                {/* Real-time parameter bar for selected heuristic */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>QUOTA: <strong className="text-white">{heuristicMetrics[selectedHeuristic].vcpu}</strong></span>
                  <span>ISOLATION: <strong className="text-white">{heuristicMetrics[selectedHeuristic].isolation}</strong></span>
                  <span>COST: <strong className="text-emerald-400">{heuristicMetrics[selectedHeuristic].cost}</strong></span>
                </div>
              </div>
            </div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              PR Court scales computational litigation power dynamically. Markdown and CSS updates breeze through; cryptographic auth changes trigger full sandbox tribunals.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 3. LIVE TRIAL PREVIEW (Courtroom Floor)    */}
      {/* ========================================== */}
      <LiveCourtroom onOpenTrialModal={onOpenTrialModal} />

      {/* ========================================== */}
      {/* 4. TESTIMONIALS & CONTINUOUS MARQUEE       */}
      {/* ========================================== */}
      <section className="w-full px-4 md:px-8 lg:px-12 py-16 lg:py-24 border-b border-white/[0.08]">
        <div className="mb-12">
          <span className="tracking-widest text-[10px] font-mono text-zinc-400 uppercase py-1 px-3 border border-white/10 inline-block mb-3 bg-[#0e0e11]">
            TEAMS
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight">
            Bugs get caught before <span className="font-serif italic text-zinc-400 font-normal">merge.</span>
          </h2>
        </div>

        {/* 4 High-Precision Testimonial Cards with Interactive Case Study Inspection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              onClick={() => {
                const caseStudies = [
                  {
                    company: 'VaultLine',
                    author: 'Elena Rostova',
                    title: 'Incident Avoidance: Socket Leak in Distributed Sharding Layer',
                    breakdown: 'A high-load race condition in the auth worker leaked file descriptors under 24,000 requests/sec. PR Court fuzzer discovered it in 90 seconds prior to production release.',
                    incidentTime: 'August 2026'
                  },
                  {
                    company: 'Distributed Core',
                    author: 'Marcus Vance',
                    title: 'Elimination of LGTM Blind Spots on Consensus Protocol',
                    breakdown: 'Replaced manual 3-minute glance reviews with automated mathematical invariant checks. Reduced critical outages by 78%.',
                    incidentTime: 'September 2026'
                  },
                  {
                    company: 'ApexDB',
                    author: 'Siddharth Nair',
                    title: 'Storage Engine Page Alignment Double Free Prevention',
                    breakdown: 'A patch attempting microsecond optimization inadvertently misaligned memory chunks. Fuzzing container triggered an ASAN fault within 2 minutes.',
                    incidentTime: 'July 2026'
                  },
                  {
                    company: 'KernelOS',
                    author: 'Clara Hauge',
                    title: 'Formal Invariant Defense Across Kernel Subsystems',
                    breakdown: 'Defense agent auto-synthesized a zero-deadlock proof and patch adjustment without requiring human context switching.',
                    incidentTime: 'October 2026'
                  }
                ];
                setSelectedCaseStudy(caseStudies[idx]);
              }}
              className="border border-white/[0.08] bg-[#0e0e11] p-6 flex flex-col justify-between relative group hover:border-white/40 cursor-pointer transition-colors"
            >
              <div className="h-0.5 w-8 bg-zinc-400 absolute top-0 left-6"></div>
              <p className="font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6 mt-2">
                {t.quote}
              </p>
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-serif text-sm text-white font-medium">{t.author}</div>
                  <div className="font-mono text-xs text-zinc-500">{t.role}</div>
                </div>
                <span className="material-symbols-outlined text-zinc-600 group-hover:text-white text-base">
                  north_east
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Case Study Modal */}
        {selectedCaseStudy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0e0e11] border border-white/20 p-6 max-w-lg w-full text-white font-mono shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase">CASE STUDY VERIFICATION</span>
                  <h3 className="font-serif text-lg text-white">{selectedCaseStudy.company}</h3>
                </div>
                <button
                  onClick={() => setSelectedCaseStudy(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="text-zinc-200 font-semibold">{selectedCaseStudy.title}</div>
                <p className="text-zinc-400 leading-relaxed">{selectedCaseStudy.breakdown}</p>
                <div className="p-3 bg-[#050506] border border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>ATTESTED BY: {selectedCaseStudy.author}</span>
                  <span>{selectedCaseStudy.incidentTime}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedCaseStudy(null)}
                  className="px-4 py-1.5 bg-white text-black font-semibold uppercase text-xs hover:bg-zinc-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Infinite Scrolling Logo Marquee */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] overflow-hidden relative">
          <div className="flex space-x-16 items-center whitespace-nowrap animate-marquee select-none text-zinc-500 font-mono text-xs uppercase tracking-widest">
            <span>BRIGHTDESK // SYSTEMS</span>
            <span>KINFOLK // PROTOCOL</span>
            <span>MERIDIAN // COMPUTE</span>
            <span>PARCEL // CLOUD</span>
            <span>TANDEM // KERNEL</span>
            <span>APEXDB // STORAGE</span>
            <span>VAULTLINE // INFRA</span>
            <span>BRIGHTDESK // SYSTEMS</span>
            <span>KINFOLK // PROTOCOL</span>
            <span>MERIDIAN // COMPUTE</span>
            <span>PARCEL // CLOUD</span>
            <span>TANDEM // KERNEL</span>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 5. ABOUT & FAQ (Split Layout)              */}
      {/* ========================================== */}
      <section className="w-full px-4 md:px-8 lg:px-12 py-16 lg:py-24 border-b border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Mission & Animated Counter Stats */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <span className="tracking-widest text-[10px] font-mono text-zinc-400 uppercase py-1 px-3 border border-white/10 inline-block mb-3 bg-[#0e0e11]">
                ABOUT
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight">
                Made by engineers tired of <span className="font-serif italic text-zinc-400 font-normal">rubber-stamp reviews.</span>
              </h2>
              <p className="mt-6 font-mono text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Standard code reviews are plagued by asymmetry: developers spend forty hours architecting complex concurrency paths, while reviewers spend three minutes skimming syntax before pressing merge. We replaced human weariness with automated dialectic conflict.
              </p>
            </div>

            {/* 2x2 Telemetry Stat Grid (Interactive drilldowns!) */}
            <div className="grid grid-cols-2 gap-4 mt-10">
              <div
                onClick={() => setExpandedMetric(expandedMetric === 1 ? null : 1)}
                className={`p-4 bg-[#0e0e11] border transition-colors cursor-pointer ${
                  expandedMetric === 1 ? 'border-white bg-[#1b1b1e]' : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="font-mono text-2xl lg:text-3xl text-white font-semibold">4,800+</div>
                <div className="font-mono text-[11px] text-zinc-500 uppercase mt-1">PRs Tried</div>
                {expandedMetric === 1 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                    74% Rust · 16% Go · 10% C/C++
                  </div>
                )}
              </div>

              <div
                onClick={() => setExpandedMetric(expandedMetric === 2 ? null : 2)}
                className={`p-4 bg-[#0e0e11] border transition-colors cursor-pointer ${
                  expandedMetric === 2 ? 'border-white bg-[#1b1b1e]' : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="font-mono text-2xl lg:text-3xl text-white font-semibold">12,410</div>
                <div className="font-mono text-[11px] text-zinc-500 uppercase mt-1">Bugs Caught Pre-Merge</div>
                {expandedMetric === 2 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                    52% Races · 31% Heap/ASAN · 17% Logic
                  </div>
                )}
              </div>

              <div
                onClick={() => setExpandedMetric(expandedMetric === 3 ? null : 3)}
                className={`p-4 bg-[#0e0e11] border transition-colors cursor-pointer ${
                  expandedMetric === 3 ? 'border-white bg-[#1b1b1e]' : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="font-mono text-2xl lg:text-3xl text-white font-semibold">&lt; 4min</div>
                <div className="font-mono text-[11px] text-zinc-500 uppercase mt-1">Median Trial Time</div>
                {expandedMetric === 3 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                    Boot: 8ms · Fuzz: 180s · Proof: 1.2s
                  </div>
                )}
              </div>

              <div
                onClick={() => setExpandedMetric(expandedMetric === 4 ? null : 4)}
                className={`p-4 bg-[#0e0e11] border transition-colors cursor-pointer ${
                  expandedMetric === 4 ? 'border-white bg-[#1b1b1e]' : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="font-mono text-2xl lg:text-3xl text-white font-semibold">0.2%</div>
                <div className="font-mono text-[11px] text-zinc-500 uppercase mt-1">False-Positive Rate</div>
                {expandedMetric === 4 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                    Physical microVM execution guarantee
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Accordion FAQ */}
          <div className="lg:col-span-7">
            <FaqSection />
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 6. HIGH-CONTRAST INVERTED CTA BAND        */}
      {/* ========================================== */}
      <section className="w-full bg-[#F4F4F5] text-[#0A0A0A] px-4 md:px-8 lg:px-12 py-20 lg:py-28 relative">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          <span className="font-mono text-xs uppercase tracking-widest text-[#71717A] mb-4">
            DOCKET ENROLLMENT // NO TRIAL DELAYS
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#0A0A0A] font-bold tracking-tight">
            Ready to put your code on <span className="font-serif italic font-normal text-[#18181B]">trial?</span>
          </h2>
          <p className="mt-4 font-mono text-sm sm:text-base text-[#52525B] max-w-lg">
            Free for open source. Install the GitHub app in under two minutes and witness automated litigation on your next PR.
          </p>

          {/* Signup Form Container */}
          {!enrolled ? (
            <form onSubmit={handleEnrollSubmit} className="mt-8 w-full max-w-md flex flex-col sm:flex-row items-center gap-2">
              <input
                className="w-full bg-white border border-[#D4D4D8] text-[#0A0A0A] px-4 py-3.5 font-mono text-xs focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#A1A1AA]"
                placeholder="you@company.com"
                required
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <button
                className="w-full sm:w-auto bg-[#0A0A0A] hover:bg-[#27272A] text-white px-6 py-3.5 font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors"
                type="submit"
              >
                Get Started →
              </button>
            </form>
          ) : (
            <div className="mt-8 p-4 bg-white border border-emerald-500/30 text-emerald-800 text-xs font-mono max-w-md w-full text-center">
              ✓ Docket authorization dispatched to <strong className="text-black">{emailInput}</strong>. Check your inbox for trial keys!
            </div>
          )}

          <div className="mt-4 font-mono text-[11px] text-[#71717A]">
            Zero configuration required · Soc2 Type II Certified
          </div>
        </div>
      </section>
    </div>
  );
};
