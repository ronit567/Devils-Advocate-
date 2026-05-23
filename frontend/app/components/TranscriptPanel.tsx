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
    <aside className="w-[300px] flex-shrink-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
      <div className="h-10 px-4 flex items-center border-b border-slate-200">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Transcript</h3>
        {messages.length > 0 && (
          <span className="ml-auto text-[11px] font-mono tabular-nums text-slate-400">
            {messages.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-[12px] text-slate-400 text-center py-12">
            The conversation will appear here.
          </div>
        )}

        {messages.map((msg) => (
          <div key={`${msg.persona_id}-${msg.turn}`} className="flex gap-2.5">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: msg.avatar_color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 mb-0.5">
                {msg.persona_name}
              </div>
              <div className="text-[12px] text-slate-700 leading-snug">{msg.content}</div>
            </div>
          </div>
        ))}

        {streamingMessage && streamingPersona && (
          <div className="flex gap-2.5">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse"
              style={{ backgroundColor: streamingPersona.avatar_color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 mb-0.5">
                {streamingPersona.name}
              </div>
              <div className="text-[12px] text-slate-700 leading-snug">
                {streamingMessage.content}
                <span className="inline-block w-px h-3 bg-slate-700 ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
