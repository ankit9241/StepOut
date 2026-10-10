import type { Challenge } from "./challenges";
import { validateChallenge } from "./challenges";

export type ChallengeStatus = "ready" | "active" | "paused" | "completed";

export interface ChallengeSession {
  id: string;
  challengeId: string;
  status: ChallengeStatus;
  /** Timestamp (ms) of the most recent resume while active; null otherwise. */
  runningSince: number | null;
  startedAt: string | null;
  /** Seconds accumulated before the current running segment. */
  elapsedSeconds: number;
  completedAt: string | null;
}

export interface ChallengeReflection {
  id: string;
  challengeId: string;
  challengeTitle: string;
  sessionId: string;
  observation: string;
  discoveries: string[];
  mood?: string | undefined;
  actualMinutes: number;
  evidenceStatus: "none" | "submitted";
  verificationMethod: "self_report" | "evidence_submitted";
  aiReflection?: string;
  createdAt: string;
}

const KEYS = {
  challenge: "stepout.challenge",
  session: "stepout.session",
  reflections: "stepout.reflections",
};

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
}

export const store = {
  getChallenge(): Challenge | null {
    const raw = read<Challenge>(KEYS.challenge);
    return raw
      ? validateChallenge(raw, raw.generationMode === "gemma" ? "gemma" : "builtin")
      : null;
  },
  setChallenge(c: Challenge) {
    write(KEYS.challenge, c);
    store.setSession(newSession(c.id));
  },
  getSession(): ChallengeSession | null {
    const s = read<ChallengeSession>(KEYS.session);
    if (!s || typeof s.elapsedSeconds !== "number" || typeof s.challengeId !== "string")
      return null;
    return s;
  },
  setSession(s: ChallengeSession) {
    write(KEYS.session, s);
  },
  getReflections(): ChallengeReflection[] {
    const r = read<ChallengeReflection[]>(KEYS.reflections);
    return Array.isArray(r) ? r.filter((x) => x && typeof x.id === "string") : [];
  },
  addReflection(r: ChallengeReflection) {
    write(KEYS.reflections, [r, ...store.getReflections()].slice(0, 50));
  },
  updateReflection(id: string, patch: Partial<ChallengeReflection>) {
    write(
      KEYS.reflections,
      store.getReflections().map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  },
};

export const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newSession = (challengeId: string): ChallengeSession => ({
  id: uid("s"),
  challengeId,
  status: "ready",
  runningSince: null,
  startedAt: null,
  elapsedSeconds: 0,
  completedAt: null,
});

/* Pure timer transitions — timestamp based, no tick accumulation. */
export function elapsedAt(s: ChallengeSession, now: number): number {
  const running =
    s.status === "active" && s.runningSince !== null ? (now - s.runningSince) / 1000 : 0;
  return Math.max(0, s.elapsedSeconds + running);
}
export function start(s: ChallengeSession, now: number): ChallengeSession {
  if (s.status === "active" || s.status === "completed") return s;
  return {
    ...s,
    status: "active",
    runningSince: now,
    startedAt: s.startedAt ?? new Date(now).toISOString(),
  };
}
export function pause(s: ChallengeSession, now: number): ChallengeSession {
  if (s.status !== "active") return s;
  return { ...s, status: "paused", elapsedSeconds: elapsedAt(s, now), runningSince: null };
}
export function finish(s: ChallengeSession, now: number): ChallengeSession {
  if (s.status === "completed") return s;
  return {
    ...s,
    status: "completed",
    elapsedSeconds: elapsedAt(s, now),
    runningSince: null,
    completedAt: new Date(now).toISOString(),
  };
}

export const fmtClock = (sec: number) => {
  const t = Math.floor(sec);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
