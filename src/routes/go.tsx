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
      { title: "Challenge active — StepOut" },
      { name: "description", content: "Your world is waiting. Put your phone away." },
      { property: "og:title", content: "Challenge active — StepOut" },
      {
        property: "og:description",
        content: "A distraction-free timer while you're out in the real world.",
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
            ? "Challenge complete"
            : s.status === "paused"
              ? "Paused"
              : "Challenge active"}
        </span>
        <Link
          to="/challenge"
          className="eyebrow !text-night-foreground/60 hover:!text-night-foreground"
        >
          Briefing
        </Link>
      </div>

      {s.status !== "completed" ? (
        <div className="page-max flex w-full flex-1 flex-col justify-center py-10">
          <p className="eyebrow !text-primary">Your world is waiting.</p>
          <h1 className="display-hero mt-6 max-w-5xl">{challenge.title}</h1>
          <p className="mt-8 max-w-lg text-lg opacity-75">
            {challenge.steps[0]} Put your phone away. Come back when you're ready.
          </p>

          <div className="mt-16 flex flex-wrap items-end justify-between gap-8">
            <div>
              <p
                className="font-mono text-5xl tabular-nums md:text-7xl"
                aria-live="off"
                role="timer"
              >
                {fmtClock(elapsed)}
              </p>
              <p className="eyebrow mt-2 !text-night-foreground/50">
                of {fmtClock(target)} suggested
              </p>
            </div>
            <div className="flex items-center gap-6">
              {s.status === "active" ? (
                <button onClick={() => update(pause(s, Date.now()))} className="btn-ghost">
                  Pause
                </button>
              ) : (
                <button onClick={() => update(start(s, Date.now()))} className="btn-ghost">
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
          <p className="eyebrow !text-primary">{fmtClock(s.elapsedSeconds)} away from the screen</p>
          <h1 className="display-hero mt-6">
            Back from the <em>real world?</em>
          </h1>
          <p className="mt-6 text-lg opacity-75">Tell us what you noticed.</p>
          <div className="mt-12">
            <button onClick={() => navigate({ to: "/return" })} className="btn-primary">
              Continue to reflection ↗
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
