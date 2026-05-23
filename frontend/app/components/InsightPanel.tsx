"use client";

import { useState, ReactNode } from "react";
import { InsightReport, Quote } from "../lib/types";

interface Props {
  insights: InsightReport | null;
  isLoading: boolean;
}

const SEVERITY_STYLES = {
  high: "border-l-rose-500 bg-rose-50/40",
  medium: "border-l-amber-500 bg-amber-50/40",
  low: "border-l-sky-500 bg-sky-50/40",
};

const SECTION_HEADER = "text-[11px] font-semibold uppercase tracking-wider text-slate-500";

interface InsightCardProps {
  id: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  quotes: Quote[];
  borderClass?: string;
  children: ReactNode;
}

function InsightCard({ id, expandedId, onToggle, quotes, borderClass = "border-l-slate-200", children }: InsightCardProps) {
  const isExpanded = expandedId === id;
  const quoteCount = quotes?.length ?? 0;
  return (
    <div
      className={`rounded-r-md border border-slate-200 border-l-2 ${borderClass} bg-white transition-shadow ${
        quoteCount > 0 ? "cursor-pointer hover:shadow-sm" : ""
      }`}
      onClick={() => quoteCount > 0 && onToggle(id)}
    >
      <div className="px-4 py-3">
        {children}
        {quoteCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="font-medium">
              {isExpanded ? "Hide evidence" : `${quoteCount} quote${quoteCount === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
      </div>
      {isExpanded && quoteCount > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2.5 rounded-br-md">
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-0.5 bg-slate-300 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-0.5">
                  {q.agent_name}
                </div>
                <div className="text-[12px] text-slate-700 italic leading-snug">&ldquo;{q.quote}&rdquo;</div>
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
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 bg-white">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-[13px]">Analyzing conversation...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-[13px] bg-white">
        Insights will appear here after the focus group completes
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full bg-white">
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        {/* Executive Summary */}
        <section>
          <h3 className={SECTION_HEADER + " mb-3"}>Executive summary</h3>
          <ul className="space-y-2.5">
            {insights.executive_summary.map((bullet, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-slate-800 leading-relaxed">
                <span className="text-slate-300 flex-shrink-0 mt-0.5 font-mono tabular-nums text-xs">{i + 1}</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Fatal Flaws */}
        {insights.fatal_flaws.length > 0 && (
          <section>
            <h3 className={SECTION_HEADER + " mb-3 text-rose-600"}>Fatal flaws</h3>
            <div className="space-y-2">
              {insights.fatal_flaws.map((flaw, i) => (
                <InsightCard
                  key={i}
                  id={`flaw-${i}`}
                  expandedId={expandedId}
                  onToggle={toggle}
                  quotes={flaw.supporting_quotes ?? []}
                  borderClass={SEVERITY_STYLES[flaw.severity]}
                >
                  <div className="text-[13px] font-semibold text-slate-900 mb-1">{flaw.flaw}</div>
                  <div className="text-[11px] text-slate-500">Affects: {flaw.which_segments_care.join(", ")}</div>
                </InsightCard>
              ))}
            </div>
          </section>
        )}

        {/* Non-Obvious Insights */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className={SECTION_HEADER + " text-amber-600"}>Non-obvious insights</h3>
            <span className="text-[11px] text-slate-400">Things surveys wouldn&apos;t surface</span>
          </div>
          <div className="space-y-2">
            {insights.non_obvious_insights.map((insight, i) => (
              <InsightCard
                key={i}
                id={`non-obvious-${i}`}
                expandedId={expandedId}
                onToggle={toggle}
                quotes={insight.supporting_quotes ?? []}
                borderClass="border-l-amber-500 bg-amber-50/40"
              >
                <p className="text-[13px] font-semibold text-slate-900 mb-1">{insight.insight}</p>
                <p className="text-[12px] text-slate-600 mb-1">
                  <span className="font-medium text-amber-700">Why non-obvious:</span> {insight.why_non_obvious}
                </p>
                <p className="text-[11px] text-slate-500 italic">&ldquo;{insight.evidence}&rdquo;</p>
              </InsightCard>
            ))}
          </div>
        </section>

        {/* Controversy Points */}
        {insights.controversy_points.length > 0 && (
          <section>
            <h3 className={SECTION_HEADER + " mb-3"}>Key disagreements</h3>
            <div className="space-y-2">
              {insights.controversy_points.map((c, i) => (
                <InsightCard
                  key={i}
                  id={`controversy-${i}`}
                  expandedId={expandedId}
                  onToggle={toggle}
                  quotes={c.supporting_quotes ?? []}
                >
                  <div className="text-[13px] font-semibold text-slate-900 mb-1.5">{c.topic}</div>
                  <div className="flex gap-4 text-[11px] mb-1.5">
                    <span className="text-emerald-700"><span className="text-slate-500">For:</span> {c.pro_agents.join(", ")}</span>
                    <span className="text-rose-600"><span className="text-slate-500">Against:</span> {c.con_agents.join(", ")}</span>
                  </div>
                  <p className="text-[12px] text-slate-600">{c.why_it_matters}</p>
                </InsightCard>
              ))}
            </div>
          </section>
        )}

        {/* Consensus Points */}
        <section>
          <h3 className={SECTION_HEADER + " mb-3"}>Points of consensus</h3>
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
                  <div className="flex-shrink-0 mt-1.5">
                    <div
                      className="h-1 rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(8, Math.round(c.confidence * 32))}px` }}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-800">{c.insight}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{c.supporting_agents.join(", ")}</p>
                  </div>
                </div>
              </InsightCard>
            ))}
          </div>
        </section>

        {/* Unmet Needs */}
        {insights.unmet_needs.length > 0 && (
          <section>
            <h3 className={SECTION_HEADER + " mb-3"}>Unmet needs</h3>
            <div className="space-y-2">
              {insights.unmet_needs.map((n, i) => (
                <InsightCard
                  key={i}
                  id={`need-${i}`}
                  expandedId={expandedId}
                  onToggle={toggle}
                  quotes={n.supporting_quotes ?? []}
                >
                  <div className="text-[13px] font-semibold text-slate-900">{n.need}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {n.expressed_by_archetype} · {n.product_implication}
                  </div>
                </InsightCard>
              ))}
            </div>
          </section>
        )}

        {/* Surprising Agreements */}
        {insights.surprising_agreements.length > 0 && (
          <section>
            <h3 className={SECTION_HEADER + " mb-3"}>Surprising agreements</h3>
            <div className="space-y-2">
              {insights.surprising_agreements.map((s, i) => (
                <InsightCard
                  key={i}
                  id={`surprise-${i}`}
                  expandedId={expandedId}
                  onToggle={toggle}
                  quotes={s.supporting_quotes ?? []}
                >
                  <div className="text-[13px] font-semibold text-slate-900">{s.topic}</div>
                  <div className="text-[12px] text-slate-600 mt-1">
                    {s.agents_who_agreed.join(" + ")} agreed — {s.why_surprising}
                  </div>
                </InsightCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
