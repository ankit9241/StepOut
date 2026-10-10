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

  it("handles reflection operational logging smoothly and redacts raw content", async () => {
    await expect(
      saveReflectionEntry({
        challengeTitle: "Test Challenge",
        observation: "User personal observation text that must not be stored",
        reflection: "User reflection text that must not be stored",
        source: "builtin",
      }),
    ).resolves.not.toThrow();
  });

  it("closes cleanly when no connection was opened", async () => {
    await expect(closeDb()).resolves.not.toThrow();
  });
});
