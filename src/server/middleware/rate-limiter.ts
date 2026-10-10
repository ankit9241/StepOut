import { RateLimiterMemory, type RateLimiterRes } from "rate-limiter-flexible";
import { config } from "../config";

export type RateLimitBucket = "general" | "challenges" | "reflections";

const windowDurationSeconds = Math.max(1, Math.ceil(config.RATE_LIMIT_GENERAL_WINDOW_MS / 1000));

let generalLimiter = new RateLimiterMemory({
  points: config.RATE_LIMIT_GENERAL_MAX,
  duration: windowDurationSeconds,
});

let challengesLimiter = new RateLimiterMemory({
  points: config.RATE_LIMIT_CHALLENGES_MAX,
  duration: windowDurationSeconds,
});

let reflectionsLimiter = new RateLimiterMemory({
  points: config.RATE_LIMIT_REFLECTIONS_MAX,
  duration: windowDurationSeconds,
});

export function reinitLimiters(): void {
  const duration = Math.max(1, Math.ceil(config.RATE_LIMIT_GENERAL_WINDOW_MS / 1000));
  generalLimiter = new RateLimiterMemory({
    points: config.RATE_LIMIT_GENERAL_MAX,
    duration,
  });
  challengesLimiter = new RateLimiterMemory({
    points: config.RATE_LIMIT_CHALLENGES_MAX,
    duration,
  });
  reflectionsLimiter = new RateLimiterMemory({
    points: config.RATE_LIMIT_REFLECTIONS_MAX,
    duration,
  });
}

/**
 * Extracts and validates client IP for Render proxy setup.
 * Render uses Cloudflare edge routing; CF-Connecting-IP is trusted and spoof-resistant.
 * Falls back to the leftmost IP in X-Forwarded-For if CF-Connecting-IP is not provided.
 */
export function getClientIp(request: Request): string {
  if (config.TRUST_PROXY) {
    // 1. Check Cloudflare header (Render edge proxy)
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp && isValidIp(cfIp.trim())) {
      return cfIp.trim();
    }

    // 2. Check X-Forwarded-For (first entry is the original client)
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first && isValidIp(first)) {
        return first;
      }
    }

    // 3. Check X-Real-IP
    const realIp = request.headers.get("x-real-ip");
    if (realIp && isValidIp(realIp.trim())) {
      return realIp.trim();
    }
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  // Basic sanity check to avoid arbitrary header injection into rate-limiter keys
  // Supports IPv4 (e.g. 1.2.3.4) and IPv6 (e.g. 2001:db8::1 or ::1)
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  const clean = ip.replace(/^\[|\]$/g, "");
  return (ipv4Regex.test(clean) || ipv6Regex.test(clean)) && clean.length <= 45;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  ip: string,
  bucket: RateLimitBucket,
): Promise<RateLimitResult> {
  const limiter =
    bucket === "challenges"
      ? challengesLimiter
      : bucket === "reflections"
        ? reflectionsLimiter
        : generalLimiter;

  try {
    const res: RateLimiterRes = await limiter.consume(ip, 1);
    return {
      allowed: true,
      limit: limiter.points,
      remaining: res.remainingPoints,
      retryAfterSeconds: 0,
    };
  } catch (err) {
    const rej = err as RateLimiterRes;
    const msBeforeNext =
      typeof rej?.msBeforeNext === "number" ? rej.msBeforeNext : windowDurationSeconds * 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil(msBeforeNext / 1000));

    return {
      allowed: false,
      limit: limiter.points,
      remaining: 0,
      retryAfterSeconds,
    };
  }
}

export async function resetRateLimits(): Promise<void> {
  reinitLimiters();
}
