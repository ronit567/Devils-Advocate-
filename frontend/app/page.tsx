"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AgentMessage, InsightReport, WSEvent, Phase, PersonaInfo, StructuredBrief, BriefAttachment, SavedRun } from "./lib/types";
import { FocusGroupWS } from "./lib/websocket";
import ProductBriefForm from "./components/ProductBriefForm";
import FocusGraph from "./components/FocusGraph";
import TranscriptPanel from "./components/TranscriptPanel";
import InsightPanel from "./components/InsightPanel";
import SentimentMap from "./components/SentimentMap";
import PhaseIndicator from "./components/PhaseIndicator";
import StatusCard from "./components/StatusCard";
import PersonasPanel from "./components/PersonasPanel";
import BuildQueuePanel from "./components/BuildQueuePanel";
import SavedRunsPanel from "./components/SavedRunsPanel";
import {
  DEFAULT_SETTINGS,
  FocusGroupSettings,
  loadSettings,
  saveSettings,
  settingsToPayload,
} from "./lib/focusGroupSettings";
import {
  BuilderSource,
  PendingPersonaJob,
  pickResolutionDelayMs,
  stubPersonaFromDescription,
} from "./lib/personaBuilders";

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
  const [activeTab, setActiveTab] = useState<"graph" | "insights" | "sentiment" | "personas">("graph");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [settings, setSettings] = useState<FocusGroupSettings>(DEFAULT_SETTINGS);
  const [pendingJobs, setPendingJobs] = useState<PendingPersonaJob[]>([]);
  const [personaRefreshTrigger, setPersonaRefreshTrigger] = useState(0);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);
  const currentSessionRef = useRef<{ id: string; brief: string; startedAt: number } | null>(null);

  // Hydrate settings from localStorage on mount (client-only)
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const wsRef = useRef<FocusGroupWS | null>(null);
  const streamingContentRef = useRef<string>("");
  const connectionIdCounter = useRef(0);
  const recentSpeakersRef = useRef<string[]>([]);
  const personasRef = useRef<PersonaInfo[]>([]);

  useEffect(() => {
    personasRef.current = personas;
  }, [personas]);

  // Refs that mirror live state — used when snapshotting a run on completion
  const messagesRef = useRef<AgentMessage[]>([]);
  const insightsRef = useRef<InsightReport | null>(null);
  const costRef = useRef<number>(0);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { insightsRef.current = insights; }, [insights]);
  useEffect(() => { costRef.current = totalCost; }, [totalCost]);

  const DEFAULT_RECENT_WINDOW = 3;
  const GROUP_PRONOUNS = [
    "everyone",
    "everybody",
    "all of you",
    "you all",
    "you guys",
    "y'all",
    "we all",
    "all of us",
    "the group",
    "the rest of you",
    "many of you",
    "most of you",
    "some of you",
  ];

  // Sweep expired connections
  useEffect(() => {
    if (connections.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setConnections((prev) => prev.filter((c) => c.expiresAt > now));
    }, 500);
    return () => clearInterval(interval);
  }, [connections.length]);

  // Pending persona job resolver: every 500ms, any job past its resolvesAt fires.
  // Builds a stub Persona from the description and POSTs it via the existing endpoint.
  useEffect(() => {
    if (pendingJobs.length === 0) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      const ripe = pendingJobs.filter((j) => j.resolvesAt <= now);
      if (ripe.length === 0) return;

      // Remove ripe jobs from pending immediately so the poller doesn't re-fire
      setPendingJobs((prev) => prev.filter((j) => !ripe.some((r) => r.id === j.id)));

      for (const job of ripe) {
        try {
          const persona = stubPersonaFromDescription(job, new Set());
          const res = await fetch(`${API_BASE}/personas/custom`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(persona),
          });
          if (!res.ok) {
            console.error("Stub persona creation failed", await res.text());
          }
        } catch (err) {
          console.error("Stub persona creation error", err);
        }
      }
      // Trigger PersonasPanel refetch
      setPersonaRefreshTrigger((n) => n + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [pendingJobs]);

  const addPendingJob = useCallback((source: BuilderSource, description: string, avatarColor: string) => {
    const now = Date.now();
    const job: PendingPersonaJob = {
      id: `pending_${now.toString(36)}_${Math.floor(Math.random() * 10000)}`,
      source,
      description,
      avatar_color: avatarColor,
      startedAt: now,
      resolvesAt: now + pickResolutionDelayMs(source),
    };
    setPendingJobs((prev) => [...prev, job]);
  }, []);

  const cancelPendingJob = useCallback((id: string) => {
    setPendingJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

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
        const currentPersonas = personasRef.current;

        // Strong lines to any persona explicitly mentioned by name
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

        // Subtle "reaction" lines to recent speakers (except in initial phase, where agents speak independently)
        if (msg.phase !== "initial") {
          const recent = recentSpeakersRef.current;
          const addressesGroup = GROUP_PRONOUNS.some((p) => lowerContent.includes(p));
          const candidatePool = addressesGroup ? recent : recent.slice(0, DEFAULT_RECENT_WINDOW);
          const subtleTargets = Array.from(new Set(candidatePool)).filter(
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

        recentSpeakersRef.current = [msg.persona_id, ...recentSpeakersRef.current].slice(0, 12);
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

        // Snapshot the run so it's accessible after starting a new one.
        // We read insights/messages/personas/cost from the latest state via
        // a microtask so all preceding setState calls have flushed.
        const session = currentSessionRef.current;
        const stoppedEarly = Boolean((event.data as Record<string, unknown>)?.stopped_early);
        if (session) {
          setTimeout(() => {
            setSavedRuns((prev) => {
              if (prev.some((r) => r.id === session.id)) return prev;  // already snapshot
              const snapshot: SavedRun = {
                id: session.id,
                brief: session.brief,
                startedAt: session.startedAt,
                finishedAt: Date.now(),
                stoppedEarly,
                personas: personasRef.current,
                messages: messagesRef.current,
                insights: insightsRef.current,
                totalCost: costRef.current,
              };
              return [snapshot, ...prev];
            });
          }, 0);
        }
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

  const handleStart = useCallback(async (
    brief: string,
    numAgents: number,
    structured: StructuredBrief,
    attachments: BriefAttachment[],
  ) => {
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
        body: JSON.stringify({
          product_brief: brief,
          num_agents: numAgents,
          structured,
          attachments,
          model: settings.model,
          filters: settingsToPayload(settings),
        }),
      });
      const { session_id } = await res.json();

      // Track the live session for snapshotting on complete
      currentSessionRef.current = { id: session_id, brief, startedAt: Date.now() };
      setViewingRunId(null);  // make sure we're not viewing a past run when a new one starts
      setIsRunning(true);

      const ws = new FocusGroupWS(session_id, handleEvent);
      wsRef.current = ws;
      ws.connect();
    } catch (e) {
      console.error("Failed to start session", e);
    }
  }, [handleEvent, settings]);

  const handleStop = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session) return;
    try {
      await fetch(`${API_BASE}/session/${session.id}/stop`, { method: "POST" });
    } catch (e) {
      console.error("Failed to stop session", e);
    }
  }, []);

  // When viewingRunId is set, swap the main panel to render that saved snapshot
  // instead of the live state. The sidebar form/status stay tied to the live run.
  const viewingRun = viewingRunId ? savedRuns.find((r) => r.id === viewingRunId) ?? null : null;
  const viewPersonas = viewingRun ? viewingRun.personas : personas;
  const viewMessages = viewingRun ? viewingRun.messages : messages;
  const viewInsights = viewingRun ? viewingRun.insights : insights;
  const viewStreamingMessage = viewingRun ? null : streamingMessage;
  const viewTypingPersonaId = viewingRun ? null : typingPersonaId;
  const viewConnections = viewingRun ? [] : connections;
  const viewCompletedTurns = viewingRun
    ? new Set(viewingRun.messages.map((m) => m.persona_id))
    : completedTurns;
  const viewPhase: Phase | null = viewingRun ? "complete" : currentPhase;
  const viewIsExtracting = viewingRun ? false : isExtracting;

  const visiblePersonas = viewPersonas.length > 0
    ? viewPersonas
    : Array.from(new Map(viewMessages.map((m) => [m.persona_id, { id: m.persona_id, name: m.persona_name, avatar_color: m.avatar_color }])).values());

  const deleteSavedRun = (id: string) => {
    setSavedRuns((prev) => prev.filter((r) => r.id !== id));
    if (viewingRunId === id) setViewingRunId(null);
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden">
      {/* Left panel */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50/50">
        {/* Header */}
        <div className="h-14 px-5 flex items-center border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-rose-400" />
            </div>
            <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">Devil&apos;s Advocate</h1>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            <ProductBriefForm onSubmit={handleStart} isRunning={isRunning} />
          </div>

          <StatusCard
            phase={currentPhase}
            isRunning={isRunning}
            isExtracting={isExtracting}
            personas={personas}
            completedTurns={completedTurns}
            typingPersonaId={typingPersonaId}
            turnCount={messages.length}
            onStop={handleStop}
          />

          <SavedRunsPanel
            runs={savedRuns}
            viewingRunId={viewingRunId}
            onViewRun={(id) => setViewingRunId(id)}
            onReturnToActive={() => setViewingRunId(null)}
            onDeleteRun={deleteSavedRun}
            hasActiveRun={isRunning || isExtracting}
          />
        </div>

        {/* Cost footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Cost</span>
            <span className="text-sm font-mono tabular-nums font-semibold text-slate-900">
              ${totalCost.toFixed(4)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            vs $15,000+ for a live focus group
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {viewingRun && (
          <div className="h-9 px-6 flex items-center gap-3 border-b border-slate-200 bg-amber-50">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[12px] text-amber-900">
              Viewing saved run · <span className="font-medium">{viewingRun.brief.slice(0, 60)}{viewingRun.brief.length > 60 ? "…" : ""}</span>
            </span>
            <button
              onClick={() => setViewingRunId(null)}
              className="ml-auto text-[11px] font-medium text-amber-900 hover:text-amber-700 underline-offset-2 hover:underline"
            >
              Return to live
            </button>
          </div>
        )}
        <PhaseIndicator
          phase={viewPhase}
          personas={visiblePersonas}
          completedTurns={viewCompletedTurns}
          typingPersonaId={viewTypingPersonaId}
          turnCount={viewMessages.length}
        />

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-2">
          {(["graph", "insights", "sentiment", "personas"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 h-10 text-[13px] font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {tab}
                {tab === "insights" && viewInsights && (
                  <span className="text-[10px] font-mono tabular-nums bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {viewInsights.non_obvious_insights.length}
                  </span>
                )}
              </span>
              {activeTab === tab && (
                <span className="absolute left-3 right-3 -bottom-px h-[2px] bg-slate-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
          {activeTab === "graph" && (
            <div className="flex-1 flex overflow-hidden">
              <FocusGraph
                personas={viewPersonas}
                typingPersonaId={viewTypingPersonaId}
                connections={viewConnections}
              />
              <TranscriptPanel
                messages={viewMessages}
                streamingMessage={viewStreamingMessage}
                personas={viewPersonas}
              />
            </div>
          )}

          {activeTab === "insights" && (
            <InsightPanel insights={viewInsights} isLoading={viewIsExtracting} />
          )}

          {activeTab === "sentiment" && (
            <div className="flex-1 overflow-y-auto p-8">
              <SentimentMap sentiments={viewInsights?.agent_sentiments ?? []} />
            </div>
          )}

          {activeTab === "personas" && (
            <PersonasPanel
              settings={settings}
              onSettingsChange={setSettings}
              onAddPendingJob={addPendingJob}
              refreshTrigger={personaRefreshTrigger}
            />
          )}
        </div>
      </main>

      {/* Floating build queue — visible from every tab while jobs are pending */}
      <BuildQueuePanel jobs={pendingJobs} onCancel={cancelPendingJob} />
    </div>
  );
}
