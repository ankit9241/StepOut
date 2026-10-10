import { useEffect, useState } from "react";
import type { Challenge } from "@/lib/challenges";
import { store, type ChallengeSession } from "@/lib/session";

/** Reads the active challenge + session from local storage after hydration. */
export function useActive() {
  const [state, setState] = useState<{
    ready: boolean;
    challenge: Challenge | null;
    session: ChallengeSession | null;
  }>({
    ready: false,
    challenge: null,
    session: null,
  });
  useEffect(() => {
    const challenge = store.getChallenge();
    let session = store.getSession();
    if (challenge && session?.challengeId !== challenge.id) session = null;
    setState({ ready: true, challenge, session });
  }, []);
  return state;
}
