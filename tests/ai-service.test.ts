import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateChallengeService } from "../src/server/services/challenges";
import { generateReflectionService } from "../src/server/services/reflections";
import * as aiModule from "../src/server/services/ai";

describe("AI Services and Fallback Generator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Challenge Service Fallback", () => {
    it("falls back to deterministic builtin generator when AI returns null", async () => {
      vi.spyOn(aiModule, "generateAiChallenge").mockResolvedValue(null);

      const challenge = await generateChallengeService({
        durationMinutes: 10,
        environment: "neighbourhood",
        category: "find",
        difficulty: "curious",
      });

      expect(challenge).toBeDefined();
      expect(challenge.generationMode).toBe("builtin");
      expect(challenge.durationMinutes).toBe(10);
      expect(challenge.category).toBe("find");
      expect(challenge.steps.length).toBeGreaterThanOrEqual(2);
      expect(challenge.curiosityPrompt).toBeTruthy();
    });

    it("uses AI challenge when AI returns a valid challenge", async () => {
      const mockChallenge = {
        id: "gemma-test-123",
        title: "AI Found Detail",
        description: "AI generated description",
        durationMinutes: 5,
        difficulty: "easy" as const,
        category: "notice" as const,
        environment: "park",
        steps: ["Step 1", "Step 2"],
        curiosityPrompt: "What do you wonder?",
        safetyNote: "Stay safe",
        generationMode: "gemma" as const,
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(aiModule, "generateAiChallenge").mockResolvedValue(mockChallenge);

      const challenge = await generateChallengeService({
        durationMinutes: 5,
        environment: "park",
        category: "notice",
        difficulty: "easy",
      });

      expect(challenge.id).toBe("gemma-test-123");
      expect(challenge.generationMode).toBe("gemma");
      expect(challenge.title).toBe("AI Found Detail");
    });
  });

  describe("Reflection Service Fallback", () => {
    it("falls back to deterministic thoughtful reflection when AI returns null", async () => {
      vi.spyOn(aiModule, "generateAiReflection").mockResolvedValue(null);

      const res = await generateReflectionService({
        challengeTitle: "The quietest sound",
        observation: "I heard the soft wind rustling dry leaves in the tree above.",
      });

      expect(res.reflection).toBeTruthy();
      expect(typeof res.reflection).toBe("string");
      expect(res.reflection).toContain("soft wind rustling dry leaves");
    });

    it("uses AI reflection when AI returns reflection", async () => {
      vi.spyOn(aiModule, "generateAiReflection").mockResolvedValue(
        "A mindful observation connecting sound and presence.",
      );

      const res = await generateReflectionService({
        challengeTitle: "The quietest sound",
        observation: "Heard the wind.",
      });

      expect(res.reflection).toBe("A mindful observation connecting sound and presence.");
    });
  });
});
