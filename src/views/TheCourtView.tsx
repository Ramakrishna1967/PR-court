import React, { useState } from 'react';
import { TopologyDiagram } from '../components/TopologyDiagram';

interface TheCourtViewProps {
  onOpenTrialModal: () => void;
}

export const TheCourtView: React.FC<TheCourtViewProps> = ({ onOpenTrialModal }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'microvm' | 'protocol' | 'benchmarks'>('architecture');

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-12 text-[#e4e1e6]">
      {/* Page Header */}
      <div className="max-w-3xl mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 border border-white/10 px-2 py-0.5 bg-[#0e0e11]">
            JUDICIAL ARCHITECTURE // SPEC V3.2
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            DECENTRALIZED DIALECTIC ENGINE
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-white tracking-tight">
          The Architecture of <span className="font-serif italic text-zinc-300 font-normal">Adversarial Review.</span>
        </h1>
        <p className="mt-4 font-mono text-zinc-400 text-sm leading-relaxed">
          PR Court rejects single-agent LLM consensus. Instead, we pit specialized adversarial models in an isolated arena governed by strict evidence protocols and cryptographic consensus.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4 mb-8 font-mono text-xs uppercase">
        {[
          { id: 'architecture', label: '1. Tribunal Topology' },
          { id: 'microvm', label: '2. MicroVM Sandboxing' },
          { id: 'protocol', label: '3. Code Civil Protocol' },
          { id: 'benchmarks', label: '4. Fuzzing Benchmarks' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border transition-colors ${
              activeTab === tab.id
                ? 'border-white bg-[#2a2a2d] text-white font-semibold'
                : 'border-white/10 bg-[#131316] text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Tribunal Topology */}
      {activeTab === 'architecture' && (
        <div className="space-y-8">
          <div className="border border-white/[0.08] bg-[#0e0e11] p-6 lg:p-8">
            <h2 className="font-serif text-2xl text-white mb-2">Decentralized Agent Hierarchy</h2>
            <p className="font-mono text-xs text-zinc-400 mb-6">
              Click on any node in the topology below to inspect its operational charter and sandboxing permissions.
            </p>
            <TopologyDiagram />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-white/[0.08] bg-[#0e0e11] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-400"></span>
                <h3 className="font-serif text-lg text-white">The Prosecution</h3>
              </div>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed">
                Tasked with breaking the pull request at all costs. Generates malicious input permutations, concurrency race threads, boundary overflows, and memory leaks.
              </p>
              <div className="p-2 bg-red-950/20 border border-red-500/20 font-mono text-[11px] text-red-300">
                Rule: An indictment is immediately thrown out if it cannot trigger an actual non-zero exit code in the sandbox.
              </div>
            </div>

            <div className="border border-white/[0.08] bg-[#0e0e11] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-400"></span>
                <h3 className="font-serif text-lg text-white">The Defense</h3>
              </div>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed">
                Tasked with defending the engineer’s intent. Generates inductive safety proofs, symbolic invariants, and auto-refactors edge cases without altering API contracts.
              </p>
              <div className="p-2 bg-blue-950/20 border border-blue-500/20 font-mono text-[11px] text-blue-300">
                Capability: If an attack succeeds, Defense can propose a minimal diff amendment to preserve invariants.
              </div>
            </div>

            <div className="border border-white/[0.08] bg-[#0e0e11] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-400"></span>
                <h3 className="font-serif text-lg text-white">The Cryptographic Jury</h3>
              </div>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed">
                Three independent deterministic evaluators: Security Oracle, Formal Prover, and Throughput Auditor. Rules strictly on benchmark evidence and signed logs.
              </p>
              <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 font-mono text-[11px] text-emerald-300">
                Quorum: 2/3 votes required for Merge Order Approval; zero tolerance on reproducible heap corruptions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MicroVM Sandboxing */}
      {activeTab === 'microvm' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-white/[0.08] bg-[#0e0e11] p-6 space-y-4">
            <h2 className="font-serif text-2xl text-white">Firecracker MicroVM Isolation</h2>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Every PR trial allocates a single-use microVM booted from a read-only Alpine Linux rootfs. Jailer process restrictions prevent inter-tenant leakage or network breakout.
            </p>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#050506] border border-white/10 space-y-1">
                <div className="text-zinc-500">// VM Lifecycle Metrics</div>
                <div className="text-zinc-300">Boot Latency: <span className="text-emerald-400 font-semibold">8.2ms</span></div>
                <div className="text-zinc-300">Memory Ceiling: <span className="text-white">256MB per trial</span></div>
                <div className="text-zinc-300">Network Interface: <span className="text-amber-400">Isolated TAP (Zero outbound WAN)</span></div>
                <div className="text-zinc-300">Rootfs Teardown: <span className="text-white">Cryptographic zero-fill</span></div>
              </div>

              <div className="p-3 bg-[#050506] border border-white/10 space-y-1">
                <div className="text-zinc-500">// eBPF Instrumentation</div>
                <div className="text-zinc-300">Probe Hooks: sys_enter_execve, tcp_connect, futex_wait</div>
                <div className="text-zinc-300">Flamegraph Profiler: 1,000 samples/sec hardware counters</div>
              </div>
            </div>
          </div>

          <div className="border border-white/[0.08] bg-[#050506] p-6 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <span className="text-white font-semibold">SANDBOX_INIT_LOG.txt</span>
                <span className="text-[10px] text-emerald-400">VM_JAIL_ACTIVE</span>
              </div>
              <div className="text-zinc-400 space-y-1.5 leading-relaxed font-mono">
                <div>[0.001] jailer: dropping privileges to uid=1004 gid=1004</div>
                <div>[0.003] kvm: vcpu-0 online, vcpu-1 online</div>
                <div>[0.007] kernel: Linux version 6.11.2-fc (prcourt@tribunal)</div>
                <div>[0.008] init: mounting tmpfs on /evidence and /testbed</div>
                <div>[0.012] clerk: compiling test fixture with rustc -C opt-level=3</div>
                <div>[0.045] prober: attaching seccomp bpf sandbox filter</div>
                <div className="text-emerald-400">[0.052] ready: prosecution fuzzer connected on port 8080</div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-zinc-500 text-[11px]">IMMUTABLE AUDIT TRAIL</span>
              <button
                onClick={onOpenTrialModal}
                className="px-3 py-1.5 bg-white text-black font-semibold text-xs uppercase hover:bg-zinc-200"
              >
                Run MicroVM Trial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Code Civil Protocol */}
      {activeTab === 'protocol' && (
        <div className="border border-white/[0.08] bg-[#0e0e11] p-6 lg:p-8 space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="font-serif text-2xl text-white">The Code Civil Protocol V2.1</h2>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Codified judicial bylaws governing LLM debate, evidence admissibility, and final verdicts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div className="p-4 bg-[#050506] border border-white/10 space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-zinc-500">§ 101.</span> Inadmissibility of Speculation
              </div>
              <p className="text-zinc-400 leading-relaxed">
                No model is permitted to cite theoretical issues (e.g. "this function could potentially deadlock") without providing an executable test harness that reproduces the fault under microVM conditions.
              </p>
            </div>

            <div className="p-4 bg-[#050506] border border-white/10 space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-zinc-500">§ 102.</span> Burden of Mathematical Proof
              </div>
              <p className="text-zinc-400 leading-relaxed">
                If the Defense claims linearizability or lock freedom, it must provide a formal invariant model checkable via Z3 SMT solver within 5.0 seconds of CPU time.
              </p>
            </div>

            <div className="p-4 bg-[#050506] border border-white/10 space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-zinc-500">§ 103.</span> Right of Appeal
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Any engineer whose pull request has received an adverse verdict may file an appeal by commenting with rationale. The appeal opens an escalated tribunal with 4x fuzzing workers.
              </p>
            </div>

            <div className="p-4 bg-[#050506] border border-white/10 space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-zinc-500">§ 104.</span> Cryptographic Merge Sanction
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Merge approvals generate an ed25519 signed commit attestation. CI branch protection rejects any merge commit lacking this signed evidence header.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Fuzzing Benchmarks */}
      {activeTab === 'benchmarks' && (
        <div className="border border-white/[0.08] bg-[#0e0e11] p-6 lg:p-8 space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="font-serif text-2xl text-white">Empirical Fuzzing & Detection Rates</h2>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Performance metrics across 12,000+ open-source and enterprise repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-4 bg-[#050506] border border-white/10">
              <div className="text-2xl text-white font-bold">99.8%</div>
              <div className="text-zinc-500 text-xs mt-1">Reproducibility of Indictments</div>
            </div>
            <div className="p-4 bg-[#050506] border border-white/10">
              <div className="text-2xl text-white font-bold">14.8μs</div>
              <div className="text-zinc-500 text-xs mt-1">Smallest Race Window Detected</div>
            </div>
            <div className="p-4 bg-[#050506] border border-white/10">
              <div className="text-2xl text-white font-bold">0.00%</div>
              <div className="text-zinc-500 text-xs mt-1">Model Hallucinations Admitted</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
