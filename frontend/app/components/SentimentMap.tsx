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
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg max-w-xs">
      <div className="font-bold text-gray-900 mb-1">{d.agent_name}</div>
      <div className={`mb-1 font-medium ${d.would_buy ? "text-emerald-600" : "text-red-600"}`}>
        {d.would_buy ? "Would buy" : "Would not buy"}
      </div>
      <div className="text-gray-500">Sentiment: {d.overall_sentiment > 0 ? "+" : ""}{d.overall_sentiment.toFixed(2)}</div>
      <div className="text-gray-500">Price sensitivity: {d.price_sensitivity}</div>
      <div className="mt-2 text-gray-700">
        <span className="text-red-600 font-medium">Concern: </span>{d.top_concern}
      </div>
      <div className="text-gray-700">
        <span className="text-emerald-600 font-medium">Delight: </span>{d.top_delight}
      </div>
    </div>
  );
}

export default function SentimentMap({ sentiments }: Props) {
  if (sentiments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
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
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-gray-700 flex-shrink-0">
          <span className="font-bold text-gray-900">{pct}%</span> would buy
        </span>
      </div>

      {/* Scatter plot */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
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
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickCount={3}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.avatar_color} opacity={0.85} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        {sentiments.map((s) => (
          <div
            key={s.agent_id}
            title={`${s.agent_name}: ${s.would_buy ? "would buy" : "would not buy"} (${s.overall_sentiment > 0 ? "+" : ""}${s.overall_sentiment.toFixed(1)})`}
            className="text-xs px-2 py-0.5 rounded-full font-medium border bg-white"
            style={{ borderColor: s.avatar_color + "60", color: s.avatar_color }}
          >
            {s.agent_name}
          </div>
        ))}
      </div>
    </div>
  );
}
