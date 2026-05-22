"use client";

import { useEffect, useState } from "react";
import { PersonaInfo } from "../lib/types";

interface Connection {
  id: string;
  from: string;
  to: string;
  expiresAt: number;
}

interface Props {
  personas: PersonaInfo[];
  typingPersonaId: string | null;
  connections: Connection[];
}

const SIZE = 720;
const CENTER = SIZE / 2;
const NODE_RADIUS = 9;
const RING_RADIUS = 260;

function nodePosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + RING_RADIUS * Math.cos(angle),
    y: CENTER + RING_RADIUS * Math.sin(angle),
    angle,
  };
}

export default function FocusGraph({ personas, typingPersonaId, connections }: Props) {
  const [, forceTick] = useState(0);

  // Re-render at ~16fps while connections exist so opacity-fade animates
  useEffect(() => {
    if (connections.length === 0) return;
    const id = setInterval(() => forceTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, [connections.length]);

  const positions = new Map(personas.map((p, i) => [p.id, nodePosition(i, personas.length)]));

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden bg-white relative">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full max-w-[860px] max-h-[860px]">
        <defs>
          <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
          </filter>
          <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Background guide circle */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={1}
          strokeDasharray="3 6"
        />

        {/* Animated connection lines */}
        {connections.map((conn) => {
          const from = positions.get(conn.from);
          const to = positions.get(conn.to);
          if (!from || !to) return null;
          const lifetime = 3000;
          const remaining = Math.max(0, conn.expiresAt - Date.now());
          const fade = remaining / lifetime;
          const opacity = (fade > 0.33 ? 1 : fade / 0.33) * 0.85;
          return (
            <line
              key={conn.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#connection-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={opacity}
              style={{
                strokeDasharray: "10 6",
                animation: "dash-flow 0.9s linear infinite",
              }}
            />
          );
        })}

        {/* Nodes */}
        {personas.map((p, i) => {
          const pos = nodePosition(i, personas.length);
          const isTyping = typingPersonaId === p.id;
          return (
            <g key={p.id}>
              {isTyping && (
                <>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS + 8}
                    fill={p.avatar_color}
                    opacity={0.18}
                    style={{
                      animation: "node-pulse 1.4s ease-out infinite",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }}
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS + 4}
                    fill="none"
                    stroke={p.avatar_color}
                    strokeWidth={1.5}
                    opacity={0.5}
                    style={{
                      animation: "node-pulse 1.4s ease-out infinite 0.3s",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }}
                  />
                </>
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                fill={p.avatar_color}
                filter="url(#node-shadow)"
                style={{
                  transition: "transform 0.2s",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: isTyping ? "scale(1.3)" : "scale(1)",
                }}
              />
            </g>
          );
        })}
      </svg>

      {personas.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Waiting for the focus group to begin...
        </div>
      )}

      <style jsx>{`
        @keyframes dash-flow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -16;
          }
        }
        @keyframes node-pulse {
          0% {
            opacity: 0.6;
            transform: scale(0.9);
          }
          100% {
            opacity: 0;
            transform: scale(1.6);
          }
        }
      `}</style>
    </div>
  );
}
