import { describe, expect, it } from "vitest";
import { generateBuiltin, validateChallenge } from "@/lib/challenges";
import { elapsedAt, finish, newSession, pause, start } from "@/lib/session";

describe("timer", () => {
  it("pauses and resumes without losing or gaining time", () => {
    let s = start(newSession("c"), 0);
    s = pause(s, 10_000);
    expect(elapsedAt(s, 50_000)).toBe(10);
    s = start(s, 50_000);
    s = finish(s, 55_000);
    expect(s.elapsedSeconds).toBe(15);
    expect(s.status).toBe("completed");
  });
});

describe("challenges", () => {
  it("built-in generator is labelled builtin and honours duration", () => {
    const c = generateBuiltin({
      durationMinutes: 10,
      environment: "park",
      category: "listen",
      difficulty: "easy",
    });
    expect(c.generationMode).toBe("builtin");
    expect(c.durationMinutes).toBe(10);
  });
  it("rejects responses with an unknown category", () => {
    expect(
      validateChallenge(
        {
          title: "x",
          description: "y",
          curiosityPrompt: "z",
          durationMinutes: 5,
          category: "dance",
          difficulty: "easy",
          steps: ["a", "b"],
        },
        "gemma",
      ),
    ).toBeNull();
  });
});
