export type NavigationPage = 'home' | 'the-court' | 'verdicts' | 'about';

export type VerdictStatus = 'APPROVED' | 'REJECTED' | 'CONDITIONAL' | 'APPEALED';

export interface TrialCase {
  id: string;
  prNumber: number;
  title: string;
  repository: string;
  author: string;
  date: string;
  status: VerdictStatus;
  prosecutionConfidence: number;
  defenseConfidence: number;
  riskScore: 'LOW' | 'MEDIUM' | 'CRITICAL';
  indictment: {
    count: string;
    description: string;
    exploitSynthesis: string[];
    claim: string;
  };
  defense: {
    plea: string;
    verifiedInvariant: string[];
    exhibit: string;
  };
  evidenceDiff: {
    filename: string;
    lines: string;
    diffSnippet: Array<{ type: 'context' | 'add' | 'del'; code: string }>;
  };
  telemetry: {
    memHeap: string;
    clockMs: number;
    flamegraph: 'STABLE' | 'DEGRADED' | 'RACE_DETECTED' | 'OPTIMAL';
    workers: number;
    fuzzIterations: string;
  };
  juryVotes: [
    { juror: string; role: string; vote: 'PASS' | 'FAIL' | 'CONDITIONAL' },
    { juror: string; role: string; vote: 'PASS' | 'FAIL' | 'CONDITIONAL' },
    { juror: string; role: string; vote: 'PASS' | 'FAIL' | 'CONDITIONAL' }
  ];
  determinationSummary: string;
}

export interface AgentTopologyNode {
  id: string;
  label: string;
  faction: 'neutral' | 'prosecution' | 'defense' | 'jury';
  role: string;
  description: string;
  capabilities: string[];
  status: 'ONLINE' | 'ACTIVE_AUDIT' | 'IDLE';
}
