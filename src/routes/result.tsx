import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { MissingChallenge } from "@/components/Missing";
import { generateReflection } from "@/lib/api";
import { store, type ChallengeReflection } from "@/lib/session";

export const Route = createFileRoute("/result")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "You stepped out — StepOut" },
      { name: "description", content: "Your completed real-world challenge, honestly recorded." },
      { property: "og:title", content: "You stepped out — StepOut" },
      { property: "og:description", content: "A real completion, not a fake score." },
    ],
  }),
  component: ResultPage,
});

const words = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
];

function ResultPage() {
  const { id } = Route.useSearch();
  const [state, setState] = useState<{ ready: boolean; r: ChallengeReflection | null }>({
    ready: false,
    r: null,
  });
  const [ai, setAi] = useState<"idle" | "loading" | "none">("idle");

  useEffect(() => {
    const all = store.getReflections();
    const r = (id && all.find((x) => x.id === id)) || all[0] || null;
    setState({ ready: true, r });
    if (r && r.observation && !r.aiReflection) {
      setAi("loading");
      generateReflection({ challengeTitle: r.challengeTitle, observation: r.observation }).then(
        (text) => {
          if (text) {
            store.updateReflection(r.id, { aiReflection: text });
            setState({ ready: true, r: { ...r, aiReflection: text } });
            setAi("idle");
          } else setAi("none");
        },
      );
    }
  }, [id]);

  const { ready, r } = state;
  return (
    <div>
      <SiteHeader />
      {!ready ? (
        <div className="h-[70vh]" />
      ) : !r ? (
        <MissingChallenge />
      ) : (
        <section className="page-x animate-fade-up">
          <div className="page-max py-16 md:py-24">
            <p className="eyebrow">Completion / Self-reported</p>
            <h1 className="display-hero mt-6">
              You stepped <em className="text-primary">out.</em>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-ink-soft">
              {words[r.actualMinutes] ?? String(r.actualMinutes)} minute
              {r.actualMinutes === 1 ? "" : "s"} away from the screen.
              {r.observation ? " One thing you might not have noticed otherwise." : ""}
            </p>

            <dl className="mt-16 grid gap-y-8 md:grid-cols-12">
              <div className="rule pt-5 md:col-span-4">
                <dt className="eyebrow">Challenge</dt>
                <dd className="display-md mt-2">{r.challengeTitle}</dd>
              </div>
              <div className="rule pt-5 md:col-span-2">
                <dt className="eyebrow">Time</dt>
                <dd className="display-md mt-2">{r.actualMinutes} min</dd>
              </div>
              <div className="rule pt-5 md:col-span-6">
                <dt className="eyebrow">Verification</dt>
                <dd className="mt-2 text-ink-soft">
                  Self-reported. StepOut trusts your word — no photo or location was checked.
                </dd>
              </div>
            </dl>

            {r.observation && (
              <blockquote className="mt-16 max-w-3xl border-l-2 border-primary pl-6 md:pl-10">
                <p className="eyebrow">What you noticed</p>
                <p className="display-md mt-3 italic">“{r.observation}”</p>
                {r.discoveries.length > 0 && (
                  <p className="eyebrow mt-4">
                    {r.discoveries.join(" · ")}
                    {r.mood ? ` · Felt ${r.mood.toLowerCase()}` : ""}
                  </p>
                )}
              </blockquote>
            )}

            {r.aiReflection && (
              <div className="mt-12 max-w-2xl">
                <p className="eyebrow">Reflection from Gemma</p>
                <p className="mt-2 text-lg">{r.aiReflection}</p>
              </div>
            )}
            {ai === "loading" && (
              <p className="eyebrow mt-12 animate-breathe">Asking Gemma for a short reflection…</p>
            )}

            <div className="rule mt-20 flex flex-wrap items-center gap-8 pt-10">
              <Link to="/create" className="btn-primary">
                Try another challenge ↗
              </Link>
              <Link to="/" className="btn-ghost">
                Back to StepOut
              </Link>
            </div>
          </div>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
