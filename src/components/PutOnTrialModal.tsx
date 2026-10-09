import React, { useState } from 'react';
import { api, ApiError } from '../lib/api/client';
import { useTrialStream, useMockTrialStream } from '../lib/api/useTrialStream';
import { LiveTrialView } from './LiveTrialView';

const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true';

interface PutOnTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Legacy prop kept for backwards compat – no longer used */
  onTrialSubmitted?: (newCase: any) => void;
}

// ── Sub-component: Live trial overlay shown after submission ──────────────────

function TrialOverlay({ trialId, onClose }: { trialId: string; onClose: () => void }) {
  const realStream = useTrialStream(USE_MOCK ? null : trialId);
  const mockStream = useMockTrialStream(trialId);
  const trial = USE_MOCK ? mockStream : realStream;

  if (!trial) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 font-mono text-sm animate-pulse">
        Connecting to trial stream...
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-[60vh] overflow-y-auto">
      <LiveTrialView trialId={trialId} trial={trial} onClose={onClose} />
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export const PutOnTrialModal: React.FC<PutOnTrialModalProps> = ({ isOpen, onClose, onTrialSubmitted }) => {
  const [prUrl, setPrUrl] = useState('');
  const [preset, setPreset] = useState<'custom' | 'auth' | 'mem' | 'concurrency'>('auth');
  const [diffCode, setDiffCode] = useState(`// lines 88-94 / src/security/token_pool.rs
- if pool.contains(&user_id) { pool.remove(&user_id); }
+ if let Some(idx) = pool.atomic_swap(&user_id, None) {
+     evict_cache_line(idx);
+ }`);
  const [runtimeEnv, setRuntimeEnv] = useState('Firecracker microVM (x86_64 Linux 6.11)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTrialId, setActiveTrialId] = useState<string | null>(null);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

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

  const parsePrUrl = (url: string): { repo: string; pr_number: number } | null => {
    // https://github.com/owner/repo/pull/123
    const m = url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
    if (m) return { repo: m[1], pr_number: parseInt(m[2]) };
    return null;
  };

  const handleRunTrial = async () => {
    setError(null);
    setIsSubmitting(true);
    setSimulationLog(['» Initiating PR Court trial...']);

    try {
      let repo = 'acme/auth-service';
      let pr_number = 42;

      const parsed = parsePrUrl(prUrl);
      if (parsed) {
        repo = parsed.repo;
        pr_number = parsed.pr_number;
      } else if (prUrl.trim()) {
        setError('Invalid GitHub PR URL. Use: https://github.com/owner/repo/pull/123');
        setIsSubmitting(false);
        return;
      }

      // In mock mode: use fake trial ID and bypass API call
      if (USE_MOCK) {
        setSimulationLog(prev => [...prev, '» [MOCK] Spawning mock trial replay...']);
        const mockId = `mock-${Date.now()}`;
        setActiveTrialId(mockId);
        setIsSubmitting(false);
        return;
      }

      setSimulationLog(prev => [...prev, `» Submitting ${repo} PR #${pr_number} to tribunal...`]);
      const res = await api.createTrial(repo, pr_number);
      setSimulationLog(prev => [...prev, `» Trial ID: ${res.trial_id}`, '» Connecting to live event stream...']);
      setActiveTrialId(res.trial_id);

      // Legacy callback – pass a minimal object
      onTrialSubmitted?.({
        id: res.trial_id,
        prNumber: pr_number,
        title: `PR #${pr_number}`,
        repository: repo,
        author: 'you',
        date: new Date().toUTCString(),
        status: 'CONDITIONAL',
        prosecutionConfidence: 0,
        defenseConfidence: 0,
        riskScore: 'MEDIUM',
        indictment: { count: '', description: '', exploitSynthesis: [], claim: '' },
        defense: { plea: '', verifiedInvariant: [], exhibit: '' },
        evidenceDiff: { filename: '', lines: '', diffSnippet: [] },
        telemetry: { memHeap: '', clockMs: 0, flamegraph: 'STABLE', workers: 0, fuzzIterations: '' },
        juryVotes: [
          { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: 'PASS' },
          { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: 'PASS' },
          { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'PASS' },
        ],
        determinationSummary: 'TRIAL IN PROGRESS',
      });

    } catch (e) {
      if (e instanceof ApiError) {
        setError(`API Error ${e.status}: ${e.message}`);
      } else {
        setError(String(e));
      }
      setIsSubmitting(false);
    } finally {
      if (!activeTrialId) setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveTrialId(null);
    setIsSubmitting(false);
    setError(null);
    setSimulationLog([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-[#0e0e11] border border-white/20 text-white shadow-2xl p-6 font-telemetry-code max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-white" />
            <span className="font-serif text-xl tracking-tight font-medium">Put a PR on Trial</span>
            <span className="text-[10px] uppercase border border-white/10 px-2 py-0.5 text-zinc-400">
              {USE_MOCK ? 'MOCK MODE' : 'DOCKET DISPATCH'}
            </span>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white p-1 text-lg leading-none">✕</button>
        </div>

        {/* Active trial overlay */}
        {activeTrialId ? (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs text-emerald-400 uppercase">Tribunal In Session</span>
            </div>
            <TrialOverlay trialId={activeTrialId} onClose={handleClose} />
          </div>
        ) : (
          /* Input form */
          <div className="mt-6 space-y-6">
            {/* Preset buttons */}
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
                GitHub PR URL
              </label>
              <input
                type="text"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/org/repo/pull/123"
                className="w-full bg-[#050506] border border-white/10 text-white px-3 py-2 text-xs focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Code diff */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] uppercase text-zinc-400">Unified Diff Payload</label>
                <span className="text-[10px] text-zinc-500">SYNTAX: GIT UNIFIED DIFF</span>
              </div>
              <textarea
                rows={6}
                value={diffCode}
                onChange={(e) => setDiffCode(e.target.value)}
                className="w-full bg-[#050506] border border-white/10 text-zinc-300 p-3 text-xs font-mono focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Runtime */}
            <div>
              <label className="text-[11px] uppercase text-zinc-400 block mb-1">Target Sandbox Runtime</label>
              <select
                value={runtimeEnv}
                onChange={(e) => setRuntimeEnv(e.target.value)}
                className="w-full bg-[#050506] border border-white/10 text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
              >
                <option value="Firecracker microVM (x86_64 Linux 6.11)">Firecracker microVM (x86_64 Linux 6.11)</option>
                <option value="Docker container (pr-court-sandbox:latest)">Docker container (pr-court-sandbox:latest)</option>
              </select>
            </div>

            {/* Submission log */}
            {simulationLog.length > 0 && (
              <div className="p-3 bg-[#050506] border border-white/15 space-y-1 text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>TRIBUNAL TRIAL IN PROGRESS...</span>
                </div>
                {simulationLog.map((log, i) => (
                  <div key={i} className="text-zinc-400 font-mono text-[11px]">{log}</div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-300 font-mono text-xs">
                ✗ {error}
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <div className="text-[11px] text-zinc-500">
                {USE_MOCK ? 'Mock mode – no backend required' : 'Soc2 Type II · Ephemeral VM scrubbed post-verdict'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs uppercase border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunTrial}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs uppercase font-semibold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Commence Trial</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
