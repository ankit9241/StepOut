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
      { title: "Your challenge briefing — StepOut" },
      { name: "description", content: "Read your real-world challenge, then put the screen away." },
      { property: "og:title", content: "Your challenge briefing — StepOut" },
      { property: "og:description", content: "A page from an experimental field guide." },
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
            Field guide / {c.category} · {c.difficulty}
          </p>
          <p className="eyebrow">
            Source:{" "}
            <span className="text-foreground">
              {c.generationMode === "gemma" ? "Gemma" : "Built-in challenge"}
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
            <p className="eyebrow text-primary">{meta(c)}</p>
            <h1 className="display-xl mt-4">{c.title}</h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">{c.description}</p>

            <ol className="mt-14">
              {c.steps.map((s, i) => (
                <li key={i} className="rule grid grid-cols-[3.5rem_1fr] items-baseline py-5">
                  <span className="font-mono text-sm text-primary">{pad2(i + 1)}</span>
                  <span className="text-lg">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <aside className="md:col-span-4 md:col-start-9">
            <img src={imageFor(c)} alt="" className="aspect-[3/4] w-full object-cover" />
            <p className="eyebrow mt-8">Curiosity prompt</p>
            <p className="display-md mt-3 italic">{c.curiosityPrompt}</p>
            <p className="eyebrow mt-10">Safety</p>
            <p className="mt-2 text-sm text-ink-soft">{c.safetyNote}</p>
          </aside>
        </div>

        <div className="rule mt-16 flex flex-wrap items-center gap-8 pt-10">
          <button onClick={onStart} className="btn-primary">
            I'm stepping out ↗
          </button>
          <Link to="/create" className="btn-ghost">
            Choose another
          </Link>
        </div>
      </div>
    </article>
  );
}
