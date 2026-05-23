"use client";

import { AgentSentiment } from "../lib/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface Props {
  sentiments: AgentSentiment[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AgentSentiment & { x: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 text-[12px] shadow-lg max-w-xs">
      <div className="font-semibold text-slate-900 mb-1">{d.agent_name}</div>
      <div className={`mb-1 font-medium ${d.would_buy ? "text-emerald-600" : "text-rose-600"}`}>
        {d.would_buy ? "Would buy" : "Would not buy"}
      </div>
      <div className="text-slate-500">Sentiment: <span className="font-mono tabular-nums">{d.overall_sentiment > 0 ? "+" : ""}{d.overall_sentiment.toFixed(2)}</span></div>
      <div className="text-slate-500">Price sensitivity: {d.price_sensitivity}</div>
      <div className="mt-2 text-slate-700">
        <span className="text-rose-600 font-medium">Concern: </span>{d.top_concern}
      </div>
      <div className="text-slate-700">
        <span className="text-emerald-600 font-medium">Delight: </span>{d.top_delight}
      </div>
    </div>
  );
}

export default function SentimentMap({ sentiments }: Props) {
  if (sentiments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-[13px]">
        Sentiment data will appear after the focus group completes
      </div>
    );
  }

  const data = sentiments.map((s, i) => ({
    ...s,
    x: i,
    y: s.overall_sentiment,
  }));

  const wouldBuy = sentiments.filter((s) => s.would_buy).length;
  const pct = Math.round((wouldBuy / sentiments.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Headline metric */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Would buy</span>
          <span className="text-[24px] font-mono tabular-nums font-semibold text-slate-900">
            {pct}<span className="text-[14px] text-slate-400">%</span>
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 font-mono tabular-nums">
          {wouldBuy} of {sentiments.length} participants
        </div>
      </div>

      {/* Scatter plot */}
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
          Sentiment distribution
        </div>
        <div className="h-56 border border-slate-200 rounded-md bg-white p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis
                dataKey="x"
                type="number"
                domain={[-0.5, sentiments.length - 0.5]}
                hide
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[-1, 1]}
                tickFormatter={(v) => v === 0 ? "Neutral" : v > 0 ? "Positive" : "Negative"}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickCount={3}
              />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={data}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.avatar_color} opacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">Participants</div>
        <div className="flex flex-wrap gap-1.5">
          {sentiments.map((s) => (
            <div
              key={s.agent_id}
              title={`${s.agent_name}: ${s.would_buy ? "would buy" : "would not buy"} (${s.overall_sentiment > 0 ? "+" : ""}${s.overall_sentiment.toFixed(1)})`}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-white flex items-center gap-1.5"
              style={{ borderColor: s.avatar_color + "60" }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.avatar_color }} />
              <span className="text-slate-700">{s.agent_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
