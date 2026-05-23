export type ModelChoice = "haiku" | "sonnet";
export type PoolChoice = "all" | "default" | "custom";

export interface FocusGroupSettings {
  model: ModelChoice;
  pool: PoolChoice;
  age_min: number | null;
  age_max: number | null;
  income_brackets: string[];   // empty = all
  archetypes: string[];        // empty = all
  tech_comfort_min: number | null;
  tech_comfort_max: number | null;
}

export const DEFAULT_SETTINGS: FocusGroupSettings = {
  model: "haiku",
  pool: "all",
  age_min: null,
  age_max: null,
  income_brackets: [],
  archetypes: [],
  tech_comfort_min: null,
  tech_comfort_max: null,
};

const STORAGE_KEY = "focusGroupSettings.v1";

export function loadSettings(): FocusGroupSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: FocusGroupSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// Strip null fields so the backend gets clean optional fields
export function settingsToPayload(s: FocusGroupSettings) {
  return {
    pool: s.pool,
    age_min: s.age_min ?? undefined,
    age_max: s.age_max ?? undefined,
    income_brackets: s.income_brackets,
    archetypes: s.archetypes,
    tech_comfort_min: s.tech_comfort_min ?? undefined,
    tech_comfort_max: s.tech_comfort_max ?? undefined,
  };
}
