"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusGroupSettings, ModelChoice, PoolChoice } from "../lib/focusGroupSettings";

interface Persona {
  age: number;
  income_bracket: string;
  archetype: string;
  tech_comfort: number;
}

interface Props {
  settings: FocusGroupSettings;
  onChange: (settings: FocusGroupSettings) => void;
  allPersonas: Persona[];
  defaultCount: number;
  customCount: number;
}

const INCOME_OPTIONS = ["low", "middle", "high"];
const MODEL_OPTIONS: { value: ModelChoice; label: string; sub: string }[] = [
  { value: "haiku", label: "Haiku 4.5", sub: "Fast · ~$0.001/turn" },
  { value: "sonnet", label: "Sonnet 4.6", sub: "Smarter · ~$0.005/turn" },
];
const POOL_OPTIONS: { value: PoolChoice; label: string }[] = [
  { value: "all", label: "All" },
  { value: "default", label: "Default only" },
  { value: "custom", label: "Custom only" },
];

// Number input that allows blank → null
function NumInput({
  value, onChange, placeholder, min, max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      placeholder={placeholder}
      onChange={(e) => {
        const s = e.target.value;
        onChange(s === "" ? null : Number(s));
      }}
      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[12px] font-mono tabular-nums text-slate-900 placeholder-slate-300 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-colors"
    />
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
        active
          ? "bg-slate-900 border-slate-900 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

// Multi-select dropdown: button shows the count, popover with checkboxes,
// selected items appear as removable chips below. Built inline because the
// only place it's used right now is for the archetype filter.
function MultiSelectDropdown({
  options, selected, onChange, placeholder, formatOption,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  formatOption?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Position popover under the trigger button (uses fixed positioning via portal,
  // so it floats above all overflow-hidden ancestors)
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const measure = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    measure();
    // Close on scroll/resize rather than try to track — simpler and standard
    const onScrollOrResize = () => setOpen(false);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fmt = formatOption ?? ((v: string) => v);
  const label = selected.length === 0 ? placeholder : `${selected.length} selected`;

  const popover = open && mounted ? (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1000,
      }}
      className="bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto py-1"
    >
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(isChecked ? selected.filter((x) => x !== opt) : [...selected, opt])}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-left hover:bg-slate-50 transition-colors"
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                isChecked ? "bg-slate-900 border-slate-900" : "bg-white border-slate-300"
              }`}
            >
              {isChecked && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="text-slate-700">{fmt(opt)}</span>
          </button>
        );
      })}
      {selected.length > 0 && (
        <>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[12px] text-left hover:border-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-colors"
      >
        <span className={selected.length === 0 ? "text-slate-400" : "text-slate-900 font-medium"}>
          {label}
        </span>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {mounted && popover && createPortal(popover, document.body)}

      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-900 text-white"
            >
              {fmt(s)}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(selected.filter((x) => x !== s)); }}
                className="text-slate-300 hover:text-white"
                aria-label={`Remove ${fmt(s)}`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function matches(p: Persona, s: FocusGroupSettings): boolean {
  if (s.age_min !== null && p.age < s.age_min) return false;
  if (s.age_max !== null && p.age > s.age_max) return false;
  if (s.income_brackets.length > 0 && !s.income_brackets.includes(p.income_bracket)) return false;
  if (s.archetypes.length > 0 && !s.archetypes.includes(p.archetype)) return false;
  if (s.tech_comfort_min !== null && p.tech_comfort < s.tech_comfort_min) return false;
  if (s.tech_comfort_max !== null && p.tech_comfort > s.tech_comfort_max) return false;
  return true;
}

export default function FocusGroupSettingsPanel({ settings, onChange, allPersonas, defaultCount, customCount }: Props) {
  const archetypeSet = Array.from(new Set(allPersonas.map((p) => p.archetype))).sort();

  // Pool-scoped personas for the match count
  const scoped =
    settings.pool === "default" ? allPersonas.slice(0, defaultCount) :
    settings.pool === "custom"  ? allPersonas.slice(defaultCount, defaultCount + customCount) :
    allPersonas;
  const matchCount = scoped.filter((p) => matches(p, settings)).length;

  const set = (patch: Partial<FocusGroupSettings>) => onChange({ ...settings, ...patch });

  const reset = () => onChange({
    ...settings,
    age_min: null, age_max: null,
    income_brackets: [], archetypes: [],
    tech_comfort_min: null, tech_comfort_max: null,
  });

  const hasFilters =
    settings.age_min !== null || settings.age_max !== null ||
    settings.income_brackets.length > 0 || settings.archetypes.length > 0 ||
    settings.tech_comfort_min !== null || settings.tech_comfort_max !== null;

  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
      <div className="flex items-center justify-between h-10 px-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Focus group settings</h3>
          <span className="text-[11px] text-slate-400">Applies to every new run</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-slate-500">
            <span className="font-semibold text-slate-900">{matchCount}</span> match
          </span>
          {hasFilters && (
            <button
              onClick={reset}
              className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Model */}
        <div className="col-span-4">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">Model</label>
          <div className="space-y-1">
            {MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ model: opt.value })}
                className={`w-full text-left px-2.5 py-1.5 rounded-md border transition-colors ${
                  settings.model === opt.value
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`text-[12px] font-semibold ${settings.model === opt.value ? "text-white" : "text-slate-900"}`}>
                  {opt.label}
                </div>
                <div className={`text-[10px] font-mono tabular-nums ${settings.model === opt.value ? "text-slate-300" : "text-slate-500"}`}>
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pool */}
        <div className="col-span-4">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">Pool</label>
          <div className="space-y-1">
            {POOL_OPTIONS.map((opt) => {
              const count =
                opt.value === "default" ? defaultCount :
                opt.value === "custom"  ? customCount :
                defaultCount + customCount;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ pool: opt.value })}
                  disabled={opt.value === "custom" && customCount === 0}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    settings.pool === opt.value
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className={`text-[12px] font-medium ${settings.pool === opt.value ? "text-white" : "text-slate-700"}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] font-mono tabular-nums ${settings.pool === opt.value ? "text-slate-300" : "text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demographics */}
        <div className="col-span-4 space-y-3">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">Age range</label>
            <div className="flex items-center gap-1.5">
              <NumInput value={settings.age_min} onChange={(v) => set({ age_min: v })} placeholder="min" min={16} max={100} />
              <span className="text-slate-300">–</span>
              <NumInput value={settings.age_max} onChange={(v) => set({ age_max: v })} placeholder="max" min={16} max={100} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">Tech comfort (1–5)</label>
            <div className="flex items-center gap-1.5">
              <NumInput value={settings.tech_comfort_min} onChange={(v) => set({ tech_comfort_min: v })} placeholder="min" min={1} max={5} />
              <span className="text-slate-300">–</span>
              <NumInput value={settings.tech_comfort_max} onChange={(v) => set({ tech_comfort_max: v })} placeholder="max" min={1} max={5} />
            </div>
          </div>
        </div>

        {/* Income */}
        <div className="col-span-4">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">Income</label>
          <div className="flex flex-wrap gap-1.5">
            {INCOME_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                active={settings.income_brackets.includes(opt)}
                onClick={() => set({ income_brackets: toggle(settings.income_brackets, opt) })}
              >
                {opt}
              </Chip>
            ))}
          </div>
        </div>

        {/* Archetypes */}
        <div className="col-span-8">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">
            Archetypes <span className="text-slate-400 normal-case">(leave blank for all)</span>
          </label>
          <MultiSelectDropdown
            options={archetypeSet}
            selected={settings.archetypes}
            onChange={(next) => set({ archetypes: next })}
            placeholder="Any archetype"
            formatOption={(v) => v.replace(/_/g, " ")}
          />
        </div>
      </div>
    </div>
  );
}
