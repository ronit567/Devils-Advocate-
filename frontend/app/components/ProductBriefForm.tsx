"use client";

import { useState, useRef } from "react";
import { StructuredBrief, BriefAttachment } from "../lib/types";

interface Props {
  onSubmit: (brief: string, numAgents: number, structured: StructuredBrief, attachments: BriefAttachment[]) => void;
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

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ACCEPTED_MIME = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<data>"
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
  return {
    type,
    name: file.name,
    content,
    media_type: file.type || undefined,
  };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface AttachmentWithSize extends BriefAttachment {
  size: number;
  preview?: string; // object URL for image previews
}

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
    if (newOnes.length > 0) {
      setAttachments((prev) => [...prev, ...newOnes]);
    }
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
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    const structured: StructuredBrief = {
      pricing: pricing.trim() || undefined,
      target_users: targetUsers.trim() || undefined,
      key_features: keyFeatures.trim() || undefined,
    };
    // Strip the size/preview metadata before sending
    const cleanAttachments: BriefAttachment[] = attachments.map(({ type, name, content, media_type }) => ({
      type, name, content, media_type,
    }));
    onSubmit(brief.trim(), numAgents, structured, cleanAttachments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
          Product Idea
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your product idea. What does it do? Who is it for?"
          rows={4}
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

      {/* Collapsible: structured fields */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setStructuredOpen((v) => !v)}
          disabled={isRunning}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Add details (optional)
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-gray-400 transition-transform ${structuredOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {structuredOpen && (
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Pricing / business model
              </label>
              <input
                type="text"
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                placeholder="e.g. $9.99/mo subscription"
                className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Who it's for
              </label>
              <input
                type="text"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="e.g. busy parents who cook 3+ meals/week"
                className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Key features
              </label>
              <textarea
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder="What's actually in the product?"
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
                disabled={isRunning}
              />
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
          Attachments (optional)
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isRunning && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
            isDragging ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/30"
          } ${isRunning ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="text-[11px] text-gray-600">
            <span className="font-medium text-purple-600">Click to upload</span> or drag & drop
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Images, PDFs, text — up to 8 MB each
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

        {fileError && (
          <div className="mt-2 text-[11px] text-red-600">{fileError}</div>
        )}

        {attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                {a.type === "image" && a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.preview} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-500">
                    {a.type === "pdf" ? "PDF" : "TXT"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800 truncate font-medium">{a.name}</div>
                  <div className="text-[10px] text-gray-400">{formatBytes(a.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                  disabled={isRunning}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
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
          max={70}
          step={1}
          value={numAgents}
          onChange={(e) => setNumAgents(Number(e.target.value))}
          className="w-full accent-purple-500"
          disabled={isRunning}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>5 (fast)</span>
          <span>70 (rich)</span>
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
