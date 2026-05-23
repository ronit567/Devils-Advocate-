"use client";

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
          <div className="flex flex-wrap gap-1.5">
            {archetypeSet.map((a) => (
              <Chip
                key={a}
                active={settings.archetypes.includes(a)}
                onClick={() => set({ archetypes: toggle(settings.archetypes, a) })}
              >
                {a.replace(/_/g, " ")}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
