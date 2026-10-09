import { TrialCase, AgentTopologyNode } from '../types';

export const INITIAL_TRIAL_CASES: TrialCase[] = [
  {
    id: 'case-4819',
    prNumber: 4819,
    title: 'auth_session_invalidation.rs',
    repository: 'hypergrid/runtime-core',
    author: 'd_miller',
    date: '2026-10-09 02:41 UTC',
    status: 'APPROVED',
    prosecutionConfidence: 94.2,
    defenseConfidence: 89.0,
    riskScore: 'CRITICAL',
    indictment: {
      count: 'Indictment Count I',
      description: 'Concurrence failure in lock stripping during revoke token propagation.',
      exploitSynthesis: [
        '> spawn 100 racers on /api/v2/session/kill',
        '> socket fd leak confirmed: fd=42 persists',
        '> race window: 14.8μs between cache read & cluster notify'
      ],
      claim: 'PR introduces dirty reads on Postgres read-replicas under load > 5k rps.'
    },
    defense: {
      plea: 'Redis atomic_pop guarantees linearization. Socket persistence is an ephemeral artifact of local loopback.',
      verifiedInvariant: [
        '> formal_spec::assert_linear_order()',
        '> 0 deadlocks observed across 1,000 runs',
        '> monotonic epoch counter validated in TLA+'
      ],
      exhibit: 'Fallback pool drain executes within 18 microseconds.'
    },
    evidenceDiff: {
      filename: 'src/auth/session.rs',
      lines: 'lines 142-146',
      diffSnippet: [
        { type: 'del', code: '- if let Some(token) = cache.get(&session_id) {' },
        { type: 'add', code: '+ if let Ok(token) = redis_cluster.atomic_pop(&session_id) {' },
        { type: 'context', code: '     token.revoke_all_subordinates();' },
        { type: 'add', code: '+    metrics::counter!("session_nuked", 1);' },
        { type: 'context', code: '  }' }
      ]
    },
    telemetry: {
      memHeap: '14.2MB',
      clockMs: 212,
      flamegraph: 'STABLE',
      workers: 32,
      fuzzIterations: '24,000 runs'
    },
    juryVotes: [
      { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: 'PASS' },
      { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: 'PASS' },
      { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'CONDITIONAL' }
    ],
    determinationSummary: 'MERGE ORDER APPROVED'
  },
  {
    id: 'case-1042',
    prNumber: 1042,
    title: 'slab_allocator_recycle.c',
    repository: 'kernel-subsys/memcore',
    author: 's_vance',
    date: '2026-10-08 19:15 UTC',
    status: 'REJECTED',
    prosecutionConfidence: 98.7,
    defenseConfidence: 41.2,
    riskScore: 'CRITICAL',
    indictment: {
      count: 'Indictment Count II - Heap Corruption',
      description: 'Double free vulnerability during page chunk boundary realignment.',
      exploitSynthesis: [
        '> fuzz login --case-insensitive --workers 32',
        '> collision found: [0x7f..e1] != [0x7f..e2]',
        '> ASAN report: heap-use-after-free in slab_free_chunk:218'
      ],
      claim: 'Allocator bypass allows remote payload write into neighbor virtual memory pages.'
    },
    defense: {
      plea: 'Boundary check was offset by word size alignment to maximize cache line throughput.',
      verifiedInvariant: [
        '> formal_spec::assert_page_boundary() FAILED',
        '> 14 corruptions detected under stress harness'
      ],
      exhibit: 'Proposed fallback patch fails Valgrind clean-pass assertion.'
    },
    evidenceDiff: {
      filename: 'mm/slab_alloc.c',
      lines: 'lines 212-218',
      diffSnippet: [
        { type: 'del', code: '- if (chunk->refcount == 0) free_page(chunk);' },
        { type: 'add', code: '+ if (--chunk->refcount <= 0) fast_recycle(chunk->addr);' },
        { type: 'context', code: '  spin_unlock(&slab_lock);' },
        { type: 'del', code: '- return OK;' },
        { type: 'add', code: '+ return (chunk->addr != NULL);' }
      ]
    },
    telemetry: {
      memHeap: '88.4MB',
      clockMs: 489,
      flamegraph: 'RACE_DETECTED',
      workers: 64,
      fuzzIterations: '120,000 runs'
    },
    juryVotes: [
      { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: 'FAIL' },
      { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: 'FAIL' },
      { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'PASS' }
    ],
    determinationSummary: 'BLOCK · CRITICAL HEAP EXPLOIT SYNTHESIZED'
  },
  {
    id: 'case-7721',
    prNumber: 7721,
    title: 'raft_lease_read_skew.go',
    repository: 'apex-storage/consensus',
    author: 't_kimura',
    date: '2026-10-08 14:02 UTC',
    status: 'CONDITIONAL',
    prosecutionConfidence: 78.4,
    defenseConfidence: 84.1,
    riskScore: 'MEDIUM',
    indictment: {
      count: 'Indictment Count III - Stale Read Window',
      description: 'Clock drift exceeds heartbeat threshold during leader lease handover.',
      exploitSynthesis: [
        '> inject 150ms NTP jitter on node-3',
        '> follower answers read query prior to term confirmation',
        '> skew window: 18ms stale key-value pair returned'
      ],
      claim: 'Violates Linearizable Read semantics under network partitions.'
    },
    defense: {
      plea: 'TrueTime bounded error bounds lease interval before monotonic tick expiration.',
      verifiedInvariant: [
        '> Jepsen test suite: 1 minor isolation anomaly under split brain',
        '> Self-healing epoch sync restores linear order within 40ms'
      ],
      exhibit: 'Guard assertion added for monotonic clock check.'
    },
    evidenceDiff: {
      filename: 'consensus/raft_lease.go',
      lines: 'lines 88-94',
      diffSnippet: [
        { type: 'del', code: '- if time.Now().Before(r.leaseExpires) {' },
        { type: 'add', code: '+ if monotonicNow() < r.leaseExpiresMonotonic {' },
        { type: 'context', code: '    return r.localReadCache(key)' },
        { type: 'context', code: '  }' },
        { type: 'add', code: '+ return r.forwardToLeaderSync(key)' }
      ]
    },
    telemetry: {
      memHeap: '22.8MB',
      clockMs: 340,
      flamegraph: 'DEGRADED',
      workers: 16,
      fuzzIterations: '48,000 runs'
    },
    juryVotes: [
      { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: 'PASS' },
      { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: 'CONDITIONAL' },
      { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'PASS' }
    ],
    determinationSummary: 'CONDITIONAL PASS · REQUIRE HARD MONOTONIC CLOCK ASSERTION'
  },
  {
    id: 'case-3390',
    prNumber: 3390,
    title: 'reentrancy_vault_v3.sol',
    repository: 'aegis-defi/settlement',
    author: 'clara_h',
    date: '2026-10-07 22:50 UTC',
    status: 'APPEALED',
    prosecutionConfidence: 91.5,
    defenseConfidence: 93.8,
    riskScore: 'CRITICAL',
    indictment: {
      count: 'Indictment Count IV - Cross-Function Call Inversion',
      description: 'Flash loan callback invokes deposit hook before state ledger settlement.',
      exploitSynthesis: [
        '> mock flashloan 5,000,000 USDC via Foundry testbench',
        '> reenter vault during token fallback hook',
        '> extraction: drained 12% excess yield tokens'
      ],
      claim: 'Attacker can manipulate price per share before storage synchronization.'
    },
    defense: {
      plea: 'CEI pattern strictly upheld; ephemeral balance snapshot prevents double disbursement.',
      verifiedInvariant: [
        '> Certora formal prover confirms 0 paths to unauthorized withdrawal',
        '> Reentrancy lock primitive deployed at root execution layer'
      ],
      exhibit: 'Appeal docket #APP-3390 accepted with modified reentrancy modifier.'
    },
    evidenceDiff: {
      filename: 'contracts/VaultV3.sol',
      lines: 'lines 310-316',
      diffSnippet: [
        { type: 'del', code: '- (bool s, ) = msg.sender.call{value: amt}(""); require(s);' },
        { type: 'del', code: '- userShares[msg.sender] -= shares;' },
        { type: 'add', code: '+ userShares[msg.sender] -= shares;' },
        { type: 'add', code: '+ (bool s, ) = msg.sender.call{value: amt}(""); require(s);' },
        { type: 'context', code: '  emit Withdrawal(msg.sender, amt);' }
      ]
    },
    telemetry: {
      memHeap: '9.4MB',
      clockMs: 180,
      flamegraph: 'OPTIMAL',
      workers: 32,
      fuzzIterations: '64,000 runs'
    },
    juryVotes: [
      { juror: 'JUROR 1 // SEC', role: 'Security Oracle', vote: 'PASS' },
      { juror: 'JUROR 2 // LOGIC', role: 'Formal Prover', vote: 'PASS' },
      { juror: 'JUROR 3 // PERF', role: 'Throughput Auditor', vote: 'PASS' }
    ],
    determinationSummary: 'APPEAL UPHELD · PR RESTORED TO MERGE DOCKET'
  }
];

