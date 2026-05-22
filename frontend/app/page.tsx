"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AgentMessage, InsightReport, WSEvent, Phase, PersonaInfo } from "./lib/types";
import { FocusGroupWS } from "./lib/websocket";
import ProductBriefForm from "./components/ProductBriefForm";
import FocusGraph from "./components/FocusGraph";
import TranscriptPanel from "./components/TranscriptPanel";
import InsightPanel from "./components/InsightPanel";
import SentimentMap from "./components/SentimentMap";
import PhaseIndicator from "./components/PhaseIndicator";

const API_BASE = "http://localhost:8000";

interface Connection {
  id: string;
  from: string;
  to: string;
  expiresAt: number;
}

const CONNECTION_LIFETIME_MS = 3000;

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [personas, setPersonas] = useState<PersonaInfo[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<{ persona_id: string; content: string } | null>(null);
  const [insights, setInsights] = useState<InsightReport | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [typingPersonaId, setTypingPersonaId] = useState<string | null>(null);
  const [completedTurns, setCompletedTurns] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState(0);
  const [activeTab, setActiveTab] = useState<"graph" | "insights" | "sentiment">("graph");
  const [connections, setConnections] = useState<Connection[]>([]);

  const wsRef = useRef<FocusGroupWS | null>(null);
  const streamingContentRef = useRef<string>("");
  const connectionIdCounter = useRef(0);

  // Sweep expired connections
  useEffect(() => {
    if (connections.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setConnections((prev) => prev.filter((c) => c.expiresAt > now));
    }, 500);
    return () => clearInterval(interval);
  }, [connections.length]);

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case "personas_loaded": {
        setPersonas(event.data.personas as PersonaInfo[]);
        break;
      }
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
        const now = Date.now();

        setMessages((prev) => [...prev, msg]);
        setStreamingMessage(null);
        setTypingPersonaId(null);
        streamingContentRef.current = "";
        setCompletedTurns((prev) => new Set([...prev, msg.persona_id]));

        // Detect any persona mentioned by name → create connection lines
        const lowerContent = msg.content.toLowerCase();
        setPersonas((currentPersonas) => {
          const mentioned = currentPersonas.filter(
            (p) => p.id !== msg.persona_id && lowerContent.includes(p.name.toLowerCase())
          );
          if (mentioned.length > 0) {
            setConnections((prev) => [
              ...prev,
              ...mentioned.map((p) => ({
                id: `${msg.persona_id}-${p.id}-${connectionIdCounter.current++}`,
                from: msg.persona_id,
                to: p.id,
                expiresAt: now + CONNECTION_LIFETIME_MS,
              })),
            ]);
          }
          return currentPersonas;
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
    setPersonas([]);
    setInsights(null);
    setCurrentPhase(null);
    setCompletedTurns(new Set());
    setTotalCost(0);
    setConnections([]);
    setActiveTab("graph");

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

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Left panel */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-hidden bg-gray-50">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">SynthFocus</h1>
          </div>
          <p className="text-xs text-gray-500">AI focus groups in seconds</p>
        </div>

        <div className="p-4 border-b border-gray-200 overflow-y-auto">
          <ProductBriefForm onSubmit={handleStart} isRunning={isRunning} />
        </div>

        {/* Cost counter */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <span className="text-xs text-gray-500">Research cost</span>
            <div className="text-xs text-gray-400 mt-0.5">vs $15,000+ real focus group</div>
          </div>
          <span className="text-sm font-mono font-bold text-emerald-600">${totalCost.toFixed(4)}</span>
        </div>

        {/* Sentiment preview */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sentiment Map</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <SentimentMap sentiments={insights?.agent_sentiments ?? []} />
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <PhaseIndicator
          phase={currentPhase}
          personas={personas.length > 0 ? personas : Array.from(new Map(messages.map((m) => [m.persona_id, { id: m.persona_id, name: m.persona_name, avatar_color: m.avatar_color }])).values())}
          completedTurns={completedTurns}
          typingPersonaId={typingPersonaId}
        />

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {(["graph", "insights", "sentiment"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-gray-900 border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
              {tab === "insights" && insights && (
                <span className="ml-1.5 text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                  {insights.non_obvious_insights.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "graph" && (
            <div className="flex-1 flex overflow-hidden">
              <FocusGraph
                personas={personas}
                typingPersonaId={typingPersonaId}
                connections={connections}
              />
              <TranscriptPanel
                messages={messages}
                streamingMessage={streamingMessage}
                personas={personas}
              />
            </div>
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
