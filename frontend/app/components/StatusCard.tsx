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
  initial: { label: "Initial reactions", description: "Each agent gives their gut take in private" },
  debate: { label: "Open debate", description: "Agents argue, push back, build on each other" },
  synthesis: { label: "Final verdicts", description: "Each agent gives a bottom-line answer" },
  extracting: { label: "Extracting insights", description: "Analyzing the conversation" },
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
    <div className="border-t border-slate-200 bg-white px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isRunning || isExtracting ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {isExtracting ? "Analyzing" : isRunning ? "Live" : "Status"}
        </span>
      </div>

      {info && (
        <div>
          <div className="text-[13px] font-semibold text-slate-900 leading-tight">
            {info.label}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{info.description}</div>
        </div>
      )}

      {typingPersona && (
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ backgroundColor: typingPersona.avatar_color }}
          />
          <span className="text-[11px] text-slate-500 truncate">
            <span className="font-medium text-slate-800">{typingPersona.name}</span> speaking
          </span>
        </div>
      )}

      {personas.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-mono tabular-nums uppercase tracking-wider">Progress</span>
            <span className="text-[11px] font-mono tabular-nums text-slate-700">
              <span className="font-semibold">{turnCount}</span>
              <span className="text-slate-400"> / {personas.length}</span>
            </span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
