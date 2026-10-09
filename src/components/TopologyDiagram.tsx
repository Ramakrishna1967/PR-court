import React, { useState } from 'react';
import { AGENT_TOPOLOGY_NODES } from '../data/mockData';
import { AgentTopologyNode } from '../types';

export const TopologyDiagram: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<AgentTopologyNode>(AGENT_TOPOLOGY_NODES[0]);

  return (
    <div className="w-full">
      {/* Animated SVG Node Network */}
      <div className="w-full h-[250px] md:h-[280px] overflow-hidden relative mb-6 flex items-center justify-center">
        <svg
          className="w-full h-full max-w-4xl select-none"
          fill="none"
          viewBox="0 0 800 240"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Animated Connection Lines */}
          <path
            className="animate-pulse"
            d="M 400 40 L 150 110"
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <path
            d="M 400 40 L 275 110"
            stroke={selectedNode.faction === 'prosecution' ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.5)'}
            strokeDasharray="6 3"
            strokeWidth={selectedNode.faction === 'prosecution' ? '2.5' : '1.5'}
          />
          <path
            d="M 400 40 L 400 110"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
          />
          <path
            d="M 400 40 L 525 110"
            stroke={selectedNode.faction === 'defense' ? 'rgba(59,130,246,0.9)' : 'rgba(59,130,246,0.5)'}
            strokeDasharray="6 3"
            strokeWidth={selectedNode.faction === 'defense' ? '2.5' : '1.5'}
          />
          <path
            d="M 400 40 L 650 110"
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Subagent Branches */}
          <path
            d="M 275 130 L 210 190"
            stroke="rgba(239,68,68,0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 275 130 L 330 190"
            stroke="rgba(239,68,68,0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 525 130 L 470 190"
            stroke="rgba(59,130,246,0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 525 130 L 580 190"
            stroke="rgba(59,130,246,0.4)"
            strokeWidth="1.5"
          />

          {/* Chief Justice Node */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'chief-justice')!)}
          >
            <rect
              fill={selectedNode.id === 'chief-justice' ? '#27272a' : '#18181b'}
              height="36"
              stroke={selectedNode.id === 'chief-justice' ? '#ffffff' : 'rgba(255,255,255,0.3)'}
              strokeWidth={selectedNode.id === 'chief-justice' ? '2' : '1'}
              width="144"
              x="328"
              y="15"
            />
            <text
              fill="#FFFFFF"
              fontFamily="JetBrains Mono"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1"
              textAnchor="middle"
              x="400"
              y="38"
            >
              CHIEF JUSTICE
            </text>
          </g>

          {/* Level 2 Nodes */}
          {/* Intake Agent */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'intake-agent')!)}
          >
            <rect
              fill={selectedNode.id === 'intake-agent' ? '#222227' : '#111113'}
              height="30"
              stroke={selectedNode.id === 'intake-agent' ? '#ffffff' : 'rgba(255,255,255,0.2)'}
              strokeWidth={selectedNode.id === 'intake-agent' ? '1.5' : '1'}
              width="120"
              x="90"
              y="97"
            />
            <text
              fill={selectedNode.id === 'intake-agent' ? '#ffffff' : '#A1A1AA'}
              fontFamily="JetBrains Mono"
              fontSize="10"
              textAnchor="middle"
              x="150"
              y="116"
            >
              INTAKE AGENT
            </text>
          </g>

          {/* Prosecution */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'prosecution')!)}
          >
            <rect
              fill={selectedNode.id === 'prosecution' ? '#3b1216' : '#201012'}
              height="30"
              stroke={selectedNode.id === 'prosecution' ? '#ef4444' : 'rgba(239,68,68,0.5)'}
              strokeWidth={selectedNode.id === 'prosecution' ? '2' : '1'}
              width="114"
              x="218"
              y="97"
            />
            <text
              fill="#F87171"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
              x="275"
              y="116"
            >
              PROSECUTION
            </text>
          </g>

          {/* Evidence Clerk */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'evidence-clerk')!)}
          >
            <rect
              fill={selectedNode.id === 'evidence-clerk' ? '#222227' : '#111113'}
              height="30"
              stroke={selectedNode.id === 'evidence-clerk' ? '#ffffff' : 'rgba(255,255,255,0.2)'}
              strokeWidth={selectedNode.id === 'evidence-clerk' ? '1.5' : '1'}
              width="114"
              x="343"
              y="97"
            />
            <text
              fill={selectedNode.id === 'evidence-clerk' ? '#ffffff' : '#A1A1AA'}
              fontFamily="JetBrains Mono"
              fontSize="10"
              textAnchor="middle"
              x="400"
              y="116"
            >
              EVIDENCE CLERK
            </text>
          </g>

          {/* Defense */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'defense')!)}
          >
            <rect
              fill={selectedNode.id === 'defense' ? '#12253d' : '#0C1929'}
              height="30"
              stroke={selectedNode.id === 'defense' ? '#3b82f6' : 'rgba(59,130,246,0.5)'}
              strokeWidth={selectedNode.id === 'defense' ? '2' : '1'}
              width="114"
              x="468"
              y="97"
            />
            <text
              fill="#93C5FD"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
              x="525"
              y="116"
            >
              DEFENSE
            </text>
          </g>

          {/* Jury Triad */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'jury-triad')!)}
          >
            <rect
              fill={selectedNode.id === 'jury-triad' ? '#222227' : '#111113'}
              height="30"
              stroke={selectedNode.id === 'jury-triad' ? '#ffffff' : 'rgba(255,255,255,0.2)'}
              strokeWidth={selectedNode.id === 'jury-triad' ? '1.5' : '1'}
              width="104"
              x="598"
              y="97"
            />
            <text
              fill={selectedNode.id === 'jury-triad' ? '#ffffff' : '#A1A1AA'}
              fontFamily="JetBrains Mono"
              fontSize="10"
              textAnchor="middle"
              x="650"
              y="116"
            >
              JURY TRIAD
            </text>
          </g>

          {/* Level 3 Subagent Leaves */}
          {/* FUZZ_CORE */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'fuzz-core')!)}
          >
            <rect
              fill={selectedNode.id === 'fuzz-core' ? '#251114' : '#0A0A0A'}
              height="24"
              stroke={selectedNode.id === 'fuzz-core' ? '#ef4444' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1"
              width="94"
              x="158"
              y="179"
            />
            <text
              fill={selectedNode.id === 'fuzz-core' ? '#f87171' : '#71717A'}
              fontFamily="JetBrains Mono"
              fontSize="9"
              textAnchor="middle"
              x="205"
              y="195"
            >
              FUZZ_CORE
            </text>
          </g>

          {/* EXPLOIT_GEN */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'exploit-gen')!)}
          >
            <rect
              fill={selectedNode.id === 'exploit-gen' ? '#251114' : '#0A0A0A'}
              height="24"
              stroke={selectedNode.id === 'exploit-gen' ? '#ef4444' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1"
              width="94"
              x="288"
              y="179"
            />
            <text
              fill={selectedNode.id === 'exploit-gen' ? '#f87171' : '#71717A'}
              fontFamily="JetBrains Mono"
              fontSize="9"
              textAnchor="middle"
              x="335"
              y="195"
            >
              EXPLOIT_GEN
            </text>
          </g>

          {/* INVARIANCE_PF */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'invariance-pf')!)}
          >
            <rect
              fill={selectedNode.id === 'invariance-pf' ? '#111f30' : '#0A0A0A'}
              height="24"
              stroke={selectedNode.id === 'invariance-pf' ? '#3b82f6' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1"
              width="104"
              x="418"
              y="179"
            />
            <text
              fill={selectedNode.id === 'invariance-pf' ? '#93c5fd' : '#71717A'}
              fontFamily="JetBrains Mono"
              fontSize="9"
              textAnchor="middle"
              x="470"
              y="195"
            >
              INVARIANCE_PF
            </text>
          </g>

          {/* BENCH_PROBE */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedNode(AGENT_TOPOLOGY_NODES.find(n => n.id === 'bench-probe')!)}
          >
            <rect
              fill={selectedNode.id === 'bench-probe' ? '#111f30' : '#0A0A0A'}
              height="24"
              stroke={selectedNode.id === 'bench-probe' ? '#3b82f6' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1"
              width="94"
              x="538"
              y="179"
            />
            <text
              fill={selectedNode.id === 'bench-probe' ? '#93c5fd' : '#71717A'}
              fontFamily="JetBrains Mono"
              fontSize="9"
              textAnchor="middle"
              x="585"
              y="195"
            >
              BENCH_PROBE
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive Agent Inspector Drawer */}
      <div className="bg-[#050506] border border-white/[0.08] p-4 font-telemetry-code">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 ${
                selectedNode.faction === 'prosecution'
                  ? 'bg-red-400'
                  : selectedNode.faction === 'defense'
                  ? 'bg-blue-400'
                  : 'bg-zinc-300'
              }`}
            />
            <span className="text-xs uppercase text-white font-semibold">
              INSPECTING: {selectedNode.label}
            </span>
            <span className="text-[10px] text-zinc-500">[{selectedNode.role}]</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-zinc-500">STATUS:</span>
            <span className="text-emerald-400 font-semibold">{selectedNode.status}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed mb-3">
          {selectedNode.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase text-zinc-500">CAPABILITIES:</span>
          {selectedNode.capabilities.map((cap, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 bg-[#121214] border border-white/10 text-zinc-300"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
