"use client";

import { useState } from "react";

interface Props {
  onSubmit: (brief: string, numAgents: number) => void;
  isRunning: boolean;
}

const EXAMPLE_BRIEFS = [
  {
    title: "AI calendar",
    text: "An AI-powered tool that automatically schedules your week based on your priorities and energy levels throughout the day.",
  },
  {
    title: "Restaurant subscription",
    text: "A subscription service that sends you a curated box of local restaurant meals every week, with recipes to recreate them at home.",
  },
  {
    title: "Fridge scanner",
    text: "A mobile app that uses your phone's camera to identify ingredients in your fridge and suggests recipes you can make right now.",
  },
];

export default function ProductBriefForm({ onSubmit, isRunning }: Props) {
  const [brief, setBrief] = useState("");
  const [numAgents, setNumAgents] = useState(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (brief.trim()) {
      onSubmit(brief.trim(), numAgents);
    }
  };

  const estimatedCost = (numAgents * 0.012).toFixed(2);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
          Product Idea
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your product idea in 1–3 sentences. What does it do? Who is it for?"
          rows={5}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none transition-shadow"
          disabled={isRunning}
        />
      </div>

      {/* Example briefs */}
      <div>
        <p className="text-[11px] font-medium text-gray-500 mb-1.5">Or try an example</p>
        <div className="space-y-1">
          {EXAMPLE_BRIEFS.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBrief(example.text)}
              className="w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors group flex items-center justify-between gap-2"
              disabled={isRunning}
            >
              <span className="text-gray-700 font-medium truncate">{example.title}</span>
              <span className="text-gray-400 group-hover:text-purple-500 flex-shrink-0">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Agent count */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Group Size
          </label>
          <div className="text-xs">
            <span className="font-bold text-gray-900">{numAgents}</span>
            <span className="text-gray-400"> participants · ~${estimatedCost}</span>
          </div>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={numAgents}
          onChange={(e) => setNumAgents(Number(e.target.value))}
          className="w-full accent-purple-500"
          disabled={isRunning}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>fast</span>
          <span>rich</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isRunning || !brief.trim()}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white transition-all shadow-sm hover:shadow-md disabled:shadow-none"
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            In session...
          </span>
        ) : (
          "Start Focus Group"
        )}
      </button>
    </form>
  );
}
