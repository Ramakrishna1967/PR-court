import React, { useState } from 'react';

interface GitHubAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubAppModal: React.FC<GitHubAppModalProps> = ({ isOpen, onClose }) => {
  const [installed, setInstalled] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('hypergrid/runtime-core');
  const [triggerPolicy, setTriggerPolicy] = useState('risk-adaptive');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-[#0e0e11] border border-white/20 text-white p-6 font-telemetry-code shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white text-[18px]">terminal</span>
            <span className="font-serif text-lg tracking-tight">GitHub App Integration</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            ✕
          </button>
        </div>

        {!installed ? (
          <div className="mt-5 space-y-4 text-xs">
            <p className="text-zinc-300 leading-relaxed font-mono">
              Authorize PR Court to intercept incoming pull requests, spin up ephemeral microVMs, and enforce cryptographic merge checks directly in your GitHub CI checks API.
            </p>

            <div>
              <label className="text-[11px] uppercase text-zinc-400 block mb-1">
                Target Repository:
              </label>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-[#050506] border border-white/10 text-white p-2 text-xs focus:outline-none"
              >
                <option value="hypergrid/runtime-core">hypergrid / runtime-core (Rust/C++)</option>
                <option value="apex-storage/consensus">apex-storage / consensus (Go/Raft)</option>
                <option value="aegis-defi/settlement">aegis-defi / settlement (Solidity/EVM)</option>
                <option value="all-repositories">All Selected Repositories</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] uppercase text-zinc-400 block mb-1">
                Tribunal Trigger Policy:
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer p-2 border border-white/10 hover:border-white/20 bg-[#131316]">
                  <input
                    type="radio"
                    name="policy"
                    checked={triggerPolicy === 'risk-adaptive'}
                    onChange={() => setTriggerPolicy('risk-adaptive')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-white font-semibold block">Risk-Adaptive (Recommended)</span>
                    <span className="text-zinc-400 text-[10px]">
                      Markdown/CSS skipped automatically; critical concurrency & auth PRs trigger full sandbox trial.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer p-2 border border-white/10 hover:border-white/20 bg-[#131316]">
                  <input
                    type="radio"
                    name="policy"
                    checked={triggerPolicy === 'strict'}
                    onChange={() => setTriggerPolicy('strict')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-white font-semibold block">Strict Civil Tribunal</span>
                    <span className="text-zinc-400 text-[10px]">
                      Every single pull request must receive unanimous jury pass votes before merge.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-3 bg-[#050506] border border-white/[0.08] text-[11px] text-zinc-400 font-mono">
              <div>HOOK: https://api.prcourt.dev/v2/github/webhook</div>
              <div>PERMISSIONS: Pull Requests (Read & Write), Checks (Read & Write)</div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-white/10 text-zinc-400 hover:text-white uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => setInstalled(true)}
                className="px-5 py-2 bg-white text-black font-semibold hover:bg-zinc-200 uppercase transition-colors"
              >
                Install & Authenticate
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-xs">
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>GitHub App Installed Successfully</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Connected to <strong className="text-white">{selectedRepo}</strong>. Webhook listener active.
              </p>
            </div>

            <div className="bg-[#050506] p-3 border border-white/10 font-mono text-[11px] text-zinc-400 space-y-1">
              <div>STATUS: Ready for pull requests</div>
              <div>APP_ID: 1048291</div>
              <div>PUBLIC_KEY: ed25519:7e8a9f...c31b</div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-white text-black font-semibold hover:bg-zinc-200 uppercase"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
