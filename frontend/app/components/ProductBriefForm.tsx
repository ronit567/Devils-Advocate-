"use client";

import { useState, useRef } from "react";
import { StructuredBrief, BriefAttachment } from "../lib/types";

interface Props {
  onSubmit: (brief: string, numAgents: number, structured: StructuredBrief, attachments: BriefAttachment[]) => void;
  isRunning: boolean;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function attachmentTypeFor(file: File): BriefAttachment["type"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("text/")) return "text";
  return null;
}

async function fileToAttachment(file: File): Promise<BriefAttachment | null> {
  const type = attachmentTypeFor(file);
  if (!type) return null;
  let content: string;
  if (type === "text") {
    content = await file.text();
  } else {
    content = await readFileAsBase64(file);
  }
  return { type, name: file.name, content, media_type: file.type || undefined };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface AttachmentWithSize extends BriefAttachment {
  size: number;
  preview?: string;
}

const LABEL = "block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5";
const INPUT = "w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-colors";

export default function ProductBriefForm({ onSubmit, isRunning }: Props) {
  const [brief, setBrief] = useState("");
  const [numAgents, setNumAgents] = useState(8);
  const [structuredOpen, setStructuredOpen] = useState(false);
  const [pricing, setPricing] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [attachments, setAttachments] = useState<AttachmentWithSize[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedCost = (numAgents * 0.012).toFixed(2);

  const handleFiles = async (files: FileList | File[]) => {
    setFileError(null);
    const newOnes: AttachmentWithSize[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name} is too large (max 8 MB)`);
        continue;
      }
      const att = await fileToAttachment(file);
      if (!att) {
        setFileError(`${file.name}: unsupported file type`);
        continue;
      }
      newOnes.push({
        ...att,
        size: file.size,
        preview: att.type === "image" ? URL.createObjectURL(file) : undefined,
      });
    }
    if (newOnes.length > 0) setAttachments((prev) => [...prev, ...newOnes]);
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      const removed = next.splice(i, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    const structured: StructuredBrief = {
      pricing: pricing.trim() || undefined,
      target_users: targetUsers.trim() || undefined,
      key_features: keyFeatures.trim() || undefined,
    };
    const cleanAttachments: BriefAttachment[] = attachments.map(({ type, name, content, media_type }) => ({
      type, name, content, media_type,
    }));
    onSubmit(brief.trim(), numAgents, structured, cleanAttachments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={LABEL}>Product idea</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your product idea. What does it do? Who is it for?"
          rows={4}
          className={`${INPUT} resize-none`}
          disabled={isRunning}
        />
      </div>

      {/* Collapsible: structured fields */}
      <div>
        <button
          type="button"
          onClick={() => setStructuredOpen((v) => !v)}
          disabled={isRunning}
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
            Additional context
          </span>
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-slate-400 transition-transform ${structuredOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {structuredOpen && (
          <div className="mt-2.5 space-y-2.5">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Pricing / business model</label>
              <input
                type="text"
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                placeholder="$9.99/mo subscription"
                className={INPUT}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Who it&apos;s for</label>
              <input
                type="text"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="Busy parents who cook 3+ meals/week"
                className={INPUT}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Key features</label>
              <textarea
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder="What's actually in the product?"
                rows={2}
                className={`${INPUT} resize-none`}
                disabled={isRunning}
              />
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className={LABEL}>Attachments</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isRunning && fileInputRef.current?.click()}
          className={`border border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-slate-900 bg-slate-100"
              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          } ${isRunning ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="text-[12px] text-slate-700">
            <span className="font-medium">Click to upload</span>
            <span className="text-slate-400"> or drag & drop</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            PNG, JPG, PDF, TXT — 8 MB max
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_MIME}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={isRunning}
          />
        </div>

        {fileError && <div className="mt-2 text-[11px] text-rose-600">{fileError}</div>}

        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded-md group">
                {a.type === "image" && a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.preview} alt="" className="w-7 h-7 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-slate-500">
                    {a.type === "pdf" ? "PDF" : "TXT"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-slate-800 truncate">{a.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">{formatBytes(a.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                  disabled={isRunning}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group size */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Group size</label>
          <div className="text-[12px] font-mono tabular-nums">
            <span className="font-semibold text-slate-900">{numAgents}</span>
            <span className="text-slate-400"> · ~${estimatedCost}</span>
          </div>
        </div>
        <input
          type="range"
          min={5}
          max={70}
          step={1}
          value={numAgents}
          onChange={(e) => setNumAgents(Number(e.target.value))}
          className="w-full accent-slate-900"
          disabled={isRunning}
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
          <span>5</span>
          <span>70</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isRunning || !brief.trim()}
        className="w-full h-9 rounded-md text-[13px] font-semibold bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors flex items-center justify-center gap-2"
      >
        {isRunning ? (
          <>
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Running...
          </>
        ) : (
          "Run focus group"
        )}
      </button>
    </form>
  );
}
