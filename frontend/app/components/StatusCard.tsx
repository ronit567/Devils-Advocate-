"use client";

import { Phase, PersonaInfo } from "../lib/types";

interface Props {
  phase: Phase | null;
  isRunning: boolean;
  isExtracting: boolean;
  personas: PersonaInfo[];
  completedTurns: Set<string>;
  typingPersonaId: string | null;
  turnCount: number;
}

const PHASE_INFO: Record<string, { label: string; description: string }> = {
  initial: { label: "Initial Reactions", description: "Each agent shares their first impression" },
  debate: { label: "Open Debate", description: "Agents argue, disagree, and challenge each other" },
  synthesis: { label: "Final Verdicts", description: "Each agent gives their bottom-line take" },
  extracting: { label: "Extracting Insights", description: "Analyzing the conversation" },
  complete: { label: "Complete", description: "Focus group finished" },
};

export default function StatusCard({
  phase,
  isRunning,
  isExtracting,
  personas,
  completedTurns,
  typingPersonaId,
  turnCount,
}: Props) {
  if (!isRunning && !isExtracting && !phase) return null;

  const info = phase ? PHASE_INFO[phase] : null;
  const progress = personas.length > 0 ? completedTurns.size / personas.length : 0;
  const typingPersona = typingPersonaId ? personas.find((p) => p.id === typingPersonaId) : null;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isRunning || isExtracting ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {isExtracting ? "Analyzing" : isRunning ? "Live" : "Status"}
        </h3>
      </div>

      {info && (
        <>
          <div className="text-sm font-semibold text-gray-900 leading-tight mb-0.5">
            {info.label}
          </div>
          <div className="text-[11px] text-gray-500 mb-3 leading-snug">{info.description}</div>
        </>
      )}

      {/* Speaking now */}
      {typingPersona && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-200">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
            style={{ backgroundColor: typingPersona.avatar_color }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider font-medium text-gray-400">Speaking</div>
            <div className="text-xs font-medium text-gray-800 truncate">
              {typingPersona.name} <span className="text-gray-400 font-normal">· {typingPersona.archetype.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {personas.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] text-gray-500">Turn</span>
            <span className="text-[11px] font-mono text-gray-700">
              <span className="font-semibold">{turnCount}</span>
              <span className="text-gray-400"> · {personas.length} agents</span>
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
