// Stub "auto-build persona" helpers.
// These are UI-only — no real Reddit scraping or AI interviewer runs. The pending
// jobs simulate work, then a Persona is synthesized from the user's description
// + plausible defaults and POSTed through the existing custom-persona endpoint.

export type BuilderSource = "reddit" | "interviewer";

export interface PendingPersonaJob {
  id: string;
  source: BuilderSource;
  description: string;
  avatar_color: string;
  startedAt: number;
  resolvesAt: number;
}

export interface StubPersona {
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

export const STATUS_MESSAGES: Record<BuilderSource, string[]> = {
  reddit: [
    "Picking subreddits...",
    "Fetching top posts...",
    "Reading comments...",
    "Finding recurring themes...",
    "Synthesizing persona...",
  ],
  interviewer: [
    "Generating seed traits...",
    "Starting interview...",
    "Probing daily habits...",
    "Asking about frustrations...",
    "Question 12 of 18...",
    "Distilling backstory...",
  ],
};

export const SOURCE_LABEL: Record<BuilderSource, string> = {
  reddit: "Reddit",
  interviewer: "Interview",
};

// Simulated duration: Reddit feels lighter, interviewer is genuinely long.
// Tuned to feel like real background work rather than a snappy demo.
export function pickResolutionDelayMs(source: BuilderSource): number {
  if (source === "reddit") {
    return 90_000 + Math.random() * 60_000;     // 1.5–2.5 min
  }
  return 180_000 + Math.random() * 120_000;     // 3–5 min
}

// ---------- Stub persona synthesis ----------

const FIRST_NAMES = [
  "Alex", "Becky", "Carlos", "Dana", "Ellis", "Farah", "Gus", "Hana",
  "Imani", "Jules", "Kai", "Lupe", "Mei", "Noah", "Owen", "Priya",
  "Quinn", "Rosa", "Sami", "Theo", "Uma", "Vik", "Wendy", "Xochitl",
  "Yara", "Zane", "Brielle", "Cole", "Deja", "Eli", "Felipe", "Gemma",
];

const OCCUPATIONS = [
  "Elementary school teacher", "Software engineer", "Hospital nurse",
  "Retail store manager", "Freelance graphic designer", "Construction foreman",
  "Account manager", "Barista", "Logistics coordinator", "Insurance adjuster",
  "Real estate agent", "Stay-at-home parent", "Dental hygienist",
  "Mechanical engineer", "Truck driver", "Pharmacy technician",
];

const ARCHETYPES = [
  "pragmatic_skeptic",
  "early_adopter",
  "enterprise_buyer",
  "budget_conscious_parent",
  "frustrated_power_user",
  "passive_lurker",
  "loyal_traditionalist",
  "value_optimizer",
];

const COMMUNICATION_STYLES = [
  "Direct and to-the-point. Uses real-life examples. Skeptical of marketing language.",
  "Enthusiastic and chatty. Jumps between topics. Loves recommending things to friends.",
  "Thoughtful and slow to commit. Asks lots of 'what if' questions before deciding.",
  "Blunt and time-pressed. Wants the bottom line first. Hates fluff.",
  "Story-driven. Reaches for personal anecdotes. Takes time to get to the point.",
];

const GENERIC_PAIN_POINTS = [
  "limited free time", "tight monthly budget", "juggles too many apps",
  "feels overwhelmed by choice", "distrusts marketing claims",
  "constantly interrupted at work", "doesn't want another subscription",
];

const GENERIC_MOTIVATIONS = [
  "simplicity", "value for money", "saving time", "feeling in control",
  "looking competent to peers", "reducing daily friction",
];

const GENERIC_OBJECTIONS = [
  "price", "learning curve", "data privacy", "subscription fatigue",
  "will it actually work?", "lock-in", "too many notifications",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Pull obvious signals out of the user's free-text description
function parseDescription(description: string) {
  const text = description.toLowerCase();

  // Income
  let income: string | null = null;
  if (/\b(low.income|low income|broke|tight budget|poor|low.wage)\b/.test(text)) income = "low";
  else if (/\b(high.income|wealthy|well.off|affluent|six.figure|upper class)\b/.test(text)) income = "high";
  else if (/\b(middle.income|middle income|middle.class|mid.income)\b/.test(text)) income = "middle";

  // Tech comfort: 1-5
  let tech: number | null = null;
  if (/\b(not? tech.savvy|less interested in tech|doesn'?t trust tech|hates? technology|technophobe|barely uses)\b/.test(text)) tech = 2;
  else if (/\b(tech.savvy|early adopter|loves tech|tech enthusiast|power user|engineer|developer)\b/.test(text)) tech = 5;
  else if (/\b(comfortable with tech|uses apps daily)\b/.test(text)) tech = 4;

  // Age — look for "32-year-old", "in their 40s", or a bare number near "year"
  let age: number | null = null;
  const ageMatch =
    text.match(/(\d{2})[\s-]?year[\s-]?old/) ||
    text.match(/(?:age|aged)\s+(\d{2})/) ||
    text.match(/\bin (?:their|her|his) (\d{2})s\b/);
  if (ageMatch) {
    const n = parseInt(ageMatch[1], 10);
    if (n >= 16 && n <= 90) age = n;
  }

  // Location — capture text that looks like "in <Place>" up to a comma or period
  let location: string | null = null;
  const locMatch = description.match(/\bin ([A-Z][a-zA-Z]+(?:[,\s]+[A-Z][a-zA-Z]+)*?)(?=[,.]|\s+(?:who|with|and|that|so)\b|$)/);
  if (locMatch) location = locMatch[1].trim();

  // Archetype hints
  let archetype: string | null = null;
  if (/\b(skeptic|skeptical|cynical)\b/.test(text)) archetype = "pragmatic_skeptic";
  else if (/\b(early adopter|enthusiast|loves new things)\b/.test(text)) archetype = "early_adopter";
  else if (/\b(parent|mom|dad|kids|children)\b/.test(text)) archetype = "budget_conscious_parent";
  else if (/\b(loyal|long.time|traditional)\b/.test(text)) archetype = "loyal_traditionalist";
  else if (/\b(power user|frustrated|fed up)\b/.test(text)) archetype = "frustrated_power_user";

  return { income, tech, age, location, archetype };
}

function uniqueName(takenNames: Set<string>): string {
  const candidates = FIRST_NAMES.filter((n) => !takenNames.has(n));
  return pickRandom(candidates.length > 0 ? candidates : FIRST_NAMES);
}

export function stubPersonaFromDescription(
  job: PendingPersonaJob,
  takenNames: Set<string>,
): StubPersona {
  const parsed = parseDescription(job.description);

  const name = uniqueName(takenNames);
  const age = parsed.age ?? 22 + Math.floor(Math.random() * 45);  // 22–66
  const occupation = pickRandom(OCCUPATIONS);
  const location = parsed.location ?? "Various";
  const income = parsed.income ?? pickRandom(["low", "middle", "middle", "high"]);  // middle weighted
  const tech = parsed.tech ?? 1 + Math.floor(Math.random() * 5);  // 1–5
  const archetype = parsed.archetype ?? pickRandom(ARCHETYPES);

  // Light tie-in: include a fragment of the user's description in the
  // communication style so the auto-built persona feels grounded.
  const trimmedDescription = job.description.trim().replace(/\s+/g, " ").slice(0, 140);
  const styleBase = pickRandom(COMMUNICATION_STYLES);
  const communication_style =
    `${styleBase} Background: ${trimmedDescription}`;

  return {
    id: `custom_${name.toLowerCase()}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
    name,
    age,
    occupation,
    location,
    income_bracket: income,
    archetype,
    tech_comfort: tech,
    pain_points: pickSample(GENERIC_PAIN_POINTS, 3),
    motivations: pickSample(GENERIC_MOTIVATIONS, 3),
    communication_style,
    likely_objections: pickSample(GENERIC_OBJECTIONS, 3),
    avatar_color: job.avatar_color,
  };
}
