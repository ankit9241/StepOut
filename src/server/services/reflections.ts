import type { ValidatedReflectionInput } from "../schemas";
import { generateAiReflection } from "./ai";
import { saveReflectionEntry } from "./db";

const FALLBACK_REFLECTIONS = [
  (obs: string) =>
    `Taking time to notice "${obs}" brings your awareness back to the physical world. Small details like this make stepping out worthwhile.`,
  (obs: string) =>
    `Noticing "${obs}" breaks the rhythm of screen time. It is a quiet reminder that the environment always has something more to offer.`,
  (obs: string) =>
    `You noticed "${obs}" — an observation easily missed if you had rushed by. A thoughtful moment away from the digital noise.`,
  (obs: string) =>
    `Observing "${obs}" connects you directly with where you are right now. A calm and honest detail to take with you.`,
];

function pickFallbackReflection(observation: string): string {
  let hash = 0;
  for (let i = 0; i < observation.length; i++) {
    hash = (hash << 5) - hash + observation.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_REFLECTIONS.length;
  const fn = FALLBACK_REFLECTIONS[index] || FALLBACK_REFLECTIONS[0]!;
  // Truncate observation inside quote if very long
  const cleanObs = observation.length > 80 ? `${observation.slice(0, 77)}…` : observation;
  return fn(cleanObs).slice(0, 600);
}

export async function generateReflectionService(
  input: ValidatedReflectionInput,
): Promise<{ reflection: string }> {
  // Attempt AI generation
  const aiText = await generateAiReflection(input);
  if (aiText) {
    await saveReflectionEntry({
      challengeTitle: input.challengeTitle,
      observationLength: input.observation.length,
      source: "gemma",
    });
    return { reflection: aiText };
  }

  // Deterministic fallback
  const fallbackText = pickFallbackReflection(input.observation);
  await saveReflectionEntry({
    challengeTitle: input.challengeTitle,
    observationLength: input.observation.length,
    source: "builtin",
  });
  return { reflection: fallbackText };
}
