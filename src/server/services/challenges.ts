import type { ServerChallenge, ValidatedPreferences } from "../schemas";
import { generateAiChallenge } from "./ai";
import { saveChallengeGeneration } from "./db";

export const SAFETY =
  "Stay in a safe, accessible place. Do not enter restricted areas, approach traffic, disturb wildlife, or trespass to complete a challenge.";

const TEMPLATES = {
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

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return Math.abs(h);
}

export function generateBuiltinChallenge(
  p: ValidatedPreferences,
  now = new Date(),
): ServerChallenge {
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

export async function generateChallengeService(p: ValidatedPreferences): Promise<ServerChallenge> {
  // Attempt AI generation
  const aiChallenge = await generateAiChallenge(p);
  if (aiChallenge) {
    await saveChallengeGeneration(aiChallenge);
    return aiChallenge;
  }

  // Deterministic fallback
  const fallback = generateBuiltinChallenge(p);
  await saveChallengeGeneration(fallback);
  return fallback;
}
