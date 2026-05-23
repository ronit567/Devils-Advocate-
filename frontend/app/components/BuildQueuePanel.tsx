"use client";

import { useEffect, useState } from "react";
import { PendingPersonaJob, STATUS_MESSAGES, SOURCE_LABEL } from "../lib/personaBuilders";

interface Props {
  jobs: PendingPersonaJob[];
  onCancel: (id: string) => void;
}

function BuildRow({ job, onCancel }: { job: PendingPersonaJob; onCancel: () => void }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES[job.source].length);
    }, 2500);
    return () => clearInterval(id);
  }, [job.source]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(1, job.resolvesAt - job.startedAt);
  const elapsed = Math.min(total, Math.max(0, now - job.startedAt));
  const progress = elapsed / total;
  const status = STATUS_MESSAGES[job.source][statusIdx];

  return (
    <div className="relative px-3 py-2.5 border-b border-slate-100 last:border-b-0 group">
      <div className="flex items-center gap-2.5">
        {/* Spinner avatar */}
        <div className="relative w-7 h-7 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full opacity-25"
            style={{ backgroundColor: job.avatar_color }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
              style={{ borderColor: `${job.avatar_color}80`, borderTopColor: "transparent" }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {SOURCE_LABEL[job.source]}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-400">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600 truncate" title={status}>
            {status}
          </div>
        </div>

        <button
          onClick={onCancel}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all flex-shrink-0 w-5 h-5 flex items-center justify-center"
          aria-label="Cancel build"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar at the bottom of the row */}
      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-slate-100">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: job.avatar_color,
          }}
        />
      </div>
    </div>
  );
}

export default function BuildQueuePanel({ jobs, onCancel }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-72 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 animate-in">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full h-9 px-3 flex items-center justify-between border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
            Building
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-500">{jobs.length}</span>
        </div>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-slate-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto">
          {jobs.map((job) => (
            <BuildRow key={job.id} job={job} onCancel={() => onCancel(job.id)} />
          ))}
        </div>
      )}

      <style jsx>{`
        .animate-in {
          animation: slide-in 0.25s ease-out;
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
