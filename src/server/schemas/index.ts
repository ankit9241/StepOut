import { z } from "zod";

export const CATEGORIES = ["notice", "listen", "find", "observe", "reflect"] as const;
export const DIFFICULTIES = ["easy", "curious", "exploratory"] as const;
export const DURATIONS = [3, 5, 10, 15] as const;
export const ENVIRONMENTS = ["home", "neighbourhood", "park", "urban"] as const;

export const PreferencesSchema = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(60),
  environment: z.enum(ENVIRONMENTS),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
});

export type ValidatedPreferences = z.infer<typeof PreferencesSchema>;

export const ReflectionInputSchema = z.object({
  challengeTitle: z
    .string()
    .trim()
    .min(1, "Challenge title is required")
    .max(200, "Title is too long"),
  observation: z
    .string()
    .trim()
    .min(1, "Observation is required")
    .max(1000, "Observation cannot exceed 1000 characters"),
});

export type ValidatedReflectionInput = z.infer<typeof ReflectionInputSchema>;

export const ChallengeOutputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  durationMinutes: z.number().int().min(1).max(60),
  difficulty: z.enum(DIFFICULTIES),
  category: z.enum(CATEGORIES),
  environment: z.string().max(60),
  steps: z.array(z.string().min(1).max(300)).min(2).max(8),
  curiosityPrompt: z.string().min(1).max(300),
  safetyNote: z.string().min(1),
  generationMode: z.enum(["gemma", "builtin"]),
  createdAt: z.string(),
});

export type ServerChallenge = z.infer<typeof ChallengeOutputSchema>;
