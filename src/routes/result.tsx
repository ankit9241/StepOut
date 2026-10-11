import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { MissingChallenge } from "@/components/Missing";
import { requestReflection } from "@/lib/api";
import { store, type ChallengeReflection } from "@/lib/session";
import { extractCleanText } from "@/lib/utils";

export const Route = createFileRoute("/result")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Field Report — The Invisible Mission" },
      {
        name: "description",
        content: "A thoughtful, personal record of your real-world mission and observations.",
      },
      { property: "og:title", content: "Field Report — The Invisible Mission" },
      {
        property: "og:description",
        content: "Real world experience, honestly recorded.",
      },
    ],
  }),
  component: ResultPage,
});

function formatFieldDate(isoDate?: string): string {
  if (!isoDate) return "Today";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function ResultPage() {
  const { id } = Route.useSearch();
  const [state, setState] = useState<{
    ready: boolean;
    r: ChallengeReflection | null;
    all: ChallengeReflection[];
  }>({
    ready: false,
    r: null,
    all: [],
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const all = store.getReflections();
    const r = (id && all.find((x) => x.id === id)) || all[0] || null;
    setState({ ready: true, r, all });

    if (r && r.observation && !r.aiInsight && !r.aiReflection) {
      setAiLoading(true);
      requestReflection({
        challengeTitle: r.challengeTitle,
        observation: r.observation,
        step: "synthesis",
        ...(r.followUpQuestion ? { followUpQuestion: r.followUpQuestion } : {}),
        ...(r.followUpAnswer ? { followUpAnswer: r.followUpAnswer } : {}),
      }).then((res) => {
        setAiLoading(false);
        if (res) {
          const patch: Partial<ChallengeReflection> = {
            aiInsight: res.insight ?? res.reflection ?? null,
            takeaway: res.takeaway ?? null,
            aiReflection: res.reflection ?? res.insight ?? null,
          };
          store.updateReflection(r.id, patch);
          setState((prev) => ({
            ...prev,
            r: prev.r ? { ...prev.r, ...patch } : null,
            all: store.getReflections(),
          }));
        }
      });
    }
  }, [id]);

  const { ready, r, all } = state;
  const activeInsight = r?.aiInsight || r?.aiReflection;

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
            {/* Field Report Header */}
            <div className="border-b border-border pb-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="eyebrow text-primary">The Invisible Mission · Field Report</p>
                <time className="eyebrow font-mono text-ink-soft">
                  {formatFieldDate(r.createdAt || r.date)}
                </time>
              </div>
              <h1 className="display-hero mt-4">
                Field Journal: <em className="text-primary">{r.challengeTitle}</em>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-ink-soft">
                You stepped away from the screen, put your phone away, and paid close attention to
                the physical world. Here is your honest record.
              </p>
            </div>

            {/* Mission Ledger / Metadata */}
            <dl className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-12">
              <div className="rule pt-4 md:col-span-4">
                <dt className="eyebrow">Duration</dt>
                <dd className="display-md mt-1">{r.actualMinutes} min</dd>
                <p className="mt-1 text-xs text-ink-soft">User-reported / elapsed timer</p>
              </div>

              <div className="rule pt-4 md:col-span-4">
                <dt className="eyebrow">Presence Verification</dt>
                <dd className="mt-2 text-sm text-ink-soft">
                  Self-reported. StepOut honors your word — no cameras, GPS tracking, or
                  surveillance.
                </dd>
              </div>

              <div className="rule pt-4 md:col-span-4">
                <dt className="eyebrow">Phone State</dt>
                <dd className="mt-2 text-sm text-ink-soft">
                  Screen locked. The world was the interface.
                </dd>
              </div>
            </dl>

            {/* Observation block */}
            {r.observation && (
              <div className="mt-14 max-w-3xl">
                <p className="eyebrow">{r.promptQuestion || "Initial Observation"}</p>
                <blockquote className="mt-3 border-l-2 border-primary pl-6 md:pl-8">
                  <p className="display-md italic text-foreground leading-relaxed">
                    “{r.observation}”
                  </p>
                </blockquote>
              </div>
            )}

            {/* Adaptive Dialogue Exchange */}
            {r.followUpQuestion && r.followUpAnswer && (
              <div className="mt-12 max-w-3xl rounded-none border-l-2 border-border pl-6 md:pl-8">
                <p className="eyebrow text-ink-soft">Adaptive Return Dialogue</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Q: {extractCleanText(r.followUpQuestion)}
                </p>
                <p className="mt-2 italic text-ink-soft">“{extractCleanText(r.followUpAnswer)}”</p>
              </div>
            )}

            {/* AI Synthesized Insight */}
            {activeInsight && (
              <div className="mt-14 max-w-2xl rounded-sm border border-border bg-background p-6 md:p-8">
                <p className="eyebrow text-primary">Grounded Insight</p>
                <p className="mt-3 text-lg leading-relaxed text-foreground">
                  {extractCleanText(activeInsight)}
                </p>
              </div>
            )}

            {aiLoading && (
              <p className="eyebrow mt-12 animate-breathe text-primary">
                Synthesizing a grounded observation note…
              </p>
            )}

            {/* Take this with you */}
            {r.takeaway && (
              <div className="mt-10 max-w-2xl border-l-2 border-primary/50 pl-6 py-2">
                <p className="eyebrow text-ink-soft">Take this with you</p>
                <p className="mt-2 text-base text-ink-soft italic">
                  {extractCleanText(r.takeaway)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="rule mt-16 flex flex-wrap items-center gap-6 pt-10">
              <Link to="/create" className="btn-primary">
                Begin another mission ↗
              </Link>
              <Link to="/" className="btn-ghost">
                Return home
              </Link>
            </div>

            {/* Field Journal Archive */}
            {all.length > 1 && (
              <div className="mt-20 border-t border-border pt-12">
                <div className="flex items-baseline justify-between">
                  <h2 className="display-md text-2xl">
                    Field Journal <em>Archive</em>
                  </h2>
                  <span className="eyebrow">{all.length} missions recorded</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  Previous real-world observations preserved in this browser.
                </p>

                <div className="mt-6 divide-y divide-border">
                  {all.map((item) => {
                    const isSelected = item.id === r.id;
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center ${
                          isSelected ? "bg-muted/30 px-3 -mx-3" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">
                              {item.challengeTitle}
                            </span>
                            {isSelected && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary font-mono">
                                Viewing
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-ink-soft italic">
                            “{item.observation}”
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-ink-soft">
                          <span>{item.actualMinutes} min</span>
                          <span>{formatFieldDate(item.createdAt || item.date)}</span>
                          {!isSelected && (
                            <Link
                              to="/result"
                              search={{ id: item.id }}
                              className="text-primary hover:underline"
                            >
                              Open ↗
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
