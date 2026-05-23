"use client";

import { useEffect, useState } from "react";
import FocusGroupSettingsPanel from "./FocusGroupSettingsPanel";
import { FocusGroupSettings } from "../lib/focusGroupSettings";

const API_BASE = "http://localhost:8000";

interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  location: string;
  income_bracket: string;
  archetype: string;
  tech_comfort: number;
  pain_points: string[];
  motivations: string[];
  communication_style: string;
  likely_objections: string[];
  avatar_color: string;
}

const COLOR_PALETTE = [
  "#4A90E2", "#7ED321", "#F5A623", "#BD10E0", "#50E3C2",
  "#9013FE", "#D0021B", "#417505", "#F8E71C", "#8B572A",
  "#FF6B9D", "#0FB5BA", "#E94B3C", "#6D4C41", "#1FA47A",
];

const ARCHETYPES = [
  "pragmatic_skeptic",
  "early_adopter",
  "enterprise_buyer",
  "budget_conscious_parent",
  "frustrated_power_user",
  "passive_lurker",
  "loyal_traditionalist",
  "trend_follower",
  "value_optimizer",
];

const INCOME_OPTIONS = ["low", "middle", "high"];

function randomColor(used: Set<string>): string {
  const free = COLOR_PALETTE.filter((c) => !used.has(c));
  return (free.length > 0 ? free : COLOR_PALETTE)[Math.floor(Math.random() * (free.length > 0 ? free.length : COLOR_PALETTE.length))];
}

