"use client";

import { useState, useCallback, useRef } from "react";
import { AgentMessage, InsightReport, WSEvent, Phase } from "./lib/types";
import { FocusGroupWS } from "./lib/websocket";
import ProductBriefForm from "./components/ProductBriefForm";
import ConversationFeed from "./components/ConversationFeed";
import InsightPanel from "./components/InsightPanel";
import SentimentMap from "./components/SentimentMap";
import PhaseIndicator from "./components/PhaseIndicator";

const API_BASE = "http://localhost:8000";

interface PersonaStub {
  id: string;
  name: string;
  avatar_color: string;
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<{ persona_id: string; content: string } | null>(null);
  const [insights, setInsights] = useState<InsightReport | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [typingPersonaId, setTypingPersonaId] = useState<string | null>(null);
  const [typingPersonaName, setTypingPersonaName] = useState<string | null>(null);
  const [typingAvatarColor, setTypingAvatarColor] = useState<string | null>(null);
  const [highlightedPersonaId, setHighlightedPersonaId] = useState<string | null>(null);
  const [completedTurns, setCompletedTurns] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState(0);
  const [activeTab, setActiveTab] = useState<"conversation" | "insights" | "sentiment">("conversation");

  const wsRef = useRef<FocusGroupWS | null>(null);
  const streamingContentRef = useRef<string>("");

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case "phase_change": {
        const phase = event.data.phase as Phase;
        setCurrentPhase(phase);
        if (phase === "extracting" || phase === "complete") {
          setIsExtracting(true);
        }
        break;
      }
      case "agent_typing": {
        setTypingPersonaId(event.data.persona_id as string);
        setTypingPersonaName(event.data.persona_name as string);
        setTypingAvatarColor(event.data.avatar_color as string);
        streamingContentRef.current = "";
        setStreamingMessage({ persona_id: event.data.persona_id as string, content: "" });
        break;
      }
      case "token": {
        streamingContentRef.current += event.data.token as string;
        setStreamingMessage({
          persona_id: event.data.persona_id as string,
          content: streamingContentRef.current,
        });
        break;
      }
      case "message": {
        const msg = event.data as unknown as AgentMessage;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.persona_id === msg.persona_id && last.turn === msg.turn) {
            return [...prev.slice(0, -1), msg];
          }
          return [...prev, msg];
        });
        setStreamingMessage(null);
        setTypingPersonaId(null);
        streamingContentRef.current = "";
        setCompletedTurns((prev) => new Set([...prev, msg.persona_id]));

        // Highlight any persona mentioned by name in the message
        const content = msg.content.toLowerCase();
        setMessages((prev) => {
          const allNames = Array.from(new Map(prev.map((m) => [m.persona_id, m.persona_name])).values());
          const mentioned = allNames.find((name) => content.includes(name.toLowerCase()) && name !== msg.persona_name);
          if (mentioned) {
            const mentionedId = prev.find((m) => m.persona_name === mentioned)?.persona_id;
            if (mentionedId) {
              setHighlightedPersonaId(mentionedId);
              setTimeout(() => setHighlightedPersonaId(null), 2500);
            }
          }
          return prev;
        });
        break;
      }
      case "cost_update": {
        setTotalCost(event.data.total_cost_usd as number);
        break;
      }
      case "insights_ready": {
        setInsights(event.data as unknown as InsightReport);
        setIsExtracting(false);
        setActiveTab("insights");
        break;
      }
      case "complete": {
        setIsRunning(false);
        setCurrentPhase("complete");
        setIsExtracting(false);
        break;
      }
      case "error": {
        console.error("Focus group error:", event.data.message);
        setIsRunning(false);
        setIsExtracting(false);
        break;
      }
    }
  }, []);

  const handleStart = useCallback(async (brief: string, numAgents: number) => {
    setMessages([]);
    setInsights(null);
    setCurrentPhase(null);
    setCompletedTurns(new Set());
    setTotalCost(0);
    setActiveTab("conversation");

    try {
      const res = await fetch(`${API_BASE}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_brief: brief, num_agents: numAgents }),
      });
      const { session_id } = await res.json();

      setIsRunning(true);

      const ws = new FocusGroupWS(session_id, handleEvent);
      wsRef.current = ws;
      ws.connect();
    } catch (e) {
      console.error("Failed to start session", e);
    }
  }, [handleEvent]);

  const allPersonas: PersonaStub[] = Array.from(
    new Map(messages.map((m) => [m.persona_id, { id: m.persona_id, name: m.persona_name, avatar_color: m.avatar_color }])).values()
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left panel: input + sentiment */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">SynthFocus</h1>
          </div>
          <p className="text-xs text-gray-600">AI focus groups in seconds</p>
        </div>

        <div className="p-4 border-b border-gray-800">
          <ProductBriefForm onSubmit={handleStart} isRunning={isRunning} />
        </div>

        {/* Cost counter */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-600">Research cost</span>
            <div className="text-xs text-gray-600 mt-0.5">vs $15,000+ real focus group</div>
          </div>
          <span className="text-sm font-mono font-bold text-green-400">${totalCost.toFixed(4)}</span>
        </div>

        {/* Sentiment section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sentiment Map</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <SentimentMap sentiments={insights?.agent_sentiments ?? []} />
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Phase indicator */}
        <PhaseIndicator
          phase={currentPhase}
          personas={allPersonas}
          completedTurns={completedTurns}
          typingPersonaId={typingPersonaId}
        />

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(["conversation", "insights", "sentiment"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
              {tab === "insights" && insights && (
                <span className="ml-1.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                  {insights.non_obvious_insights.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "conversation" && (
            <ConversationFeed
              messages={messages}
              streamingMessage={streamingMessage}
              highlightedPersonaId={highlightedPersonaId}
              typingPersonaId={typingPersonaId}
              typingPersonaName={typingPersonaName}
              typingAvatarColor={typingAvatarColor}
            />
          )}

          {activeTab === "insights" && (
            <InsightPanel insights={insights} isLoading={isExtracting} />
          )}

          {activeTab === "sentiment" && (
            <div className="flex-1 overflow-y-auto p-6">
              <SentimentMap sentiments={insights?.agent_sentiments ?? []} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
