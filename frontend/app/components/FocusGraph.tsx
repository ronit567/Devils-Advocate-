"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PersonaInfo } from "../lib/types";

interface Connection {
  id: string;
  from: string;
  to: string;
  expiresAt: number;
  strong: boolean;
}

interface Props {
  personas: PersonaInfo[];
  typingPersonaId: string | null;
  connections: Connection[];
}

const NODE_RADIUS = 9;
const MIN_CANVAS_WIDTH = 1400;
const MIN_CANVAS_HEIGHT = 1000;
const PX_PER_AGENT_X = 90;
const PX_PER_AGENT_Y = 70;
const MARGIN = 100;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function scatterPosition(index: number, total: number, width: number, height: number) {
  const aspect = width / height;
  const cols = Math.max(2, Math.ceil(Math.sqrt(total * aspect)));
  const rows = Math.max(1, Math.ceil(total / cols));
  const cellW = (width - MARGIN * 2) / cols;
  const cellH = (height - MARGIN * 2) / rows;

  const col = index % cols;
  const row = Math.floor(index / cols);

  const baseX = MARGIN + col * cellW + cellW / 2;
  const baseY = MARGIN + row * cellH + cellH / 2;

  const jitterX = (rand(index, 1) - 0.5) * cellW * 0.7;
  const jitterY = (rand(index, 2) - 0.5) * cellH * 0.7;

  return { x: baseX + jitterX, y: baseY + jitterY };
}

export default function FocusGraph({ personas, typingPersonaId, connections }: Props) {
  const [, forceTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (connections.length === 0) return;
    const id = setInterval(() => forceTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, [connections.length]);

  const canvasWidth = Math.max(MIN_CANVAS_WIDTH, personas.length * PX_PER_AGENT_X);
  const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, personas.length * PX_PER_AGENT_Y);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    personas.forEach((p, i) => {
      map.set(p.id, scatterPosition(i, personas.length, canvasWidth, canvasHeight));
    });
    return map;
  }, [personas, canvasWidth, canvasHeight]);

  // Center the scroll position on mount
  useEffect(() => {
    if (!containerRef.current || personas.length === 0) return;
    const el = containerRef.current;
    el.scrollLeft = (canvasWidth * zoom - el.clientWidth) / 2;
    el.scrollTop = (canvasHeight * zoom - el.clientHeight) / 2;
    // Only fire on persona load — zoom changes are handled in setZoomAround
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personas.length]);

  // Zoom around a focal point (e.g., mouse position) so the point under the cursor stays put
  const setZoomAround = (newZoom: number, focalX: number, focalY: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const oldZoom = zoom;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    if (clamped === oldZoom) return;

    // Point in content coordinates (before zoom) that's currently under the focal point
    const contentX = (el.scrollLeft + focalX) / oldZoom;
    const contentY = (el.scrollTop + focalY) / oldZoom;

    setZoom(clamped);

    // After zoom, scroll so that same content point lands at the same focal point
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      containerRef.current.scrollLeft = contentX * clamped - focalX;
      containerRef.current.scrollTop = contentY * clamped - focalY;
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Pinch-to-zoom on Mac trackpads arrives as wheel events with ctrlKey=true
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.01);
    setZoomAround(zoom * factor, focalX, focalY);
  };

  const zoomBy = (factor: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setZoomAround(zoom * factor, el.clientWidth / 2, el.clientHeight / 2);
  };

  const resetZoom = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setZoomAround(1, el.clientWidth / 2, el.clientHeight / 2);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active || !containerRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    containerRef.current.scrollLeft = dragState.current.scrollLeft - dx;
    containerRef.current.scrollTop = dragState.current.scrollTop - dy;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.active = false;
    setIsDragging(false);
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full overflow-auto bg-white select-none no-scrollbar"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
          <svg
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="block pointer-events-none"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
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

            {/* Animated connection lines */}
            {connections.map((conn) => {
              const from = positions.get(conn.from);
              const to = positions.get(conn.to);
              if (!from || !to) return null;
              const lifetime = 3500;
              const remaining = Math.max(0, conn.expiresAt - Date.now());
              const fade = remaining / lifetime;
              const baseOpacity = conn.strong ? 0.85 : 0.45;
              const opacity = (fade > 0.33 ? 1 : fade / 0.33) * baseOpacity;
              return (
                <line
                  key={conn.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={conn.strong ? "url(#connection-gradient)" : "#c4b5fd"}
                  strokeWidth={conn.strong ? 2 : 1.3}
                  strokeLinecap="round"
                  opacity={opacity}
                  style={{
                    strokeDasharray: conn.strong ? "10 6" : "5 5",
                    animation: `dash-flow ${conn.strong ? 0.9 : 1.4}s linear infinite`,
                  }}
                />
              );
            })}

            {/* Nodes */}
            {personas.map((p) => {
              const pos = positions.get(p.id);
              if (!pos) return null;
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
        </div>

        {personas.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
            Waiting for the focus group to begin...
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <button
          onClick={() => zoomBy(1.25)}
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-200"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => zoomBy(1 / 1.25)}
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-200"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          onClick={resetZoom}
          className="w-8 h-8 flex items-center justify-center text-[10px] font-mono font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>

      <style jsx>{`
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
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