function arrayFromCSV(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function csvFromArray(a: string[]): string {
  return a.join(", ");
}

interface FormState {
  name: string;
  age: string;
  occupation: string;
  location: string;
  income_bracket: string;
  archetype: string;
  tech_comfort: number;
  pain_points: string;
  motivations: string;
  communication_style: string;
  likely_objections: string;
  avatar_color: string;
}

const emptyForm = (color: string): FormState => ({
  name: "",
  age: "",
  occupation: "",
  location: "Various",
  income_bracket: "middle",
  archetype: ARCHETYPES[0],
  tech_comfort: 3,
  pain_points: "",
  motivations: "",
  communication_style: "",
  likely_objections: "",
  avatar_color: color,
});

interface PersonasPanelProps {
  settings: FocusGroupSettings;
  onSettingsChange: (s: FocusGroupSettings) => void;
}

export default function PersonasPanel({ settings, onSettingsChange }: PersonasPanelProps) {
  const [defaults, setDefaults] = useState<Persona[]>([]);
  const [custom, setCustom] = useState<Persona[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(COLOR_PALETTE[0]));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedColors = new Set([...defaults, ...custom].map((p) => p.avatar_color));

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`${API_BASE}/personas`);
      const data = await res.json();
      setDefaults(data.default || []);
      setCustom(data.custom || []);
    } catch (e) {
      console.error("Failed to load personas", e);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const openForm = () => {
    setForm(emptyForm(randomColor(usedColors)));
    setError(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ageNum = parseInt(form.age, 10);
      if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
        throw new Error("Age must be a number between 16 and 100");
      }
      if (!form.name.trim() || !form.occupation.trim() || !form.communication_style.trim()) {
        throw new Error("Name, occupation, and communication style are required");
      }

      const id = `custom_${form.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now().toString(36)}`;

      const payload: Persona = {
        id,
        name: form.name.trim(),
        age: ageNum,
        occupation: form.occupation.trim(),
        location: form.location.trim() || "Various",
        income_bracket: form.income_bracket,
        archetype: form.archetype.trim(),
        tech_comfort: form.tech_comfort,
        pain_points: arrayFromCSV(form.pain_points),
        motivations: arrayFromCSV(form.motivations),
        communication_style: form.communication_style.trim(),
        likely_objections: arrayFromCSV(form.likely_objections),
        avatar_color: form.avatar_color,
      };

      const res = await fetch(`${API_BASE}/personas/custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `Server returned ${res.status}`);
      }
      await fetchPersonas();
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deletePersona = async (id: string) => {
    if (!confirm("Delete this custom persona?")) return;
    try {
      await fetch(`${API_BASE}/personas/custom/${id}`, { method: "DELETE" });
      await fetchPersonas();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const renderCard = (p: Persona, isCustom: boolean) => (
    <div key={p.id} className="group relative bg-white border border-slate-200 rounded-md p-3 hover:border-slate-300 hover:shadow-sm transition-all">
      {isCustom && (
        <button
          onClick={() => deletePersona(p.id)}
          className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Delete persona"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: p.avatar_color }}
        >
          {p.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-[13px] font-semibold text-slate-900">{p.name}</div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">{p.age}</div>
            {isCustom && (
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                Custom
              </span>
            )}
          </div>
          <div className="text-[12px] text-slate-600 truncate">{p.occupation}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {p.location} · {p.archetype.replace(/_/g, " ")}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overflow-y-auto h-full bg-white">
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {/* Settings panel applies globally to every focus group run */}
        <FocusGroupSettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          allPersonas={[...defaults, ...custom]}
          defaultCount={defaults.length}
          customCount={custom.length}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight">Persona library</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              <span className="font-mono tabular-nums">{defaults.length}</span> default
              {custom.length > 0 && <> + <span className="font-mono tabular-nums">{custom.length}</span> custom</>}.
              The focus group picks from this pool.
            </p>
          </div>
          <button
            onClick={openForm}
            disabled={showForm}
            className="px-3 h-9 rounded-md text-[13px] font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New persona
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={submit} className="border border-slate-200 bg-slate-50/50 rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-slate-900">New custom persona</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[12px] text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Age *">
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                  min={16}
                  max={100}
                  className={inputClass}
                />
              </Field>
              <Field label="Occupation *" colSpan={2}>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  required
                  placeholder="e.g. Pediatric nurse"
                  className={inputClass}
                />
              </Field>
              <Field label="Location">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Denver, Colorado"
                  className={inputClass}
                />
              </Field>
              <Field label="Income">
                <select
                  value={form.income_bracket}
                  onChange={(e) => setForm({ ...form, income_bracket: e.target.value })}
                  className={inputClass}
                >
                  {INCOME_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Archetype *">
                <input
                  type="text"
                  value={form.archetype}
                  onChange={(e) => setForm({ ...form, archetype: e.target.value })}
                  required
                  list="archetypes"
                  className={inputClass}
                />
                <datalist id="archetypes">
                  {ARCHETYPES.map((a) => <option key={a} value={a} />)}
                </datalist>
              </Field>
              <Field label={`Tech comfort: ${form.tech_comfort}/5`}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.tech_comfort}
                  onChange={(e) => setForm({ ...form, tech_comfort: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </Field>
            </div>

            <Field label="Communication style *">
              <textarea
                value={form.communication_style}
                onChange={(e) => setForm({ ...form, communication_style: e.target.value })}
                required
                rows={2}
                placeholder="e.g. Blunt and direct. Uses sports metaphors. Asks blunt 'what does this actually cost me?' questions."
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Pain points (comma-separated)">
              <input
                type="text"
                value={form.pain_points}
                onChange={(e) => setForm({ ...form, pain_points: e.target.value })}
                placeholder="time-poor, distrusts marketing, juggles three kids"
                className={inputClass}
              />
            </Field>

            <Field label="Motivations (comma-separated)">
              <input
                type="text"
                value={form.motivations}
                onChange={(e) => setForm({ ...form, motivations: e.target.value })}
                placeholder="convenience, status, peace of mind"
                className={inputClass}
              />
            </Field>

            <Field label="Likely objections (comma-separated)">
              <input
                type="text"
                value={form.likely_objections}
                onChange={(e) => setForm({ ...form, likely_objections: e.target.value })}
                placeholder="price, learning curve, privacy"
                className={inputClass}
              />
            </Field>

            <Field label="Color">
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      form.avatar_color === c ? "border-gray-900 scale-110" : "border-white"
                    }`}
                    aria-label={`Pick color ${c}`}
                  />
                ))}
              </div>
            </Field>

            {error && <div className="text-[12px] text-rose-600">{error}</div>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 h-8 text-[12px] font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 h-8 rounded-md text-[12px] font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors"
              >
                {submitting ? "Saving..." : "Save persona"}
              </button>
            </div>
          </form>
        )}

        {/* Custom personas */}
        {custom.length > 0 && (
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">Your custom personas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {custom.map((p) => renderCard(p, true))}
            </div>
          </section>
        )}

        {/* Default personas */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">Default pack</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {defaults.map((p) => renderCard(p, false))}
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-colors";

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? "col-span-2" : ""}>
      <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
