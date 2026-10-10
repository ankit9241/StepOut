import { config } from "../config";

interface RateLimitRecord {
  timestamps: number[];
}

export type RateLimitBucket = "general" | "challenges" | "reflections";

const store = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(config.RATE_LIMIT_GENERAL_WINDOW_MS, 60000);
  for (const [key, record] of store.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < maxWindow);
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 300000).unref?.();

export function getClientIp(request: Request): string {
  if (config.TRUST_PROXY) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(ip: string, bucket: RateLimitBucket): RateLimitResult {
  const now = Date.now();
  const windowMs = config.RATE_LIMIT_GENERAL_WINDOW_MS;

  let limit = config.RATE_LIMIT_GENERAL_MAX;
  if (bucket === "challenges") {
    limit = config.RATE_LIMIT_CHALLENGES_MAX;
  } else if (bucket === "reflections") {
    limit = config.RATE_LIMIT_REFLECTIONS_MAX;
  }

  const key = `${bucket}:${ip}`;
  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const retryAfterMs = windowMs - (now - oldest);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    allowed: true,
    limit,
    remaining,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits(): void {
  store.clear();
}
