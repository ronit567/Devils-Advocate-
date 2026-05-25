"use client";

import { useState, useMemo, ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { AgentSentiment, InsightReport, Quote } from "../lib/types";

interface Props {
  insights: InsightReport | null;
  isLoading: boolean;
}

type Tone = "rose" | "amber" | "emerald" | "sky" | "slate";

const TONE: Record<Tone, { tag: string; border: string; dot: string; ring: string }> = {
  rose:    { tag: "text-rose-700 bg-rose-50 ring-rose-200",       border: "border-l-rose-500",    dot: "bg-rose-500",    ring: "ring-rose-200" },
  amber:   { tag: "text-amber-700 bg-amber-50 ring-amber-200",    border: "border-l-amber-500",   dot: "bg-amber-500",   ring: "ring-amber-200" },
  emerald: { tag: "text-emerald-700 bg-emerald-50 ring-emerald-200", border: "border-l-emerald-500", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  sky:     { tag: "text-sky-700 bg-sky-50 ring-sky-200",          border: "border-l-sky-500",     dot: "bg-sky-500",     ring: "ring-sky-200" },
  slate:   { tag: "text-slate-700 bg-slate-100 ring-slate-200",   border: "border-l-slate-400",   dot: "bg-slate-400",   ring: "ring-slate-200" },
};

function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? full;
}

function sentimentColor(v: number): string {
  if (v >= 0.15) return "#10b981";  // emerald-500
  if (v <= -0.15) return "#f43f5e"; // rose-500
  return "#94a3b8";                  // slate-400
}

function SentimentChart({
  agentNames,
  sentimentMap,
}: {
  agentNames: string[];
  sentimentMap: Map<string, AgentSentiment>;
}) {
  const data = useMemo(() => {
    const seen = new Set<string>();
    const rows: { name: string; sentiment: number; fill: string }[] = [];
    for (const n of agentNames) {
      if (seen.has(n)) continue;
      seen.add(n);
      const s = sentimentMap.get(n);
      if (!s) continue;
      rows.push({
        name: firstName(s.agent_name),
        sentiment: Number(s.overall_sentiment.toFixed(2)),
        fill: sentimentColor(s.overall_sentiment),
      });
    }
    return rows.sort((a, b) => b.sentiment - a.sentiment);
  }, [agentNames, sentimentMap]);

  if (data.length === 0) {
    return (
      <div className="text-[11px] text-slate-400 italic">No sentiment data for these agents.</div>
    );
  }

  const height = Math.max(80, data.length * 22 + 24);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          barCategoryGap={4}
        >
          <XAxis
            type="number"
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1} />
          <Bar dataKey="sentiment" radius={[2, 2, 2, 2]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuotesList({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return null;
  return (
    <div className="space-y-2.5">
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
  );
}

interface CardProps {
  id: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  tone: Tone;
  tag: string;
  headline: string;
  meta?: ReactNode;
  body?: ReactNode;
  quotes: Quote[];
  agentNames: string[];
  sentimentMap: Map<string, AgentSentiment>;
}

function InsightCard({
  id, expandedId, onToggle, tone, tag, headline, meta, body, quotes, agentNames, sentimentMap,
}: CardProps) {
  const t = TONE[tone];
  const expanded = expandedId === id;
  const hasDetail = quotes.length > 0 || agentNames.length > 0;

  return (
    <div
      className={`rounded-lg border border-slate-200 border-l-[3px] ${t.border} bg-white overflow-hidden transition-all ${
        hasDetail ? "cursor-pointer hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]" : ""
      } ${expanded ? "shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : ""}`}
      onClick={() => hasDetail && onToggle(id)}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${t.tag} mb-1.5`}>
              {tag}
            </span>
            <div className="text-[14px] font-semibold text-slate-900 leading-snug">{headline}</div>
            {meta && <div className="text-[11px] text-slate-500 mt-1">{meta}</div>}
          </div>
          {hasDetail && (
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`text-slate-400 flex-shrink-0 mt-1 transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
          {body && <div className="mb-4 text-[12px] text-slate-700 leading-relaxed">{body}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentNames.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Sentiment of cited agents
                </div>
                <SentimentChart agentNames={agentNames} sentimentMap={sentimentMap} />
              </div>
            )}
            {quotes.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Evidence
                </div>
                <QuotesList quotes={quotes} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title, count, accent, children,
}: {
  title: string;
  count: number;
  accent?: Tone;
  children: ReactNode;
}) {
  if (count === 0) return null;
  const dotColor = accent ? TONE[accent].dot : "bg-slate-300";
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">{title}</h3>
        <span className="text-[10px] font-mono tabular-nums text-slate-400">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function InsightPanel({ insights, isLoading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const sentimentMap = useMemo(() => {
    const m = new Map<string, AgentSentiment>();
    if (!insights) return m;
    for (const s of insights.agent_sentiments) m.set(s.agent_name, s);
    return m;
  }, [insights]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 bg-white">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-[13px]">Analyzing conversation…</p>
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

  const totalCards =
    insights.fatal_flaws.length +
    insights.non_obvious_insights.length +
    insights.controversy_points.length +
    insights.consensus_points.length +
    insights.unmet_needs.length +
    insights.surprising_agreements.length;

  return (
    <div className="overflow-y-auto h-full bg-white">
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        {/* Executive summary — hero block */}
        <section className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Executive summary</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.executive_summary.map((bullet, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] text-slate-800 leading-relaxed">
                <span className="text-slate-400 flex-shrink-0 mt-0.5 font-mono tabular-nums text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {totalCards} insight{totalCards === 1 ? "" : "s"} extracted
            </span>
            <span className="text-[10px] text-slate-400">Click any card for evidence and sentiment</span>
          </div>
        </section>

        <Section title="Fatal flaws" count={insights.fatal_flaws.length} accent="rose">
          {insights.fatal_flaws.map((f, i) => (
            <InsightCard
              key={i}
              id={`flaw-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="rose"
              tag={`Fatal flaw · ${f.severity}`}
              headline={f.flaw}
              meta={f.which_segments_care.length > 0 ? `Affects: ${f.which_segments_care.join(", ")}` : null}
              quotes={f.supporting_quotes ?? []}
              agentNames={(f.supporting_quotes ?? []).map((q) => q.agent_name)}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>

        <Section title="Non-obvious insights" count={insights.non_obvious_insights.length} accent="amber">
          {insights.non_obvious_insights.map((n, i) => (
            <InsightCard
              key={i}
              id={`nonobv-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="amber"
              tag="Non-obvious"
              headline={n.insight}
              meta={<><span className="font-medium text-amber-700">Why non-obvious:</span> {n.why_non_obvious}</>}
              body={<p className="italic">&ldquo;{n.evidence}&rdquo;</p>}
              quotes={n.supporting_quotes ?? []}
              agentNames={(n.supporting_quotes ?? []).map((q) => q.agent_name)}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>

        <Section title="Key disagreements" count={insights.controversy_points.length} accent="sky">
          {insights.controversy_points.map((c, i) => (
            <InsightCard
              key={i}
              id={`controv-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="sky"
              tag="Disagreement"
              headline={c.topic}
              meta={
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span><span className="text-slate-500">For:</span> <span className="text-emerald-700">{c.pro_agents.join(", ")}</span></span>
                  <span><span className="text-slate-500">Against:</span> <span className="text-rose-600">{c.con_agents.join(", ")}</span></span>
                </div>
              }
              body={<p>{c.why_it_matters}</p>}
              quotes={c.supporting_quotes ?? []}
              agentNames={[...c.pro_agents, ...c.con_agents]}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>

        <Section title="Points of consensus" count={insights.consensus_points.length} accent="emerald">
          {insights.consensus_points.map((c, i) => (
            <InsightCard
              key={i}
              id={`cons-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="emerald"
              tag={`Consensus · ${Math.round(c.confidence * 100)}%`}
              headline={c.insight}
              meta={c.supporting_agents.join(", ")}
              quotes={c.supporting_quotes ?? []}
              agentNames={c.supporting_agents}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>

        <Section title="Unmet needs" count={insights.unmet_needs.length} accent="slate">
          {insights.unmet_needs.map((n, i) => (
            <InsightCard
              key={i}
              id={`need-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="slate"
              tag="Unmet need"
              headline={n.need}
              meta={`${n.expressed_by_archetype} · ${n.product_implication}`}
              quotes={n.supporting_quotes ?? []}
              agentNames={(n.supporting_quotes ?? []).map((q) => q.agent_name)}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>

        <Section title="Surprising agreements" count={insights.surprising_agreements.length} accent="emerald">
          {insights.surprising_agreements.map((s, i) => (
            <InsightCard
              key={i}
              id={`surp-${i}`}
              expandedId={expandedId}
              onToggle={toggle}
              tone="emerald"
              tag="Surprising"
              headline={s.topic}
              meta={`${s.agents_who_agreed.join(" + ")} — ${s.why_surprising}`}
              quotes={s.supporting_quotes ?? []}
              agentNames={s.agents_who_agreed}
              sentimentMap={sentimentMap}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}
