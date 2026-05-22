"use client";

import { useState, ReactNode } from "react";
import { InsightReport, Quote } from "../lib/types";

interface Props {
  insights: InsightReport | null;
  isLoading: boolean;
}

const SEVERITY_COLORS = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

interface InsightCardProps {
  id: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  quotes: Quote[];
  containerClass?: string;
  children: ReactNode;
}

function InsightCard({ id, expandedId, onToggle, quotes, containerClass = "bg-gray-50 border-gray-200", children }: InsightCardProps) {
  const isExpanded = expandedId === id;
  const quoteCount = quotes?.length ?? 0;
  return (
    <div
      className={`rounded-lg border ${containerClass} transition-shadow ${quoteCount > 0 ? "cursor-pointer hover:shadow-sm" : ""}`}
      onClick={() => quoteCount > 0 && onToggle(id)}
    >
      <div className="p-3">
        {children}
        {quoteCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>{isExpanded ? "Hide evidence" : `${quoteCount} quote${quoteCount === 1 ? "" : "s"}`}</span>
          </div>
        )}
      </div>
      {isExpanded && quoteCount > 0 && (
        <div className="border-t border-gray-200 bg-white px-3 py-2.5 space-y-2 rounded-b-lg">
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-0.5 bg-purple-400 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 mb-0.5">
                  {q.agent_name}
                </div>
                <div className="text-xs text-gray-700 italic leading-snug">&ldquo;{q.quote}&rdquo;</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InsightPanel({ insights, isLoading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Analyzing conversation...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Insights will appear here after the focus group completes
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-5 space-y-6 bg-white">
      {/* Executive Summary */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Executive Summary</h3>
        <ul className="space-y-2">
          {insights.executive_summary.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-800">
              <span className="text-purple-500 flex-shrink-0 mt-0.5">→</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Fatal Flaws */}
      {insights.fatal_flaws.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">Fatal Flaws</h3>
          <div className="space-y-2">
            {insights.fatal_flaws.map((flaw, i) => (
              <InsightCard
                key={i}
                id={`flaw-${i}`}
                expandedId={expandedId}
                onToggle={toggle}
                quotes={flaw.supporting_quotes ?? []}
                containerClass={SEVERITY_COLORS[flaw.severity]}
              >
                <div className="font-medium text-sm mb-1">{flaw.flaw}</div>
                <div className="text-xs opacity-75">Affects: {flaw.which_segments_care.join(", ")}</div>
              </InsightCard>
            ))}
          </div>
        </section>
      )}

      {/* Non-Obvious Insights */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
          Non-Obvious Insights
          <span className="ml-2 text-xs normal-case text-gray-500 font-normal">
            Things surveys wouldn&apos;t surface
          </span>
        </h3>
        <div className="space-y-3">
          {insights.non_obvious_insights.map((insight, i) => (
            <InsightCard
              key={i}
              id={`non-obvious-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              quotes={insight.supporting_quotes ?? []}
              containerClass="bg-amber-50 border-amber-200"
            >
              <p className="text-sm text-gray-900 font-medium mb-1">{insight.insight}</p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="text-amber-700 font-medium">Why non-obvious:</span> {insight.why_non_obvious}
              </p>
              <p className="text-xs text-gray-500 italic">&ldquo;{insight.evidence}&rdquo;</p>
            </InsightCard>
          ))}
        </div>
      </section>

      {/* Controversy Points */}
      {insights.controversy_points.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Key Disagreements</h3>
          <div className="space-y-2">
            {insights.controversy_points.map((c, i) => (
              <InsightCard
                key={i}
                id={`controversy-${i}`}
                expandedId={expandedId}
                onToggle={toggle}
                quotes={c.supporting_quotes ?? []}
              >
                <div className="font-medium text-sm text-gray-900 mb-2">{c.topic}</div>
                <div className="flex gap-4 text-xs mb-1">
                  <span className="text-emerald-700">For: {c.pro_agents.join(", ")}</span>
                  <span className="text-red-600">Against: {c.con_agents.join(", ")}</span>
                </div>
                <p className="text-gray-600 text-xs">{c.why_it_matters}</p>
              </InsightCard>
            ))}
          </div>
        </section>
      )}

      {/* Consensus Points */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Points of Consensus</h3>
        <div className="space-y-2">
          {insights.consensus_points.map((c, i) => (
            <InsightCard
              key={i}
              id={`consensus-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              quotes={c.supporting_quotes ?? []}
            >
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(8, Math.round(c.confidence * 32))}px` }}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-800">{c.insight}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.supporting_agents.join(", ")}</p>
                </div>
              </div>
            </InsightCard>
          ))}
        </div>
      </section>

      {/* Unmet Needs */}
      {insights.unmet_needs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Unmet Needs</h3>
          <div className="space-y-2">
            {insights.unmet_needs.map((n, i) => (
              <InsightCard
                key={i}
                id={`need-${i}`}
                expandedId={expandedId}
                onToggle={toggle}
                quotes={n.supporting_quotes ?? []}
              >
                <div className="font-medium text-sm text-gray-900">{n.need}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Expressed by: {n.expressed_by_archetype} · Implication: {n.product_implication}
                </div>
              </InsightCard>
            ))}
          </div>
        </section>
      )}

      {/* Surprising Agreements */}
      {insights.surprising_agreements.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Surprising Agreements</h3>
          <div className="space-y-2">
            {insights.surprising_agreements.map((s, i) => (
              <InsightCard
                key={i}
                id={`surprise-${i}`}
                expandedId={expandedId}
                onToggle={toggle}
                quotes={s.supporting_quotes ?? []}
              >
                <div className="font-medium text-sm text-gray-900">{s.topic}</div>
                <div className="text-xs text-gray-600 mt-1">{s.agents_who_agreed.join(" + ")} agreed — {s.why_surprising}</div>
              </InsightCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
