"use client";

import { AgentMessage } from "../lib/types";

interface Props {
  message: AgentMessage;
  streamingContent?: string;
  isHighlighted: boolean;
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  initial: { label: "First Reaction", color: "bg-blue-900/40 text-blue-300" },
  debate: { label: "Debate", color: "bg-orange-900/40 text-orange-300" },
  synthesis: { label: "Final Verdict", color: "bg-purple-900/40 text-purple-300" },
};

export default function AgentBubble({ message, streamingContent, isHighlighted }: Props) {
  const content = streamingContent ?? message.content;
  const phaseInfo = PHASE_LABELS[message.phase] ?? { label: message.phase, color: "bg-gray-800 text-gray-400" };

  return (
    <div
      className={`flex gap-3 py-3 px-2 rounded-lg transition-all duration-300 ${
        isHighlighted ? "bg-yellow-900/20 ring-1 ring-yellow-500/50" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
        style={{ backgroundColor: message.avatar_color }}
      >
        {message.persona_name[0]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-white text-sm">{message.persona_name}</span>
          <span className="text-xs text-gray-500">
            {message.persona_age} · {message.persona_occupation} · {message.persona_location}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${phaseInfo.color}`}>
            {phaseInfo.label}
          </span>
          {message.is_provocateur && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">
              Pushing back
            </span>
          )}
        </div>
        <p className="text-gray-200 text-sm leading-relaxed">
          {content}
          {streamingContent !== undefined && (
            <span className="inline-block w-1.5 h-3.5 bg-white ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}
