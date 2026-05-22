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
import StatusCard from "./components/StatusCard";

const API_BASE = "http://localhost:8000";

interface Connection {
  id: string;
  from: string;
  to: string;
  expiresAt: number;
  strong: boolean;
}

const CONNECTION_LIFETIME_MS = 3500;

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
  const recentSpeakersRef = useRef<string[]>([]);

  const RECENT_SPEAKERS_WINDOW = 3;

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

        const newConnections: Connection[] = [];
        const lowerContent = msg.content.toLowerCase();
        const strongTargets = new Set<string>();

        // Strong lines to any persona explicitly mentioned by name
        setPersonas((currentPersonas) => {
          currentPersonas.forEach((p) => {
            if (p.id !== msg.persona_id && lowerContent.includes(p.name.toLowerCase())) {
              strongTargets.add(p.id);
              newConnections.push({
                id: `mention-${msg.persona_id}-${p.id}-${connectionIdCounter.current++}`,
                from: msg.persona_id,
                to: p.id,
                expiresAt: now + CONNECTION_LIFETIME_MS,
                strong: true,
              });
            }
          });

          // Subtle "reaction" lines to the recent speakers (except in initial phase, where agents speak independently)
          if (msg.phase !== "initial") {
            const recent = recentSpeakersRef.current;
            const subtleTargets = Array.from(new Set(recent)).filter(
              (id) => id !== msg.persona_id && !strongTargets.has(id)
            );
            subtleTargets.forEach((targetId) => {
              newConnections.push({
                id: `reaction-${msg.persona_id}-${targetId}-${connectionIdCounter.current++}`,
                from: msg.persona_id,
                to: targetId,
                expiresAt: now + CONNECTION_LIFETIME_MS,
                strong: false,
              });
            });
          }

          if (newConnections.length > 0) {
            setConnections((prev) => [...prev, ...newConnections]);
          }
          return currentPersonas;
        });

        // Add current speaker to recent window (keep last N)
        recentSpeakersRef.current = [msg.persona_id, ...recentSpeakersRef.current].slice(0, RECENT_SPEAKERS_WINDOW);
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
    recentSpeakersRef.current = [];
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

  const savings = totalCost > 0 ? Math.max(0, 100 - (totalCost / 15000) * 100) : 0;

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Left panel */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-hidden bg-gray-50">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">SynthFocus</h1>
              <p className="text-[11px] text-gray-500 mt-0.5">AI focus groups in seconds</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <ProductBriefForm onSubmit={handleStart} isRunning={isRunning} />
          </div>

          {/* Status card (shown when running or after completion) */}
          <StatusCard
            phase={currentPhase}
            isRunning={isRunning}
            isExtracting={isExtracting}
            personas={personas}
            completedTurns={completedTurns}
            typingPersonaId={typingPersonaId}
            turnCount={messages.length}
          />
        </div>

        {/* Cost footer */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Research cost</span>
            <span className="text-base font-mono font-bold text-emerald-600">
              ${totalCost.toFixed(4)}
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${savings.toFixed(2)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>vs $15,000 real focus group</span>
            <span className="font-semibold text-emerald-600">
              {savings > 0 ? `${savings.toFixed(2)}% savings` : "—"}
            </span>
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
