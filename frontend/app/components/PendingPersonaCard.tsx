"use client";

import { useEffect, useState } from "react";
import { PendingPersonaJob, STATUS_MESSAGES, SOURCE_LABEL } from "../lib/personaBuilders";

interface Props {
  job: PendingPersonaJob;
  onCancel: () => void;
}

export default function PendingPersonaCard({ job, onCancel }: Props) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Cycle status messages every ~2.5s
  useEffect(() => {
    const id = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES[job.source].length);
    }, 2500);
    return () => clearInterval(id);
  }, [job.source]);

  // Tick for progress bar
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(1, job.resolvesAt - job.startedAt);
  const elapsed = Math.min(total, Math.max(0, now - job.startedAt));
  const progress = elapsed / total;
  const status = STATUS_MESSAGES[job.source][statusIdx];

  return (
    <div className="group relative bg-white border border-slate-200 rounded-md p-3 overflow-hidden">
      <button
        onClick={onCancel}
        className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Cancel build"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        {/* Avatar with spinner overlay */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full opacity-25"
            style={{ backgroundColor: job.avatar_color }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: `${job.avatar_color}80`, borderTopColor: "transparent" }}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="shimmer h-3 w-20 rounded inline-block" />
            <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {SOURCE_LABEL[job.source]}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-400">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600 truncate" title={status}>
            {status}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400 truncate" title={job.description}>
            &ldquo;{job.description}&rdquo;
          </div>
        </div>
      </div>

      {/* Progress bar at the bottom */}
      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-slate-100">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: job.avatar_color,
          }}
        />
      </div>

      <style jsx>{`
        .shimmer {
          background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
