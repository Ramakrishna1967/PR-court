import React, { useState } from 'react';
import { TrialCase } from '../types';

interface PutOnTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrialSubmitted: (newCase: TrialCase) => void;
}

export const PutOnTrialModal: React.FC<PutOnTrialModalProps> = ({ isOpen, onClose, onTrialSubmitted }) => {
  const [prUrl, setPrUrl] = useState('');
  const [preset, setPreset] = useState<'custom' | 'auth' | 'mem' | 'concurrency'>('auth');
  const [diffCode, setDiffCode] = useState(`// lines 88-94 / src/security/token_pool.rs
- if pool.contains(&user_id) { pool.remove(&user_id); }
+ if let Some(idx) = pool.atomic_swap(&user_id, None) {
+     evict_cache_line(idx);
+ }`);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [runtimeEnv, setRuntimeEnv] = useState('Firecracker microVM (x86_64 Linux 6.11)');

  if (!isOpen) return null;

  const handleSelectPreset = (p: 'custom' | 'auth' | 'mem' | 'concurrency') => {
    setPreset(p);
    if (p === 'auth') {
      setPrUrl('https://github.com/cloud-native/auth-srv/pull/914');
      setDiffCode(`// lines 41-48 / token_handler.go
- func ValidateToken(t string) bool { return cache.Has(t) }
+ func ValidateToken(t string) bool {
+   defer metrics.ObserveLatency("token_val")
+   return hmac.Equal(t, masterSecret)
+ }`);
    } else if (p === 'mem') {
      setPrUrl('https://github.com/engine-core/alloc/pull/402');
      setDiffCode(`// lines 102-108 / slab.c
- void* p = malloc(sz);
+ void* p = aligned_alloc(64, sz);
+ if (!p) abort();
+ memset(p, 0, sz);`);
    } else if (p === 'concurrency') {
      setPrUrl('https://github.com/db-system/storage/pull/211');
      setDiffCode(`// lines 200-205 / ring_buffer.rs
- while self.tail.load(Ordering::Relaxed) != head {}
+ while self.tail.compare_exchange_weak(head, head + 1, Ordering::SeqCst, Ordering::Relaxed).is_err() {
+   std::hint::spin_loop();
+ }`);
    }
  };

  const handleRunTrial = () => {
    setIsSimulating(true);
    setSimulationLog([
      '» [0.0s] Bootstrapping ephemeral microVM container...',
      '» [0.3s] AST parser analyzing abstract syntax tree diff...',
      '» [0.7s] Prosecution Agent synthesizing 16,000 fuzz permutations...',
      '» [1.2s] Defense Agent building Z3 formal invariant model...',
      '» [1.8s] Executing boundary test harness in ring-0 kernel sandbox...',
      '» [2.4s] Evidence Clerk recording eBPF flamegraph trace...',
      '» [2.9s] Jury Triad convened. Signing cryptographic verdict token...'
    ]);

    setTimeout(() => {
      const generatedPr = Math.floor(1000 + Math.random() * 8999);
      const isPass = Math.random() > 0.35;
      const createdCase: TrialCase = {
        id: `case-${generatedPr}`,
        prNumber: generatedPr,
        title: prUrl ? prUrl.split('/').pop() || 'custom_diff.rs' : 'sandbox_trial.rs',
        repository: prUrl.includes('github.com') ? prUrl.replace('https://github.com/', '').split('/pull')[0] : 'workspace/repository',
        author: 'developer_client',
        date: '2026-10-09 03:22 UTC',
        status: isPass ? 'APPROVED' : 'REJECTED',
        prosecutionConfidence: isPass ? 32.4 : 96.2,
        defenseConfidence: isPass ? 91.8 : 44.1,
        riskScore: isPass ? 'LOW' : 'CRITICAL',
        indictment: {
          count: isPass ? 'Indictment Withdrawn' : 'Indictment Count I - State Divergence',
          description: isPass ? 'Zero exploit synthesized after 16,000 permutations.' : 'Memory race detected during high concurrency burst.',
          exploitSynthesis: isPass ? ['> zero violations found across testbed'] : ['> 2 deadlocks reproduced in 40ms window', '> ASAN leak reported in thread worker 7'],
          claim: isPass ? 'Diff passes all formal specifications.' : 'PR introduces race condition under heavy load.'
        },
        defense: {
          plea: isPass ? 'Diff mathematically proven monotonic.' : 'Attempted atomic spin loop, but fallback lacks backoff.',
          verifiedInvariant: [
            '> formal_spec::assert_linear_order() validated',
            '> memory footprint within 12MB ceiling'
          ],
          exhibit: 'Trace proof recorded to immutable tape ledger.'
        },
        evidenceDiff: {
          filename: 'custom_patch.rs',
          lines: 'lines 1-12',
          diffSnippet: [
            { type: 'context', code: '// Evaluated diff patch' },
            { type: 'del', code: '- legacy_unsafe_handler();' },
            { type: 'add', code: '+ atomic_safe_handler();' }
          ]
        },
        telemetry: {
          memHeap: '16.4MB',
          clockMs: 240,
          flamegraph: isPass ? 'OPTIMAL' : 'RACE_DETECTED',
          workers: 32,
          fuzzIterations: '16,000 runs'
        },
        juryVotes: [
          { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: isPass ? 'PASS' : 'FAIL' },
          { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: isPass ? 'PASS' : 'FAIL' },
          { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'PASS' }
        ],
        determinationSummary: isPass ? 'MERGE ORDER APPROVED' : 'BLOCK · EXPLOIT SYNTHESIZED'
      };

      setIsSimulating(false);
      onTrialSubmitted(createdCase);
      onClose();
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#0e0e11] border border-white/20 text-white shadow-2xl p-6 font-telemetry-code max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-white"></span>
            <span className="font-serif text-xl tracking-tight font-medium">Put a PR on Trial</span>
            <span className="text-[10px] uppercase border border-white/10 px-2 py-0.5 text-zinc-400">
              DOCKET DISPATCH
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="text-[11px] uppercase text-zinc-400 block mb-2">
              Select Preset or Enter Custom Diff:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'auth', label: 'Auth Token Revoke' },
                { id: 'mem', label: 'Slab Memory Alloc' },
                { id: 'concurrency', label: 'Atomic Ring Buffer' },
                { id: 'custom', label: 'Custom PR Diff' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPreset(item.id as any)}
                  className={`p-2 text-xs border text-left transition-colors ${
                    preset === item.id
                      ? 'border-white bg-[#2a2a2d] text-white font-semibold'
                      : 'border-white/10 bg-[#131316] text-zinc-400 hover:border-white/30'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* GitHub PR URL */}
          <div>
            <label className="text-[11px] uppercase text-zinc-400 block mb-1">
              GitHub PR URL or Git Reference
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/123"
              className="w-full bg-[#050506] border border-white/10 text-white px-3 py-2 text-xs focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Code Diff Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase text-zinc-400">
                Unified Diff Payload
              </label>
              <span className="text-[10px] text-zinc-500">SYNTAX: GIT UNIFIED DIFF</span>
            </div>
            <textarea
              rows={6}
              value={diffCode}
              onChange={(e) => setDiffCode(e.target.value)}
              className="w-full bg-[#050506] border border-white/10 text-zinc-300 p-3 text-xs font-mono focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Runtime Isolation Selector */}
          <div>
            <label className="text-[11px] uppercase text-zinc-400 block mb-1">
              Target Sandbox Runtime
            </label>
            <select
              value={runtimeEnv}
              onChange={(e) => setRuntimeEnv(e.target.value)}
              className="w-full bg-[#050506] border border-white/10 text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
            >
              <option value="Firecracker microVM (x86_64 Linux 6.11)">
                Firecracker microVM (x86_64 Linux 6.11) — Zero Hypervisor Noise
              </option>
              <option value="eBPF Kernel Prober with Hardware Branch Tracing">
                eBPF Kernel Prober with Hardware Branch Tracing (kprobe/uprobe)
              </option>
              <option value="Wasm V8 Isolated Runtime with Deterministic Clocks">
                Wasm V8 Isolated Runtime with Deterministic Clocks
              </option>
            </select>
          </div>

          {/* Real-time simulation stream */}
          {isSimulating && (
            <div className="p-3 bg-[#050506] border border-white/15 space-y-1 text-xs">
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>TRIBUNAL TRIAL IN PROGRESS...</span>
              </div>
              {simulationLog.map((log, i) => (
                <div key={i} className="text-zinc-400 font-mono text-[11px]">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Soc2 Type II · Ephemeral VM scrubbed post-verdict
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSimulating}
              className="px-4 py-2 text-xs uppercase border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRunTrial}
              disabled={isSimulating}
              className="px-5 py-2 text-xs uppercase font-semibold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              {isSimulating ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">
                    progress_activity
                  </span>
                  <span>Litigating...</span>
                </>
              ) : (
                <>
                  <span>Commence Trial</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
