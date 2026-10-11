import { generateBuiltin, validateChallenge, type Challenge, type Preferences } from "./challenges";
import { extractCleanText } from "./utils";

/**
 * Base URL for API requests.
 * In production, this is empty to ensure same-origin requests to the unified server.
 * In development, VITE_API_URL can optionally override for testing against another endpoint.
 */
const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") || "";

export const apiConfigured = () => true;

async function request(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export type AiStatus = "unconfigured" | "connecting" | "connected" | "unavailable";

export async function checkHealth(): Promise<AiStatus> {
  try {
    const data = (await request("/api/health", { method: "GET" }, 10000)) as {
      status?: string;
      ai?: { status?: AiStatus };
    };

    if (data?.status === "ok") {
      if (data?.ai?.status === "connected") return "connected";
      if (data?.ai?.status === "unavailable") return "unavailable";
      if (data?.ai?.status === "unconfigured") return "unconfigured";
      return "unconfigured";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export interface GenerateResult {
  challenge: Challenge;
  note?: string;
}

export async function generateChallenge(p: Preferences): Promise<GenerateResult> {
  try {
    const data = (await request(
      "/api/challenges/generate",
      { method: "POST", body: JSON.stringify(p) },
      25000,
    )) as Record<string, unknown>;
    const mode = data?.["generationMode"] === "gemma" ? "gemma" : "builtin";
    const c = validateChallenge(data, mode);
    if (!c) {
      return {
        challenge: generateBuiltin(p),
        note: "API returned an unusable challenge, so a built-in one was used.",
      };
    }
    return { challenge: c };
  } catch {
    return {
      challenge: generateBuiltin(p),
      note: "Server couldn't be reached, so a built-in challenge was used.",
    };
  }
}

export interface ReflectionApiResult {
  reflection: string | null;
  followUpQuestion?: string | null | undefined;
  insight?: string | null | undefined;
  takeaway?: string | null | undefined;
  generationMode?: "gemma" | "builtin" | undefined;
}

export async function requestReflection(input: {
  challengeTitle: string;
  observation: string;
  step?: "follow_up" | "synthesis" | undefined;
  followUpQuestion?: string | undefined;
  followUpAnswer?: string | undefined;
}): Promise<ReflectionApiResult> {
  if (!input.observation.trim()) return { reflection: null };
  try {
    const data = (await request(
      "/api/reflections/generate",
      { method: "POST", body: JSON.stringify(input) },
      25000,
    )) as {
      reflection?: unknown;
      followUpQuestion?: unknown;
      insight?: unknown;
      takeaway?: unknown;
      generationMode?: unknown;
    };
    const rawRef = typeof data?.reflection === "string" ? extractCleanText(data.reflection) : "";
    const rawQ =
      typeof data?.followUpQuestion === "string" ? extractCleanText(data.followUpQuestion) : "";
    const rawInsight = typeof data?.insight === "string" ? extractCleanText(data.insight) : "";
    const rawTakeaway = typeof data?.takeaway === "string" ? extractCleanText(data.takeaway) : "";

    return {
      reflection: rawRef ? rawRef.slice(0, 600) : null,
      followUpQuestion: rawQ ? rawQ.slice(0, 300) : null,
      insight: rawInsight ? rawInsight.slice(0, 600) : null,
      takeaway: rawTakeaway ? rawTakeaway.slice(0, 200) : null,
      generationMode: data?.generationMode === "gemma" ? "gemma" : "builtin",
    };
  } catch {
    return { reflection: null, followUpQuestion: null, generationMode: "builtin" };
  }
}

export async function generateReflection(input: {
  challengeTitle: string;
  observation: string;
}): Promise<string | null> {
  const res = await requestReflection(input);
  return res.reflection;
}
