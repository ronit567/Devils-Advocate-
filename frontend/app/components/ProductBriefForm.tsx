"use client";

import { useState } from "react";

interface Props {
  onSubmit: (brief: string, numAgents: number) => void;
  isRunning: boolean;
}

const EXAMPLE_BRIEFS = [
  "An AI-powered tool that automatically schedules your week based on your priorities and energy levels throughout the day.",
  "A subscription service that sends you a curated box of local restaurant meals every week, with recipes to recreate them at home.",
  "A mobile app that uses your phone's camera to identify ingredients in your fridge and suggests recipes you can make right now.",
];

export default function ProductBriefForm({ onSubmit, isRunning }: Props) {
  const [brief, setBrief] = useState("");
  const [numAgents, setNumAgents] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (brief.trim()) {
      onSubmit(brief.trim(), numAgents);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Product Idea
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your product idea in 1-3 sentences. What does it do? Who is it for?"
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          disabled={isRunning}
        />
      </div>

      {/* Example briefs */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Try an example:</p>
        <div className="space-y-1.5">
          {EXAMPLE_BRIEFS.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBrief(example)}
              className="w-full text-left text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors truncate"
              disabled={isRunning}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Agent count */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Focus Group Size: <span className="text-white">{numAgents} participants</span>
        </label>
        <input
          type="range"
          min={5}
          max={30}
          step={5}
          value={numAgents}
          onChange={(e) => setNumAgents(Number(e.target.value))}
          className="w-full accent-purple-500"
          disabled={isRunning}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>5 (fast, ~$0.02)</span>
          <span>30 (rich, ~$0.15)</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isRunning || !brief.trim()}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
      >
        {isRunning ? "Focus group in session..." : "Start Focus Group"}
      </button>
    </form>
  );
}