export const AGENT_TOPOLOGY_NODES: AgentTopologyNode[] = [
  {
    id: 'chief-justice',
    label: 'CHIEF JUSTICE',
    faction: 'neutral',
    role: 'Orchestration & Final Sanction',
    description: 'Manages trial dockets, computes dynamic blast radius heuristics, enforces the Code Civil Protocol, and certifies cryptographically signed merge certificates.',
    capabilities: ['Docket Allocation', 'Risk Heuristics', 'Merge Token Minting', 'Sanction Execution'],
    status: 'ONLINE'
  },
  {
    id: 'intake-agent',
    label: 'INTAKE AGENT',
    faction: 'neutral',
    role: 'AST & Diff Parser',
    description: 'Deconstructs Git diffs into abstract syntax trees, isolates changed execution call graphs, and spins up microVM containers.',
    capabilities: ['Tree-sitter Parsing', 'Dependency Graphing', 'MicroVM Bootstrapping', 'Firewall Isolation'],
    status: 'ONLINE'
  },
  {
    id: 'prosecution',
    label: 'PROSECUTION AGENT',
    faction: 'prosecution',
    role: 'Adversarial Exploit Synthesizer',
    description: 'Aggressively searches for race conditions, heap corruptions, logic regressions, and API misuses. Rejects theoretical arguments without executable test proof.',
    capabilities: ['Exploit Generation', 'Dynamic Fuzzing', 'Memory Leaking', 'Differential Mutation'],
    status: 'ACTIVE_AUDIT'
  },
  {
    id: 'evidence-clerk',
    label: 'EVIDENCE CLERK',
    faction: 'neutral',
    role: 'MicroVM Sandbox Attestation',
    description: 'Runs ephemeral Linux microVMs, captures standard out/err, collects memory flamegraphs, and commits tamper-proof execution logs to the ledger.',
    capabilities: ['Firecracker MicroVMs', 'eBPF Profiling', 'Flamegraph Analysis', 'Cryptographic Tape Ledger'],
    status: 'ONLINE'
  },
  {
    id: 'defense',
    label: 'DEFENSE AGENT',
    faction: 'defense',
    role: 'Invariant & Safety Counsel',
    description: 'Synthesizes formal proofs, mathematical safety bounds, TLA+ specifications, and micro-benchmarks to prove invariant preservation.',
    capabilities: ['Formal Invariants', 'SMT Solving (Z3)', 'Micro-benchmarking', 'Auto-Refactoring Diffs'],
    status: 'ACTIVE_AUDIT'
  },
  {
    id: 'jury-triad',
    label: 'JURY TRIAD',
    faction: 'jury',
    role: 'Multi-Perspective Ruling',
    description: 'Three specialized deterministic evaluator agents (Security, Logic, Performance) that cast immutable votes strictly conditioned on empirical benchmark logs.',
    capabilities: ['Consensus Quorum', 'Threshold Signatures', 'Dissent Logging', 'Appeal Arbitration'],
    status: 'ONLINE'
  },
  {
    id: 'fuzz-core',
    label: 'FUZZ_CORE',
    faction: 'prosecution',
    role: 'Mutation Fuzzing Subagent',
    description: 'Synthesizes boundary conditions, malformed UTF-8, integer overflows, and concurrent thread interleavings.',
    capabilities: ['Coverage-guided Fuzzing', 'AFL/LibFuzzer Wrapper', 'Thread Race Interleaving'],
    status: 'ACTIVE_AUDIT'
  },
  {
    id: 'exploit-gen',
    label: 'EXPLOIT_GEN',
    faction: 'prosecution',
    role: 'Weaponized Payload Generator',
    description: 'Translates theoretical vulnerabilities into deterministic execution scripts executed against staging containers.',
    capabilities: ['Container Breakout Probing', 'Deadlock Inducer', 'Memory Corruption Payloads'],
    status: 'ACTIVE_AUDIT'
  },
  {
    id: 'invariance-pf',
    label: 'INVARIANCE_PF',
    faction: 'defense',
    role: 'Symbolic Execution Engine',
    description: 'Validates inductive loop invariants, type boundary conditions, and state transitions.',
    capabilities: ['Symbolic Execution', 'Hoare Logic Checking', 'Inductive Step Validation'],
    status: 'ACTIVE_AUDIT'
  },
  {
    id: 'bench-probe',
    label: 'BENCH_PROBE',
    faction: 'defense',
    role: 'Low-overhead Micro-profiler',
    description: 'Audits p99 and p99.9 latencies, cache-miss rates, allocation churn, and lock contention.',
    capabilities: ['Differential Flamegraph', 'Lock Hold-Time Profiler', 'Cache-Miss Accounting'],
    status: 'ACTIVE_AUDIT'
  }
];

