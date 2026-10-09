import React from 'react';

interface AboutViewProps {
  onOpenTrialModal: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onOpenTrialModal }) => {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-12 text-[#e4e1e6]">
      <div className="max-w-3xl mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 border border-white/10 px-2 py-0.5 bg-[#0e0e11]">
            PHILOSOPHY & ORIGIN
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            EST. 2026
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-white tracking-tight">
          The End of <span className="font-serif italic text-zinc-300 font-normal">Rubber-Stamp Reviews.</span>
        </h1>
        <p className="mt-4 font-mono text-zinc-400 text-sm leading-relaxed">
          Why we built PR Court: standard peer review is fundamentally broken for high-consequence software, and polite AI assistants make the problem worse.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-t border-white/[0.08] pt-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8 font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-2xl text-white">The Asymmetry Crisis</h2>
            <p>
              In distributed systems, database kernels, and cryptographic protocols, developers spend forty to eighty hours reasoning about concurrency, memory layout, and failure modes. Yet the review process consists of a peer glancing at the GitHub diff between meetings, checking for formatting conformity, and typing <code>LGTM</code>.
            </p>
            <p>
              When AI arrived, teams hoped it would solve this. Instead, LLMs flooded PR threads with verbose, sycophantic comments praising variable naming while hallucinating non-existent race conditions and missing actual heap exploits.
            </p>
          </section>

          <section className="space-y-4 border-t border-white/[0.08] pt-8">
            <h2 className="font-serif text-2xl text-white">The Dialectic Court Solution</h2>
            <p>
              Truth does not emerge from a single model generating an opinionated summary. Truth emerges from <strong>adversarial conflict backed by physical machine execution</strong>.
            </p>
            <div className="p-4 bg-[#0e0e11] border border-white/10 space-y-2 text-xs">
              <div className="text-white font-semibold">Our Three Core Tenets:</div>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-white">Zero Theoretical Speculation:</strong> If an adversarial agent claims an exploit exists, it must synthesize an automated harness that fails with non-zero exit code inside an actual microVM container.</li>
                <li><strong className="text-white">Proof of Invariant:</strong> The defense agent must present verified invariants checkable by formal methods (SMT / Z3 / TLA+).</li>
                <li><strong className="text-white">Consensus Quorum:</strong> A three-juror tribunal rules strictly on execution telemetry, differential flamegraphs, and allocation bounds.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/[0.08] pt-8">
            <h2 className="font-serif text-2xl text-white">Privacy & Security Guarantees</h2>
            <p>
              PR Court was engineered for sovereign infrastructure. Ephemeral microVM instances run in ramdisks with isolated network namespaces. Once a verdict is rendered and signed with ed25519 keys, the runtime memory is completely wiped with cryptographic zero-fill.
            </p>
            <p>
              No customer code is ever retained for model training or persistent storage.
            </p>
          </section>
        </div>

        {/* Sidebar / Stats */}
        <div className="lg:col-span-4 space-y-6 font-mono text-xs">
          <div className="p-6 bg-[#0e0e11] border border-white/[0.08] space-y-4">
            <div className="text-white font-semibold uppercase text-xs">System Registry</div>
            <div className="space-y-2 text-zinc-400">
              <div className="flex justify-between border-b border-white/[0.05] pb-1">
                <span>Protocol:</span>
                <span className="text-white">Code Civil V2.1</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-1">
                <span>Execution Core:</span>
                <span className="text-white">Linux 6.11 MicroVM</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-1">
                <span>Formal Solver:</span>
                <span className="text-white">Z3 SMT Prover 4.12</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-1">
                <span>Verification:</span>
                <span className="text-emerald-400">Soc2 Type II Certified</span>
              </div>
            </div>

            <button
              onClick={onOpenTrialModal}
              className="w-full mt-4 py-3 bg-white text-black font-semibold uppercase text-center hover:bg-zinc-200 transition-colors"
            >
              Put a PR on Trial
            </button>
          </div>

          <div className="p-6 bg-[#0e0e11] border border-white/[0.08] space-y-2">
            <div className="text-white font-semibold uppercase text-xs">Engineering Lineage</div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Founded by former database engine architects, microkernel developers, and formal methods researchers tired of debugging production outages caused by rubber-stamped pull requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
