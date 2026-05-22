"use client";

import { useEffect, useRef } from "react";
import { AgentMessage, PersonaInfo } from "../lib/types";

interface Props {
  messages: AgentMessage[];
  streamingMessage: { persona_id: string; content: string } | null;
  personas: PersonaInfo[];
}

export default function TranscriptPanel({ messages, streamingMessage, personas }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const personaMap = new Map(personas.map((p) => [p.id, p]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingMessage?.content]);

  const streamingPersona = streamingMessage ? personaMap.get(streamingMessage.persona_id) : null;

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-l border-gray-200 bg-gray-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Transcript</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-xs text-gray-400 text-center py-8">
            Conversation will appear here in real time
          </div>
        )}

        {messages.map((msg) => (
          <div key={`${msg.persona_id}-${msg.turn}`} className="flex gap-2">
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: msg.avatar_color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: msg.avatar_color }}>
                {msg.persona_name}
              </div>
              <div className="text-xs text-gray-700 leading-snug">{msg.content}</div>
            </div>
          </div>
        ))}

        {streamingMessage && streamingPersona && (
          <div className="flex gap-2">
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse"
              style={{ backgroundColor: streamingPersona.avatar_color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: streamingPersona.avatar_color }}>
                {streamingPersona.name}
              </div>
              <div className="text-xs text-gray-700 leading-snug">
                {streamingMessage.content}
                <span className="inline-block w-0.5 h-3 bg-gray-400 ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
