"use client";

import { InsightReport } from "../lib/types";

interface Props {
  insights: InsightReport | null;
  isLoading: boolean;
}

const SEVERITY_COLORS = {
  high: "bg-red-900/40 text-red-300 border border-red-800",
  medium: "bg-yellow-900/40 text-yellow-300 border border-yellow-800",
  low: "bg-blue-900/40 text-blue-300 border border-blue-800",
};

export default function InsightPanel({ insights, isLoading }: Props) {
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
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        Insights will appear here after the focus group completes
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-6">
      {/* Executive Summary */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Executive Summary</h3>
        <ul className="space-y-2">
          {insights.executive_summary.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-200">
              <span className="text-purple-400 flex-shrink-0 mt-0.5">→</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Fatal Flaws */}
      {insights.fatal_flaws.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">Fatal Flaws</h3>
          <div className="space-y-2">
            {insights.fatal_flaws.map((flaw, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${SEVERITY_COLORS[flaw.severity]}`}>
                <div className="font-medium mb-1">{flaw.flaw}</div>
                <div className="text-xs opacity-75">Affects: {flaw.which_segments_care.join(", ")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Non-Obvious Insights */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
          Non-Obvious Insights
          <span className="ml-2 text-xs normal-case text-gray-500 font-normal">
            Things surveys wouldn&apos;t surface
          </span>
        </h3>
        <div className="space-y-3">
          {insights.non_obvious_insights.map((insight, i) => (
            <div key={i} className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3">
              <p className="text-sm text-amber-100 font-medium mb-1">{insight.insight}</p>
              <p className="text-xs text-gray-400 mb-1">
                <span className="text-amber-600">Why non-obvious:</span> {insight.why_non_obvious}
              </p>
              <p className="text-xs text-gray-500 italic">&ldquo;{insight.evidence}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      {/* Controversy Points */}
      {insights.controversy_points.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Key Disagreements</h3>
          <div className="space-y-2">
            {insights.controversy_points.map((c, i) => (
              <div key={i} className="bg-gray-800/60 rounded-lg p-3 text-sm">
                <div className="font-medium text-white mb-2">{c.topic}</div>
                <div className="flex gap-4 text-xs mb-1">
                  <span className="text-green-400">For: {c.pro_agents.join(", ")}</span>
                  <span className="text-red-400">Against: {c.con_agents.join(", ")}</span>
                </div>
                <p className="text-gray-400 text-xs">{c.why_it_matters}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Consensus Points */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Points of Consensus</h3>
        <div className="space-y-2">
          {insights.consensus_points.map((c, i) => (
            <div key={i} className="bg-gray-800/40 rounded-lg p-3 flex gap-3 items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className="w-8 h-1.5 rounded-full bg-green-500"
                  style={{ width: `${Math.round(c.confidence * 100)}%`, minWidth: "20%" }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-200">{c.insight}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.supporting_agents.join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Unmet Needs */}
      {insights.unmet_needs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Unmet Needs</h3>
          <div className="space-y-2">
            {insights.unmet_needs.map((n, i) => (
              <div key={i} className="bg-gray-800/40 rounded-lg p-3 text-sm">
                <div className="font-medium text-white">{n.need}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Expressed by: {n.expressed_by_archetype} · Implication: {n.product_implication}
                </div>
              </div>
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
              <div key={i} className="bg-gray-800/40 rounded-lg p-3 text-sm">
                <div className="font-medium text-white">{s.topic}</div>
                <div className="text-xs text-gray-400 mt-1">{s.agents_who_agreed.join(" + ")} agreed — {s.why_surprising}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
