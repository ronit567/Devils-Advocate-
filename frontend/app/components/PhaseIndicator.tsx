"use client";

import { Phase } from "../lib/types";

interface Props {
  phase: Phase | null;
  personas: Array<{ id: string; name: string; avatar_color: string }>;
  completedTurns: Set<string>;
  typingPersonaId: string | null;
  turnCount: number;
}

const PHASE_LABELS: Record<string, { label: string; step: number }> = {
  initial: { label: "Initial reactions", step: 1 },
  debate: { label: "Open debate", step: 2 },
  synthesis: { label: "Final verdicts", step: 3 },
  extracting: { label: "Extracting insights", step: 4 },
  complete: { label: "Complete", step: 4 },
};

export default function PhaseIndicator({ phase, personas, completedTurns, typingPersonaId, turnCount }: Props) {
  const phaseInfo = phase ? PHASE_LABELS[phase] : null;
  const isLive = phase && phase !== "complete";
  const typingPersona = typingPersonaId ? personas.find((p) => p.id === typingPersonaId) : null;
  const progress = personas.length > 0 ? Math.min(1, completedTurns.size / personas.length) : 0;

  return (
    <div className="h-14 px-6 flex items-center gap-6 border-b border-slate-200 bg-white">
      {/* Phase status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isLive ? "bg-emerald-500 animate-pulse" : phase === "complete" ? "bg-slate-400" : "bg-slate-300"
          }`}
        />
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[13px] font-medium text-slate-900">
            {phaseInfo?.label ?? "Ready"}
          </span>
          {phaseInfo && (
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {phaseInfo.step}/4
            </span>
          )}
        </div>
      </div>

      {/* Vertical divider */}
      {personas.length > 0 && <div className="h-5 w-px bg-slate-200" />}

      {/* Live speaker */}
      {typingPersona && (
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ backgroundColor: typingPersona.avatar_color }}
          />
          <span className="text-[12px] text-slate-500 truncate">
            <span className="font-medium text-slate-800">{typingPersona.name}</span> speaking
          </span>
        </div>
      )}

      {/* Progress strip — pushes to the right */}
      {personas.length > 0 && (
        <div className="ml-auto flex items-center gap-3 min-w-0">
          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
            Turn <span className="text-slate-700 font-semibold">{turnCount}</span>
            <span className="text-slate-300"> · </span>
            <span>{personas.length} agents</span>
          </div>
          <div className="w-40 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
