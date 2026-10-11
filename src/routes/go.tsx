import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActive } from "@/hooks/use-active";
import { MissingChallenge } from "@/components/Missing";
import {
  elapsedAt,
  finish,
  fmtClock,
  newSession,
  pause,
  start,
  store,
  type ChallengeSession,
} from "@/lib/session";

export const Route = createFileRoute("/go")({
  head: () => ({
    meta: [
      { title: "Mission Active — The Invisible Mission" },
      { name: "description", content: "Put your phone away. The physical world is waiting." },
      { property: "og:title", content: "Mission Active — The Invisible Mission" },
      {
        property: "og:description",
        content: "A distraction-free active mission screen while you explore the real world.",
      },
    ],
  }),
  component: GoPage,
});

function GoPage() {
  const { ready, challenge, session: stored } = useActive();
  const navigate = useNavigate();
  const [s, setS] = useState<ChallengeSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ready || !challenge) return;
    let sess = stored ?? newSession(challenge.id);
    if (sess.status === "ready") sess = start(sess, Date.now());
    store.setSession(sess);
    setS(sess);
  }, [ready, challenge, stored]);

  useEffect(() => {
    if (s?.status !== "active") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [s?.status]);

  const update = (next: ChallengeSession) => {
    store.setSession(next);
    setS(next);
    setNow(Date.now());
  };

  if (!ready) return <main className="min-h-screen bg-night" />;
  if (!challenge) return <MissingChallenge />;
  if (!s) return <main className="min-h-screen bg-night" />;

  const elapsed = elapsedAt(s, now);
  const target = challenge.durationMinutes * 60;
  const progress = Math.min(1, elapsed / target);

  return (
    <main className="page-x flex min-h-screen flex-col bg-night text-night-foreground">
      <div className="page-max flex w-full items-center justify-between py-6">
        <span className="eyebrow !text-night-foreground/60">
          {s.status === "completed"
            ? "Mission Completed"
            : s.status === "paused"
              ? "Mission Paused"
              : "The Invisible Mission · Active"}
        </span>
        <Link
          to="/challenge"
          className="eyebrow !text-night-foreground/60 hover:!text-night-foreground"
        >
          View Briefing ↗
        </Link>
      </div>

      {s.status !== "completed" ? (
        <div className="page-max flex w-full flex-1 flex-col justify-center py-10">
          <p className="eyebrow !text-primary">Step out. Lock your screen.</p>
          <h1 className="display-hero mt-6 max-w-4xl">{challenge.title}</h1>

          {/* Observation Goal highlight */}
          <div className="mt-8 max-w-2xl rounded-xl border border-night-foreground/15 bg-night-foreground/5 p-6 backdrop-blur">
            <p className="eyebrow !text-primary">Your Observation Goal</p>
            <p className="display-md mt-2 italic text-night-foreground">
              “{challenge.curiosityPrompt}”
            </p>
            <p className="mt-4 text-sm text-night-foreground/60 leading-relaxed">
              Lock your phone now. StepOut doesn't track location or require keeping this page open.
              Your session is saved locally right here on this device.
            </p>
          </div>

          <div className="mt-14 flex flex-wrap items-end justify-between gap-8">
            <div>
              <p
                className="font-mono text-5xl tabular-nums md:text-7xl"
                aria-live="off"
                role="timer"
              >
                {fmtClock(elapsed)}
              </p>
              <p className="eyebrow mt-2 !text-night-foreground/50">
                of {fmtClock(target)} suggested · Timer is a gentle companion, not proof of presence
              </p>
            </div>
            <div className="flex items-center gap-6">
              {s.status === "active" ? (
                <button
                  onClick={() => update(pause(s, Date.now()))}
                  className="rounded-full border border-night-foreground/30 px-6 py-3 text-sm font-medium hover:border-night-foreground hover:bg-night-foreground/10 transition"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => update(start(s, Date.now()))}
                  className="rounded-full border border-night-foreground/30 px-6 py-3 text-sm font-medium hover:border-night-foreground hover:bg-night-foreground/10 transition"
                >
                  Resume
                </button>
              )}
              <button onClick={() => update(finish(s, Date.now()))} className="btn-primary">
                I'm back ↗
              </button>
            </div>
          </div>

          <div className="mt-10 h-px w-full bg-night-foreground/15">
            <div
              className="h-px bg-primary transition-[width] duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="page-max flex w-full flex-1 flex-col justify-center py-10 animate-fade-up">
          <p className="eyebrow !text-primary">
            {fmtClock(s.elapsedSeconds)} in the physical world
          </p>
          <h1 className="display-hero mt-6">
            Welcome back from the <em>real world.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg opacity-80 leading-relaxed">
            Your mission is done. Let's enter the return dialogue to record what you actually
            observed before the memory fades.
          </p>
          <div className="mt-12">
            <button onClick={() => navigate({ to: "/return" })} className="btn-primary">
              Begin Return Dialogue ↗
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
