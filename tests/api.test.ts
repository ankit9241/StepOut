import { describe, expect, it, beforeEach } from "vitest";
import { handleApiRequest } from "../src/server/app";
import { resetRateLimits } from "../src/server/middleware/rate-limiter";

describe("StepOut API Endpoints", () => {
  beforeEach(async () => {
    await resetRateLimits();
  });

  describe("GET /api/health", () => {
    it("returns 200 with fast lightweight ok status", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ status: "ok" });
      // Ensure no sensitive or diagnostic fields leaked
      expect(data.password).toBeUndefined();
      expect(data.apiKey).toBeUndefined();
      expect(data.connectionString).toBeUndefined();
      expect(data.keepAlive).toBeUndefined();
    });

    it("rejects POST on health endpoint with 405 Method Not Allowed", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "POST" });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data.error).toBe("Method Not Allowed");
    });
  });

  describe("POST /api/challenges/generate", () => {
    it("generates a valid outdoor challenge with valid payload", async () => {
      const payload = {
        durationMinutes: 5,
        environment: "park",
        category: "notice",
        difficulty: "easy",
      };

      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.title).toBeTruthy();
      expect(data.description).toBeTruthy();
      expect(data.durationMinutes).toBe(5);
      expect(data.category).toBe("notice");
      expect(data.environment).toBe("park");
      expect(data.difficulty).toBe("easy");
      expect(Array.isArray(data.steps)).toBe(true);
      expect(data.steps.length).toBeGreaterThanOrEqual(2);
      expect(data.curiosityPrompt).toBeTruthy();
      expect(data.safetyNote).toBeTruthy();
      expect(["builtin", "gemma"]).toContain(data.generationMode);
    });

    it("rejects invalid category with 400 Bad Request", async () => {
      const payload = {
        durationMinutes: 5,
        environment: "park",
        category: "invalid-category",
        difficulty: "easy",
      };

      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });

    it("rejects missing duration with 400 Bad Request", async () => {
      const payload = {
        environment: "park",
        category: "notice",
        difficulty: "easy",
      };

      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
    });

    it("rejects non-POST methods with 405", async () => {
      const req = new Request("http://localhost:3000/api/challenges/generate", { method: "GET" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(405);
    });
  });

  describe("POST /api/reflections/generate", () => {
    it("generates a thoughtful reflection for valid observation", async () => {
      const payload = {
        challengeTitle: "The overlooked detail",
        observation: "I noticed green moss growing in the deep crack between the stone steps.",
      };

      const req = new Request("http://localhost:3000/api/reflections/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(typeof data.reflection).toBe("string");
      expect(data.reflection.length).toBeGreaterThan(10);
      expect(data.reflection.length).toBeLessThanOrEqual(600);
    });

    it("rejects empty observation with 400 Bad Request", async () => {
      const payload = {
        challengeTitle: "The overlooked detail",
        observation: "   ",
      };

      const req = new Request("http://localhost:3000/api/reflections/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("Request parsing and edge cases", () => {
    it("rejects malformed JSON with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad-json-format",
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("INVALID_JSON");
    });

    it("rejects wrong Content-Type with 415 Unsupported Media Type", async () => {
      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "duration=5",
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(415);
    });

    it("rejects oversized body with 413 Payload Too Large", async () => {
      const oversized = "x".repeat(60 * 1024); // 60 KB > 50 KB limit
      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huge: oversized }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(413);
    });

    it("returns 404 for unknown /api/ route", async () => {
      const req = new Request("http://localhost:3000/api/nonexistent", { method: "GET" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("NOT_FOUND");
    });
  });
});
