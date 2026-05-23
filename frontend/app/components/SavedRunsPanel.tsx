"use client";

import { SavedRun } from "../lib/types";

interface Props {
  runs: SavedRun[];
  viewingRunId: string | null;
  onViewRun: (id: string) => void;
  onReturnToActive: () => void;
  onDeleteRun: (id: string) => void;
  hasActiveRun: boolean;
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SavedRunsPanel({
  runs, viewingRunId, onViewRun, onReturnToActive, onDeleteRun, hasActiveRun,
}: Props) {
  if (runs.length === 0 && !viewingRunId) return null;

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Saved runs
        </span>
        <span className="text-[11px] font-mono tabular-nums text-slate-400">{runs.length}</span>
      </div>

      <div className="px-3 pb-3 space-y-1 max-h-64 overflow-y-auto">
        {viewingRunId && hasActiveRun && (
          <button
            onClick={onReturnToActive}
            className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] font-medium text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Back to live run
          </button>
        )}

        {runs.map((run) => {
          const isViewing = run.id === viewingRunId;
          const wouldBuy = run.insights?.agent_sentiments?.filter((s) => s.would_buy).length ?? 0;
          const totalSentiments = run.insights?.agent_sentiments?.length ?? 0;
          const pct = totalSentiments > 0 ? Math.round((wouldBuy / totalSentiments) * 100) : null;
          return (
            <div
              key={run.id}
              className={`group relative rounded-md transition-colors ${
                isViewing ? "bg-slate-900 text-white" : "hover:bg-slate-50"
              }`}
            >
              <button
                onClick={() => onViewRun(run.id)}
                className="w-full text-left px-2.5 py-2"
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  {run.stoppedEarly && (
                    <span className={`text-[9px] font-medium uppercase tracking-wider px-1 py-0.5 rounded ${
                      isViewing ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                    }`}>
                      Stopped
                    </span>
                  )}
                  {pct !== null && (
                    <span className={`text-[10px] font-mono tabular-nums ${
                      isViewing ? "text-white/70" : "text-emerald-700"
                    }`}>
                      {pct}% buy
                    </span>
                  )}
                  <span className={`ml-auto text-[10px] ${isViewing ? "text-white/60" : "text-slate-400"}`}>
                    {relativeTime(run.finishedAt)}
                  </span>
                </div>
                <div className={`text-[12px] leading-snug truncate ${
                  isViewing ? "text-white font-medium" : "text-slate-700"
                }`}>
                  {run.brief || "(untitled run)"}
                </div>
                <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                  isViewing ? "text-white/60" : "text-slate-400"
                }`}>
                  {run.personas.length} agents · {run.messages.length} turns
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRun(run.id); }}
                className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded ${
                  isViewing ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                }`}
                aria-label="Delete saved run"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
