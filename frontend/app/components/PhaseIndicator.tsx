"use client";

import { Phase } from "../lib/types";

interface Props {
  phase: Phase | null;
  personas: Array<{ id: string; name: string; avatar_color: string }>;
  completedTurns: Set<string>;
  typingPersonaId: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  initial: "Phase 1: Initial Reactions",
  debate: "Phase 2: Open Debate",
  synthesis: "Phase 3: Final Verdicts",
  complete: "Complete",
};

export default function PhaseIndicator({ phase, personas, completedTurns, typingPersonaId }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              phase && phase !== "complete" ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {phase ? PHASE_LABELS[phase] ?? phase : "Waiting to start..."}
          </span>
        </div>

        <div className="flex-1 flex flex-wrap gap-1.5">
          {personas.map((p) => {
            const isDone = completedTurns.has(p.id);
            const isTyping = typingPersonaId === p.id;
            return (
              <div
                key={p.id}
                title={p.name}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                  isTyping ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-white scale-110" : ""
                }`}
                style={{
                  backgroundColor: isDone || isTyping ? p.avatar_color : "#e5e7eb",
                  opacity: isDone || isTyping ? 1 : 0.7,
                }}
              >
                {p.name[0]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
