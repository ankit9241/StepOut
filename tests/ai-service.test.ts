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

    it("generates adaptive follow-up question in fallback mode", async () => {
      vi.spyOn(aiModule, "generateAiFollowUp").mockResolvedValue(null);

      const res = await generateReflectionService({
        challengeTitle: "Shadow watch",
        observation: "I saw an intricate branch shadow on the concrete wall.",
        step: "follow_up",
      });

      expect(res.followUpQuestion).toBeTruthy();
      expect(typeof res.followUpQuestion).toBe("string");
      expect(res.followUpQuestion?.endsWith("?")).toBe(true);
    });

    it("generates grounded synthesis and takeaway in fallback mode", async () => {
      vi.spyOn(aiModule, "generateAiSynthesis").mockResolvedValue(null);

      const res = await generateReflectionService({
        challengeTitle: "Shadow watch",
        observation: "I saw an intricate branch shadow on the concrete wall.",
        step: "synthesis",
        followUpQuestion: "Did the shadow shift while you observed it?",
        followUpAnswer: "Yes, wind made it flicker slightly.",
      });

      expect(res.insight).toBeTruthy();
      expect(res.takeaway).toBeTruthy();
      expect(typeof res.insight).toBe("string");
      expect(typeof res.takeaway).toBe("string");
    });
  });

  describe("Server-Side Challenge Validation and Quality Guards", () => {
    const basePrefs = {
      durationMinutes: 5,
      environment: "park" as const,
      category: "notice" as const,
      difficulty: "easy" as const,
      constraint: "none" as const,
    };

    it("accepts a well-aligned, valid AI challenge output", () => {
      const raw = {
        title: "The Granite Vein",
        description: "Find an ordinary stone or curb and examine its minerals.",
        steps: [
          "Step into the park and lock your phone.",
          "Find a stone surface and look closely at its texture for 3 minutes.",
          "Notice where the grain changes colour.",
        ],
        curiosityPrompt: "What created that seam?",
        safetyNote: "Watch your footing.",
      };

      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).not.toBeNull();
      expect(result?.title).toBe("The Granite Vein");
      expect(result?.generationMode).toBe("gemma");
      expect(result?.steps.length).toBe(3);
    });

    it("rejects repetitive Echoes title when category is notice", () => {
      const raw = {
        title: "Echoes of the Green",
        description: "Examine the texture of leaves.",
        steps: ["Lock phone.", "Look at leaf textures."],
        curiosityPrompt: "What do you see?",
      };

      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).toBeNull();
    });

    it("rejects repetitive static titles like The Granite Seam", () => {
      const raw = {
        title: "The Granite Seam",
        description: "Examine the texture of leaves.",
        steps: ["Lock phone.", "Look at leaf textures."],
        curiosityPrompt: "What do you see?",
      };

      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).toBeNull();
    });

    it("rejects mission that exceeds duration budget", () => {
      const raw = {
        title: "Stone Study",
        description: "Notice details on a stone bench.",
        steps: ["Lock phone.", "Spend 10 minutes examining the stone."],
        curiosityPrompt: "What do you see?",
      };

      // Base budget is 5 minutes, but step demands 10 minutes
      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).toBeNull();
    });

    it("rejects seated mission that requires walking", () => {
      const seatedPrefs = { ...basePrefs, constraint: "seated" as const };
      const raw = {
        title: "Park Study",
        description: "Look at surroundings.",
        steps: ["Lock phone.", "Walk around the entire perimeter of the park."],
        curiosityPrompt: "What stands out?",
      };

      const result = aiModule.validateAiChallengeOutput(raw, seatedPrefs);
      expect(result).toBeNull();
    });

    it("rejects mission containing forbidden phone/camera actions", () => {
      const raw = {
        title: "Bark Texture",
        description: "Look at tree bark.",
        steps: ["Take a photo of the tree bark with your camera.", "Examine the photo closely."],
        curiosityPrompt: "What does it look like?",
      };

      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).toBeNull();
    });

    it("rejects mission with misaligned modality (pure auditory task for notice category)", () => {
      const raw = {
        title: "Acoustic Green",
        description: "Listen closely to the subtle sounds of the park.",
        steps: ["Close your eyes and hear the sounds.", "Focus on the acoustic soundscape."],
        curiosityPrompt: "What is the quietest sound?",
      };

      const result = aiModule.validateAiChallengeOutput(raw, basePrefs);
      expect(result).toBeNull();
    });
  });
});
