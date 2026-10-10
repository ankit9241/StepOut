import shapeImg from "@/assets/shape.jpg";
import soundImg from "@/assets/sound.jpg";
import ordinaryImg from "@/assets/ordinary.jpg";
import shadowImg from "@/assets/shadow.jpg";
import colourImg from "@/assets/colour.jpg";
import heroImg from "@/assets/hero.jpg";

export const CATEGORIES = ["notice", "listen", "find", "observe", "reflect"] as const;
export const DIFFICULTIES = ["easy", "curious", "exploratory"] as const;
export const DURATIONS = [3, 5, 10, 15] as const;
export const ENVIRONMENTS = ["home", "neighbourhood", "park", "urban"] as const;

export type ChallengeCategory = (typeof CATEGORIES)[number];
export type ChallengeDifficulty = (typeof DIFFICULTIES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type GenerationMode = "gemma" | "builtin";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  environment: string;
  steps: string[];
  curiosityPrompt: string;
  safetyNote: string;
  generationMode: GenerationMode;
  createdAt: string;
}

export interface Preferences {
  durationMinutes: number;
  environment: Environment;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
}

export const ENV_LABEL: Record<Environment, string> = {
  home: "Home or balcony",
  neighbourhood: "Street or neighbourhood",
  park: "Park or garden",
  urban: "Limited greenery",
};
export const CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  notice: "Notice details",
  listen: "Listen carefully",
  find: "Find something",
  observe: "Observe change",
  reflect: "Pause and reflect",
};

export const SAFETY =
  "Stay in a safe, accessible place. Do not enter restricted areas, approach traffic, disturb wildlife, or trespass to complete a challenge.";

const CATEGORY_IMAGE: Record<ChallengeCategory, string> = {
  notice: shapeImg,
  listen: soundImg,
  find: ordinaryImg,
  observe: shadowImg,
  reflect: heroImg,
};
export const imageFor = (c: Challenge) => FEATURED_IMAGES[c.id] ?? CATEGORY_IMAGE[c.category];

const base = (c: Omit<Challenge, "safetyNote" | "generationMode" | "createdAt">): Challenge => ({
  ...c,
  safetyNote: SAFETY,
  generationMode: "builtin",
  createdAt: "2026-01-01T00:00:00.000Z",
});

export const SAMPLE_CHALLENGE = base({
  id: "find-the-unexpected",
  title: "Find the unexpected",
  description:
    "Find something in your surroundings that looks different from everything around it. Observe it for a moment. What makes it stand out?",
  durationMinutes: 5,
  difficulty: "easy",
  category: "notice",
  environment: "neighbourhood",
  steps: [
    "Find a safe place where you can stop without blocking anyone.",
    "Look around slowly, from near to far.",
    "Choose one thing that doesn't quite belong.",
    "Observe its shape, colour, texture, or surroundings.",
    "Remember one thing you noticed.",
  ],
  curiosityPrompt: "What would you have missed if you had kept walking?",
});

export const FEATURED: Challenge[] = [
  base({
    id: "shape-collector",
    title: "The shape collector",
    description: "Find something naturally occurring that has an unusual shape.",
    durationMinutes: 5,
    difficulty: "easy",
    category: "notice",
    environment: "park",
    steps: [
      "Walk somewhere with natural objects — leaves, stones, bark.",
      "Look for one shape that surprises you.",
      "Turn it over in your mind: what made it this way?",
      "Leave it where you found it.",
    ],
    curiosityPrompt: "What shaped it before you arrived?",
  }),
  base({
    id: "sound-without-screen",
    title: "Sound without a screen",
    description:
      "Listen to real environmental sound for a few minutes. Count the distinct sources.",
    durationMinutes: 3,
    difficulty: "easy",
    category: "listen",
    environment: "home",
    steps: [
      "Open a window or step outside.",
      "Close your eyes if it is safe to do so.",
      "Count each distinct sound you can hear.",
      "Notice which one was the quietest.",
    ],
    curiosityPrompt: "Which sound had been there all along?",
  }),
  base({
    id: "two-kinds-of-ordinary",
    title: "Two kinds of ordinary",
    description: "Find two objects that share a colour but have completely different textures.",
    durationMinutes: 5,
    difficulty: "curious",
    category: "find",
    environment: "neighbourhood",
    steps: [
      "Pick a colour you see somewhere nearby.",
      "Find a second object in the same colour.",
      "Compare how each one would feel to touch.",
      "Notice why each has that texture.",
    ],
    curiosityPrompt: "Would you have paired these two on purpose?",
  }),
  base({
    id: "follow-the-shadow",
    title: "Follow the shadow",
    description: "Observe how a shadow moves or changes across a nearby surface.",
    durationMinutes: 5,
    difficulty: "curious",
    category: "observe",
    environment: "home",
    steps: [
      "Find a clear shadow on a wall, floor, or path.",
      "Mark its edge in your memory against something fixed.",
      "Wait, without your phone.",
      "Look again. How far did it travel?",
    ],
    curiosityPrompt: "What else moved while you waited?",
  }),
  base({
    id: "colour-almost-missed",
    title: "A colour you almost missed",
    description: "Find one small patch of colour that breaks the palette of its surroundings.",
    durationMinutes: 3,
    difficulty: "easy",
    category: "notice",
    environment: "urban",
    steps: [
      "Stand still and scan the ground and edges.",
      "Find the smallest bright colour you can.",
      "Ask how it got there.",
      "Remember its exact shade.",
    ],
    curiosityPrompt: "How long has it been waiting to be seen?",
  }),
];

