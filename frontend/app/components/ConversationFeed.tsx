"use client";

import { useEffect, useRef } from "react";
import { AgentMessage } from "../lib/types";
import AgentBubble from "./AgentBubble";

interface Props {
  messages: AgentMessage[];
  streamingMessage: { persona_id: string; content: string } | null;
  highlightedPersonaId: string | null;
  typingPersonaId: string | null;
  typingPersonaName: string | null;
  typingAvatarColor: string | null;
}

export default function ConversationFeed({
  messages,
  streamingMessage,
  highlightedPersonaId,
  typingPersonaId,
  typingPersonaName,
  typingAvatarColor,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      {messages.length === 0 && !streamingMessage && (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
          Waiting for the focus group to begin...
        </div>
      )}

      {messages.map((msg) => {
        const isStreaming = streamingMessage?.persona_id === msg.persona_id && msg === messages[messages.length - 1];
        return (
          <AgentBubble
            key={`${msg.persona_id}-${msg.turn}`}
            message={msg}
            streamingContent={isStreaming ? streamingMessage?.content : undefined}
            isHighlighted={highlightedPersonaId === msg.persona_id && msg === messages[messages.length - 2]}
          />
        );
      })}

      {/* Typing indicator when a new agent hasn't sent their first token yet */}
      {typingPersonaId && !streamingMessage && typingPersonaName && (
        <div className="flex items-center gap-3 py-2 px-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: typingAvatarColor ?? "#666" }}
          >
            {typingPersonaName[0]}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">{typingPersonaName} is thinking...</span>
            <span className="flex gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