export const FAQ_ITEMS = [
  {
    question: 'How is this different from generic AI code review?',
    answer: 'Standard AI tools summarize your code or offer polite stylistic comments based purely on token likelihood. PR Court pairs adversarial agents in real runtime microVMs. Indictments are only valid if an automated test actually fails or an exploit reproduces in execution.'
  },
  {
    question: 'What does the sandbox actually run?',
    answer: 'Each PR spins up an ephemeral Firecracker microVM with isolated network namespaces. The prosecution agent synthesizes dynamic unit tests, fuzz harnesses, and differential benchmarks against your build artifacts.'
  },
  {
    question: 'Does it execute on every single pull request?',
    answer: 'PR Court features Risk-Adaptive Trials. Documentation changes, copy edits, and low-complexity CSS are dismissed with immediate merge certification, reserving high-power compute clusters for stateful architectural mutations.'
  },
  {
    question: 'Can developers appeal an adverse verdict?',
    answer: 'Yes. Commenting /appeal --rationale="[reason]" reopens the docket. The defense agent incorporates your rationale and forces the prosecution to execute a counter-proof or forfeit the objection.'
  },
  {
    question: 'Is my proprietary codebase safe?',
    answer: 'MicroVMs exist for the trial duration and are cryptographically scrubbed immediately after jury deliberation. No models train on private customer repositories, and on-premises VPC runners are fully supported.'
  }
];

export const TESTIMONIALS = [
  {
    quote: '"The prosecution agent generated a race condition that neither our senior engineers nor our fuzzers caught in three months. The trial sandbox proved the memory leak in 90 seconds."',
    author: 'Elena Rostova',
    role: 'Principal Architect · VaultLine'
  },
  {
    quote: '"Human reviews were polite shrugs with \'LGTM\'. PR Court treats every commit like an adversarial subpoena. Our critical production incident rate plummeted by 78%."',
    author: 'Marcus Vance',
    role: 'Staff SRE · Distributed Core'
  },
  {
    quote: '"What sold us was the absence of AI babble. If the prosecutor can’t make it crash in an actual container with real packets, the claim is thrown out of court."',
    author: 'Siddharth Nair',
    role: 'Head of Infrastructure · ApexDB'
  },
  {
    quote: '"The defense agent is remarkably clever. It automatically refactors diffs to survive cross-subsystem invariance checks without developer context switching."',
    author: 'Clara Hauge',
    role: 'Lead Security Counsel · KernelOS'
  }
];