const FEATURED_IMAGES: Record<string, string> = {
  "find-the-unexpected": heroImg,
  "shape-collector": shapeImg,
  "sound-without-screen": soundImg,
  "two-kinds-of-ordinary": ordinaryImg,
  "follow-the-shadow": shadowImg,
  "colour-almost-missed": colourImg,
};

export const ALL_BUILTIN = [SAMPLE_CHALLENGE, ...FEATURED];
export const findBuiltin = (id: string) => ALL_BUILTIN.find((c) => c.id === id);

/* ---------- Deterministic built-in generator ---------- */

const TEMPLATES: Record<
  ChallengeCategory,
  { title: string; description: string; steps: string[]; prompt: string }[]
> = {
  notice: [
    {
      title: "The overlooked detail",
      description: "Find one ordinary detail you have passed without noticing before.",
      steps: [
        "Find a safe place to pause.",
        "Look around slowly.",
        "Choose one detail you would usually ignore.",
        "Observe its texture, colour, or shape.",
      ],
      prompt: "What made you notice it now?",
    },
    {
      title: "Three textures",
      description: "Notice three distinct textures within arm's reach of where you stand.",
      steps: [
        "Stand somewhere comfortable.",
        "Find something rough.",
        "Find something smooth.",
        "Find something you can't quite name.",
      ],
      prompt: "Which texture surprised you most?",
    },
  ],
  listen: [
    {
      title: "The quietest sound",
      description: "Listen until you can hear the quietest sound around you.",
      steps: [
        "Find a still spot.",
        "Listen to the loudest sound first.",
        "Let it fade into the background.",
        "Search for the quietest one.",
      ],
      prompt: "How far away was it?",
    },
  ],
  find: [
    {
      title: "Changed by weather",
      description: "Find an object that has been changed by sun, rain, or wind.",
      steps: [
        "Look at surfaces that live outside.",
        "Find fading, rust, wear, or growth.",
        "Guess how long it took.",
        "Notice what protected the parts that didn't change.",
      ],
      prompt: "What will it look like in a year?",
    },
  ],
  observe: [
    {
      title: "Light on a surface",
      description: "Watch how light falls on a single surface and how it shifts.",
      steps: [
        "Pick one surface in light.",
        "Notice where light ends and shade begins.",
        "Wait quietly.",
        "Look again for any change.",
      ],
      prompt: "What moved that you didn't?",
    },
  ],
  reflect: [
    {
      title: "A still minute",
      description: "Stand still somewhere outside and let the place happen around you.",
      steps: [
        "Find somewhere you can stand safely.",
        "Put your phone away completely.",
        "Breathe slowly and look, without searching.",
        "Notice what comes to you.",
      ],
      prompt: "What did the place sound like when you stopped?",
    },
  ],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function generateBuiltin(p: Preferences, now = new Date()): Challenge {
  const pool = TEMPLATES[p.category];
  const seed = hash(`${p.category}|${p.environment}|${p.difficulty}|${p.durationMinutes}`);
  const t = pool[seed % pool.length]!;
  const extra =
    p.difficulty === "exploratory"
      ? ["Move to a second spot and repeat once."]
      : p.difficulty === "curious"
        ? ["Look once more from a different angle."]
        : [];
  return {
    id: `builtin-${p.category}-${seed.toString(36)}-${now.getTime().toString(36)}`,
    title: t.title,
    description: t.description,
    durationMinutes: p.durationMinutes,
    difficulty: p.difficulty,
    category: p.category,
    environment: p.environment,
    steps: [...t.steps, ...extra].slice(0, 5),
    curiosityPrompt: t.prompt,
    safetyNote: SAFETY,
    generationMode: "builtin",
    createdAt: now.toISOString(),
  };
}

/* ---------- Runtime validation ---------- */

const isStr = (v: unknown, max = 600): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function validateChallenge(raw: unknown, mode: GenerationMode): Challenge | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Record<keyof Challenge, unknown>>;
  if (!isStr(r.title, 120) || !isStr(r.description) || !isStr(r.curiosityPrompt, 300)) return null;
  if (typeof r.durationMinutes !== "number" || r.durationMinutes < 1 || r.durationMinutes > 60)
    return null;
  if (!CATEGORIES.includes(r.category as ChallengeCategory)) return null;
  if (!DIFFICULTIES.includes(r.difficulty as ChallengeDifficulty)) return null;
  if (
    !Array.isArray(r.steps) ||
    r.steps.length < 2 ||
    r.steps.length > 8 ||
    !r.steps.every((s) => isStr(s, 300))
  )
    return null;
  return {
    id: isStr(r.id, 120) ? r.id : `c-${Date.now().toString(36)}`,
    title: r.title,
    description: r.description,
    durationMinutes: Math.round(r.durationMinutes),
    difficulty: r.difficulty as ChallengeDifficulty,
    category: r.category as ChallengeCategory,
    environment: isStr(r.environment, 60) ? r.environment : "anywhere",
    steps: r.steps as string[],
    curiosityPrompt: r.curiosityPrompt,
    safetyNote: isStr(r.safetyNote) ? r.safetyNote : SAFETY,
    generationMode: mode,
    createdAt: isStr(r.createdAt, 40) ? r.createdAt : new Date().toISOString(),
  };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const meta = (c: Challenge) =>
  `${pad2(c.durationMinutes)} MIN · ${c.category.toUpperCase()}`;
