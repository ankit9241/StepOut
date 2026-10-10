import { describe, expect, it } from "vitest";
import {
  checkDbHealth,
  saveChallengeGeneration,
  saveReflectionEntry,
  closeDb,
} from "@/server/services/db";

describe("Database Service (Optional Persistence)", () => {
  it("reports unconfigured when MONGODB_URI is empty", async () => {
    const status = await checkDbHealth();
    expect(status).toBe("unconfigured");
  });

  it("handles challenge persistence smoothly when DB is unconfigured", async () => {
    await expect(
      saveChallengeGeneration({
        id: "test-123",
        title: "Test Challenge",
      }),
    ).resolves.not.toThrow();
  });

  it("handles reflection persistence smoothly when DB is unconfigured", async () => {
    await expect(
      saveReflectionEntry({
        challengeTitle: "Test Challenge",
        observation: "Test Observation",
        reflection: "Test Reflection",
      }),
    ).resolves.not.toThrow();
  });

  it("closes cleanly when no connection was opened", async () => {
    await expect(closeDb()).resolves.not.toThrow();
  });
});
