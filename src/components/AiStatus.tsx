import { useEffect, useState } from "react";
import { checkHealth, type AiStatus } from "@/lib/api";

let cached: Promise<AiStatus> | null = null;

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus>("connecting");
  useEffect(() => {
    let alive = true;
    cached ??= checkHealth();
    cached.then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

const LABEL: Record<AiStatus, string> = {
  connecting: "Connecting",
  connected: "Gemma connected",
  unavailable: "AI unavailable",
  unconfigured: "Using built-in challenges",
};

export function AiStatusBadge() {
  const s = useAiStatus();
  const dot =
    s === "connected"
      ? "bg-success"
      : s === "connecting"
        ? "bg-warning animate-breathe"
        : "bg-muted-foreground";
  return (
    <span className="eyebrow inline-flex items-center gap-2" aria-live="polite">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {LABEL[s]}
    </span>
  );
}
