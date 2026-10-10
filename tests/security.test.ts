import { describe, expect, it, beforeEach } from "vitest";
import { handleApiRequest } from "../src/server/app";
import { resetRateLimits, getClientIp } from "../src/server/middleware/rate-limiter";
import { config } from "../src/server/config";

describe("Security and Rate Limiting", () => {
  beforeEach(async () => {
    await resetRateLimits();
  });

  describe("Security Headers", () => {
    it("attaches required security headers to all responses", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);

      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-XSS-Protection")).toBe("0");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(res.headers.get("X-Powered-By")).toBeNull();
    });
  });

  describe("CORS Handling", () => {
    it("handles OPTIONS preflight for allowed origin", async () => {
      const req = new Request("http://localhost:3000/api/challenges/generate", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "POST",
        },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });
  });

  describe("Client IP and Proxy Extraction for Render", () => {
    it("prioritizes CF-Connecting-IP when available behind Render Cloudflare edge", () => {
      const req = new Request("http://localhost:3000/api/health", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-forwarded-for": "198.51.100.1, 10.0.0.1",
        },
      });
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("extracts the first client IP in X-Forwarded-For if CF-Connecting-IP is absent", () => {
      const req = new Request("http://localhost:3000/api/health", {
        headers: {
          "x-forwarded-for": "198.51.100.42, 10.0.0.1",
        },
      });
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("falls back to 127.0.0.1 when no proxy headers are present", () => {
      const req = new Request("http://localhost:3000/api/health");
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("Rate Limiting Enforcement & Recovery", () => {
    it("enforces rate limits on challenge generation and recovers after reset", async () => {
      const payload = {
        durationMinutes: 5,
        environment: "park",
        category: "notice",
        difficulty: "easy",
      };

      const ip = "192.168.1.100";
      const limit = config.RATE_LIMIT_CHALLENGES_MAX;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        const req = new Request("http://localhost:3000/api/challenges/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": ip,
          },
          body: JSON.stringify(payload),
        });
        const res = await handleApiRequest(req);
        expect(res.status).toBe(200);
      }

      // Next request must be rate limited
      const blockedReq = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
        },
        body: JSON.stringify(payload),
      });

      const blockedRes = await handleApiRequest(blockedReq);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
      const blockedData = await blockedRes.json();
      expect(blockedData.error).toBe("Too Many Requests");
      expect(blockedData.retryAfter).toBeGreaterThan(0);

      // Recovery test: after resetting rate limits (or window expiring), requests succeed again
      await resetRateLimits();

      const recoveredReq = new Request("http://localhost:3000/api/challenges/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
        },
        body: JSON.stringify(payload),
      });
      const recoveredRes = await handleApiRequest(recoveredReq);
      expect(recoveredRes.status).toBe(200);
    });

    it("isolates rate limit buckets between different client IPs", async () => {
      const payload = {
        challengeTitle: "The quietest sound",
        observation: "Heard birds chirping in the distance.",
      };

      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";
      const limit = config.RATE_LIMIT_REFLECTIONS_MAX;

      // Exhaust for IP A
      for (let i = 0; i < limit; i++) {
        const req = new Request("http://localhost:3000/api/reflections/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": ipA,
          },
          body: JSON.stringify(payload),
        });
        await handleApiRequest(req);
      }

      // IP A is blocked
      const reqA = new Request("http://localhost:3000/api/reflections/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ipA,
        },
        body: JSON.stringify(payload),
      });
      const resA = await handleApiRequest(reqA);
      expect(resA.status).toBe(429);

      // IP B is still allowed
      const reqB = new Request("http://localhost:3000/api/reflections/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ipB,
        },
        body: JSON.stringify(payload),
      });
      const resB = await handleApiRequest(reqB);
      expect(resB.status).toBe(200);
    });

    it("does not block health check under general traffic", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
    });
  });
});
