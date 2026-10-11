import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { MissingChallenge } from "@/components/Missing";
import { findBuiltin, imageFor, meta, pad2, type Challenge } from "@/lib/challenges";
import { store } from "@/lib/session";

type Search = { id?: string | undefined; note?: string | undefined };

export const Route = createFileRoute("/challenge")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
    note: typeof s["note"] === "string" ? s["note"].slice(0, 200) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mission Briefing — The Invisible Mission" },
      {
        name: "description",
        content:
          "Review your instructions and observation goal. Then lock your screen and step out.",
      },
      { property: "og:title", content: "Mission Briefing — The Invisible Mission" },
      { property: "og:description", content: "A page from your real-world field mission." },
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  const { id, note } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<{ ready: boolean; c: Challenge | null }>({
    ready: false,
    c: null,
  });

  useEffect(() => {
    if (id) {
      const b = findBuiltin(id);
      if (b) {
        const current = store.getChallenge();
        if (current?.id !== b.id) store.setChallenge(b);
        setState({ ready: true, c: b });
        return;
      }
    }
    setState({ ready: true, c: store.getChallenge() });
  }, [id]);

  return (
    <div>
      <SiteHeader />
      {!state.ready ? (
        <div className="h-[70vh]" />
      ) : !state.c ? (
        <MissingChallenge />
      ) : (
        <Briefing c={state.c} note={note} onStart={() => navigate({ to: "/go" })} />
      )}
      <SiteFooter />
    </div>
  );
}

function Briefing({
  c,
  note,
  onStart,
}: {
  c: Challenge;
  note?: string | undefined;
  onStart: () => void;
}) {
  return (
    <article className="page-x animate-fade-up">
      <div className="page-max py-12 md:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">
            The Invisible Mission · {c.category.toUpperCase()} · {c.difficulty}
          </p>
          <p className="eyebrow">
            Architect:{" "}
            <span className="text-foreground">
              {c.generationMode === "gemma" ? "Gemma" : "Built-in Mission Library"}
            </span>
          </p>
        </div>

        {note && (
          <p role="status" className="mt-4 border-l-2 border-warning pl-3 text-sm text-warning">
            {note}
          </p>
        )}

        <div className="mt-10 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="eyebrow text-primary">Estimated duration: {meta(c)}</p>
            <h1 className="display-xl mt-4">{c.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{c.description}</p>

            <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
              <p className="eyebrow !text-primary">Your Observation Goal</p>
              <p className="display-md mt-2 italic text-foreground">“{c.curiosityPrompt}”</p>
              <p className="mt-3 text-xs text-ink-soft">
                Hold this goal in mind. Do not photograph it or document it along the way. Pay
                direct attention and return to report what you saw.
              </p>
            </div>

            <ol className="mt-12">
              {c.steps.map((s, i) => (
                <li key={i} className="rule grid grid-cols-[3.5rem_1fr] items-baseline py-5">
                  <span className="font-mono text-sm text-primary">{pad2(i + 1)}</span>
                  <span className="text-lg">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="md:col-span-4 md:col-start-9 flex flex-col justify-between">
            <div>
              <img
                src={imageFor(c)}
                alt=""
                className="aspect-[3/4] w-full rounded-lg object-cover shadow-sm"
              />
              <div className="mt-8 rounded-lg bg-paper p-5 border border-border">
                <p className="eyebrow">The Disappear Moment</p>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                  When you press <em>“I'm heading out”</em>, your mission timer begins. You do not
                  need to keep this page open or carry your phone in hand. Lock your screen and
                  immerse yourself.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="eyebrow">Safety Note</p>
              <p className="mt-2 text-xs text-ink-soft">{c.safetyNote}</p>
            </div>
          </aside>
        </div>

        <div className="rule mt-16 flex flex-wrap items-center gap-8 pt-10">
          <button onClick={onStart} className="btn-primary">
            I'm heading out ↗
          </button>
          <Link to="/create" className="btn-ghost">
            Choose another mission
          </Link>
        </div>
      </div>
    </article>
  );
}
