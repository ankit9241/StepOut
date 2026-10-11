import type { ValidatedReflectionInput } from "../schemas";
import { generateAiFollowUp, generateAiReflection, generateAiSynthesis } from "./ai";
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

const FALLBACK_FOLLOW_UPS = [
  "Did you notice that immediately when you stepped outside, or only after slowing down?",
  "What made you pause at that specific detail rather than walking past?",
  "How did the light, sound, or surroundings change around it while you observed?",
  "Did that detail feel like a natural part of the space, or an unexpected contrast?",
];

const FALLBACK_TAKEAWAYS = [
  "Notice what hurry conceals.",
  "The physical world rewards quiet attention.",
  "One genuine observation outlasts hours of digital feeds.",
  "Attention is the rarest form of presence.",
];

function pickHash(str: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % modulo;
}

function pickFallbackReflection(observation: string): string {
  const index = pickHash(observation, FALLBACK_REFLECTIONS.length);
  const fn = FALLBACK_REFLECTIONS[index] || FALLBACK_REFLECTIONS[0]!;
  const cleanObs = observation.length > 80 ? `${observation.slice(0, 77)}…` : observation;
  return fn(cleanObs).slice(0, 600);
}

function pickFallbackFollowUp(observation: string): string {
  const index = pickHash(observation, FALLBACK_FOLLOW_UPS.length);
  return FALLBACK_FOLLOW_UPS[index] || FALLBACK_FOLLOW_UPS[0]!;
}

function pickFallbackTakeaway(observation: string): string {
  const index = pickHash(observation, FALLBACK_TAKEAWAYS.length);
  return FALLBACK_TAKEAWAYS[index] || FALLBACK_TAKEAWAYS[0]!;
}

export interface ReflectionServiceResult {
  reflection: string;
  followUpQuestion?: string;
  insight?: string;
  takeaway?: string;
  generationMode: "gemma" | "builtin";
}

export async function generateReflectionService(
  input: ValidatedReflectionInput,
): Promise<ReflectionServiceResult> {
  // Step 1: Adaptive Follow-Up Question
  if (input.step === "follow_up") {
    const aiQuestion = await generateAiFollowUp(input);
    if (aiQuestion) {
      await saveReflectionEntry({
        challengeTitle: input.challengeTitle,
        observationLength: input.observation.length,
        source: "gemma",
      });
      return {
        reflection: aiQuestion,
        followUpQuestion: aiQuestion,
        generationMode: "gemma",
      };
    }

    const fallbackQuestion = pickFallbackFollowUp(input.observation);
    await saveReflectionEntry({
      challengeTitle: input.challengeTitle,
      observationLength: input.observation.length,
      source: "builtin",
    });
    return {
      reflection: fallbackQuestion,
      followUpQuestion: fallbackQuestion,
      generationMode: "builtin",
    };
  }

  // Step 2: Synthesis (with follow-up answer) or standard reflection
  if (input.followUpAnswer) {
    const synthesis = await generateAiSynthesis(input);
    if (synthesis) {
      await saveReflectionEntry({
        challengeTitle: input.challengeTitle,
        observationLength: input.observation.length,
        source: "gemma",
      });
      return {
        reflection: synthesis.insight,
        insight: synthesis.insight,
        takeaway: synthesis.takeaway,
        generationMode: "gemma",
      };
    }
  }

  // Fallback to standard AI reflection or deterministic synthesis
  const aiText = await generateAiReflection(input);
  if (aiText) {
    await saveReflectionEntry({
      challengeTitle: input.challengeTitle,
      observationLength: input.observation.length,
      source: "gemma",
    });
    return {
      reflection: aiText,
      insight: aiText,
      takeaway: pickFallbackTakeaway(input.observation),
      generationMode: "gemma",
    };
  }

  // Deterministic fallback (exact match for tests)
  const fallbackText = pickFallbackReflection(input.observation);
  const fallbackTakeaway = pickFallbackTakeaway(input.observation);
  await saveReflectionEntry({
    challengeTitle: input.challengeTitle,
    observationLength: input.observation.length,
    source: "builtin",
  });
  return {
    reflection: fallbackText,
    insight: fallbackText,
    takeaway: fallbackTakeaway,
    generationMode: "builtin",
  };
}
