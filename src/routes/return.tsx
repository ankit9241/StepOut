import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { MissingChallenge } from "@/components/Missing";
import { useActive } from "@/hooks/use-active";
import { store, uid } from "@/lib/session";
import { requestReflection } from "@/lib/api";
import { extractCleanText } from "@/lib/utils";

export const Route = createFileRoute("/return")({
  head: () => ({
    meta: [
      { title: "Return Dialogue — The Invisible Mission" },
      {
        name: "description",
        content: "An adaptive dialogue reflecting on what you actually observed in the real world.",
      },
      { property: "og:title", content: "Return Dialogue — The Invisible Mission" },
      {
        property: "og:description",
        content: "A mission-specific conversation about your real-world observation.",
      },
    ],
  }),
  component: ReturnPage,
});

type DialogueStep = "initial" | "asking_follow_up" | "follow_up" | "finalizing";

export function ReturnPage() {
  const { ready, challenge, session } = useActive();
  const navigate = useNavigate();

  const [step, setStep] = useState<DialogueStep>("initial");
  const [obs, setObs] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saving = useRef(false);

  useEffect(() => {
    if (session) {
      setMinutes(String(Math.max(1, Math.round(session.elapsedSeconds / 60))));
    }
  }, [session]);

  if (!ready) return <div className="min-h-screen bg-paper" />;
  if (!challenge || !session) {
    return (
      <>
        <SiteHeader />
        <MissingChallenge />
      </>
    );
  }

  // Initial Question: derived from mission curiosity prompt or observation goal
  const initialQuestion =
    challenge.curiosityPrompt?.trim() || "What did you notice out there that surprised you?";

  async function handleInitialSubmit() {
    if (obs.trim().length < 3) {
      setError("Please describe what you observed in at least a few words.");
      return;
    }
    setError(null);
    setStep("asking_follow_up");

    if (!challenge) return;

    try {
      const res = await requestReflection({
        challengeTitle: challenge.title,
        observation: obs.trim(),
        step: "follow_up",
      });

      const rawQ = extractCleanText(res.followUpQuestion);
      const question =
        rawQ || "Did you notice that immediately when you stepped out, or only after slowing down?";
      setFollowUpQuestion(question);
      setStep("follow_up");
    } catch {
      setFollowUpQuestion(
        "Did you notice that immediately when you stepped out, or only after slowing down?",
      );
      setStep("follow_up");
    }
  }

  async function handleFinalSubmit(skipFollowUp = false) {
    if (saving.current || !challenge || !session) return;
    saving.current = true;
    setStep("finalizing");

    const m = Number(minutes);
    const actualMinutes =
      Number.isFinite(m) && m > 0 ? m : Math.max(1, Math.round(session.elapsedSeconds / 60));

    const finalAnswer = skipFollowUp ? undefined : followUpAnswer.trim() || undefined;

    try {
      const res = await requestReflection({
        challengeTitle: challenge.title,
        observation: obs.trim(),
        step: "synthesis",
        followUpQuestion: followUpQuestion || undefined,
        followUpAnswer: finalAnswer,
      });

      const id = uid("r");
      store.addReflection({
        id,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        sessionId: session.id,
        observation: obs.trim(),
        promptQuestion: initialQuestion,
        followUpQuestion: followUpQuestion || undefined,
        followUpAnswer: finalAnswer,
        aiReflection: res.reflection || undefined,
        aiInsight: res.insight || res.reflection || undefined,
        takeaway: res.takeaway || "Notice what hurry conceals.",
        discoveries: [],
        actualMinutes,
        evidenceStatus: "none",
        verificationMethod: "self_report",
        createdAt: new Date().toISOString(),
      });

      navigate({ to: "/result", search: { id } });
    } catch {
      const id = uid("r");
      store.addReflection({
        id,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        sessionId: session.id,
        observation: obs.trim(),
        promptQuestion: initialQuestion,
        followUpQuestion: followUpQuestion || undefined,
        followUpAnswer: finalAnswer,
        aiReflection: `You noticed "${obs.trim()}" — an honest observation from your time away from screens.`,
        aiInsight: `Taking time to notice "${obs.trim()}" brings your awareness back to the physical world.`,
        takeaway: "The physical world rewards quiet attention.",
        discoveries: [],
        actualMinutes,
        evidenceStatus: "none",
        verificationMethod: "self_report",
        createdAt: new Date().toISOString(),
      });

      navigate({ to: "/result", search: { id } });
    }
  }

  return (
    <div className="bg-paper min-h-screen">
      <SiteHeader />

      <main className="page-x py-14 md:py-20">
        <div className="page-max mx-auto max-w-3xl">
          <p className="eyebrow">The Invisible Mission · Return Dialogue</p>

          {/* STEP 1: Mission-Specific Primary Question */}
          {step === "initial" && (
            <div className="mt-6 animate-fade-up">
              <span className="text-xs uppercase tracking-wider text-primary font-mono font-medium">
                Mission: {challenge.title}
              </span>
              <h1 className="display-xl mt-3 text-foreground">{initialQuestion}</h1>
              <p className="mt-4 text-base text-ink-soft">
                Tell us what you actually observed in your own words. It does not need to sound
                profound or poetic.
              </p>

              <div className="mt-8">
                <textarea
                  value={obs}
                  onChange={(e) => {
                    setObs(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={5}
                  placeholder="I noticed a crack in the stone wall where small green moss was holding moisture…"
                  className="w-full rounded-xl border border-border bg-card p-4 text-base focus:border-primary focus:outline-none transition leading-relaxed"
                  autoFocus
                />
              </div>

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

              <div className="rule mt-10 flex items-center justify-between pt-8">
                <button type="button" onClick={handleInitialSubmit} className="btn-primary">
                  Continue to reflection ↗
                </button>
                <span className="text-xs text-ink-soft">
                  Step 1 of 2 · One adaptive question follows
                </span>
              </div>
            </div>
          )}

          {/* TRANSITION: Generating Follow-Up */}
          {step === "asking_follow_up" && (
            <div className="mt-16 flex flex-col items-center justify-center py-20 text-center animate-fade-up">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-6" />
              <p className="eyebrow !text-primary">Listening to your observation</p>
              <h2 className="display-lg mt-3">Formulating your follow-up…</h2>
              <p className="mt-4 max-w-sm text-sm text-ink-soft">
                Gemma is reading what you observed to ask a relevant question grounded in your
                words.
              </p>
            </div>
          )}

          {/* STEP 2: Adaptive Follow-Up Question */}
          {step === "follow_up" && (
            <div className="mt-6 animate-fade-up">
              {/* User Observation Quote */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-8">
                <p className="eyebrow !text-primary">Your Observation</p>
                <p className="mt-2 text-base italic text-foreground">“{obs}”</p>
              </div>

              <span className="text-xs uppercase tracking-wider text-primary font-mono font-medium">
                Gemma's Follow-Up Question
              </span>
              <h1 className="display-xl mt-3 text-foreground">
                {extractCleanText(followUpQuestion)}
              </h1>
              <p className="mt-3 text-base text-ink-soft">
                Take a brief moment to consider this before sealing your field journal report.
              </p>

              <div className="mt-8">
                <textarea
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  rows={4}
                  placeholder="Looking back, it was only after stopping for a full minute that I realized..."
                  className="w-full rounded-xl border border-border bg-card p-4 text-base focus:border-primary focus:outline-none transition leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Time confirmation */}
              <div className="mt-8 flex items-center gap-3">
                <span className="text-sm text-ink-soft">Time spent in real world:</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-20 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-sm"
                />
                <span className="text-sm text-ink-soft">minutes (self-reported)</span>
              </div>

              <div className="rule mt-10 flex flex-wrap items-center justify-between gap-6 pt-8">
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  className="btn-primary"
                >
                  Generate Field Report ↗
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="btn-ghost text-xs"
                >
                  Skip follow-up & complete
                </button>
              </div>
            </div>
          )}

          {/* FINALIZING */}
          {step === "finalizing" && (
            <div className="mt-16 flex flex-col items-center justify-center py-20 text-center animate-fade-up">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-6" />
              <p className="eyebrow !text-primary">Compiling Field Report</p>
              <h2 className="display-lg mt-3">Synthesizing your observation…</h2>
              <p className="mt-4 max-w-sm text-sm text-ink-soft">
                Grounding your reflections into your permanent field journal report.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
