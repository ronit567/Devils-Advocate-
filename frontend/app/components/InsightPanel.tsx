"use client";

import { InsightReport } from "../lib/types";

interface Props {
  insights: InsightReport | null;
  isLoading: boolean;
}

const SEVERITY_COLORS = {
  high: "bg-red-50 text-red-700 border border-red-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low: "bg-blue-50 text-blue-700 border border-blue-200",
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
          Non-Obvious Insights
          <span className="ml-2 text-xs normal-case text-gray-500 font-normal">
            Things surveys wouldn&apos;t surface
          </span>
        </h3>
        <div className="space-y-3">
          {insights.non_obvious_insights.map((insight, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 font-medium mb-1">{insight.insight}</p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="text-amber-700 font-medium">Why non-obvious:</span> {insight.why_non_obvious}
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
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-900 mb-2">{c.topic}</div>
                <div className="flex gap-4 text-xs mb-1">
                  <span className="text-emerald-700">For: {c.pro_agents.join(", ")}</span>
                  <span className="text-red-600">Against: {c.con_agents.join(", ")}</span>
                </div>
                <p className="text-gray-600 text-xs">{c.why_it_matters}</p>
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
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-3 items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${Math.round(c.confidence * 100)}%`, minWidth: "20%" }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-800">{c.insight}</p>
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
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-900">{n.need}</div>
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
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-900">{s.topic}</div>
                <div className="text-xs text-gray-600 mt-1">{s.agents_who_agreed.join(" + ")} agreed — {s.why_surprising}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
