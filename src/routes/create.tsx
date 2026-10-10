import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useAiStatus } from "@/components/AiStatus";
import { generateChallenge } from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  DIFFICULTIES,
  DURATIONS,
  ENVIRONMENTS,
  ENV_LABEL,
  type Preferences,
} from "@/lib/challenges";
import { store } from "@/lib/session";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a challenge — StepOut" },
      {
        name: "description",
        content:
          "Choose a duration, place and kind of attention. StepOut shapes a small real-world challenge for you.",
      },
      { property: "og:title", content: "Create a challenge — StepOut" },
      {
        property: "og:description",
        content: "Configure a small real-world experiment in seconds.",
      },
    ],
  }),
  component: CreatePage,
});

const PHRASES = [
  "Finding something worth noticing…",
  "Putting the real world to work…",
  "Your challenge is taking shape…",
];

function Group<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <fieldset className="rule py-6">
      <legend className="eyebrow float-left mb-4 w-full">{label}</legend>
      <div role="radiogroup" className="clear-both flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={o === value}
            data-checked={o === value}
            onClick={() => onChange(o)}
            className="choice"
          >
            {format(o)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function CreatePage() {
  const navigate = useNavigate();
  const ai = useAiStatus();
  const [p, setP] = useState<Preferences>({
    durationMinutes: 5,
    environment: "neighbourhood",
    category: "notice",
    difficulty: "curious",
  });
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setPhrase((i) => (i + 1) % PHRASES.length), 1800);
    return () => clearInterval(t);
  }, [busy]);

  async function go() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const { challenge, note } = await generateChallenge(p);
    store.setChallenge(challenge);
    navigate({ to: "/challenge", search: note ? { note } : {} });
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div>
      <SiteHeader />
      <section className="page-x">
        <div className="page-max grid gap-12 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-5">
            <p className="eyebrow">Step 01 / Configure</p>
            <h1 className="display-xl mt-6">
              What kind of world are you stepping <em>into?</em>
            </h1>
            <p className="mt-6 max-w-sm text-lg text-ink-soft">
              Choose a little direction. Let the challenge surprise you.
            </p>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <Group
              label="Duration"
              value={p.durationMinutes}
              options={DURATIONS}
              onChange={(v) => setP({ ...p, durationMinutes: v })}
              format={(v) => `${v} min`}
            />
            <Group
              label="Environment"
              value={p.environment}
              options={ENVIRONMENTS}
              onChange={(v) => setP({ ...p, environment: v })}
              format={(v) => ENV_LABEL[v]}
            />
            <Group
              label="Challenge type"
              value={p.category}
              options={CATEGORIES}
              onChange={(v) => setP({ ...p, category: v })}
              format={(v) => CATEGORY_LABEL[v]}
            />
            <Group
              label="Difficulty"
              value={p.difficulty}
              options={DIFFICULTIES}
              onChange={(v) => setP({ ...p, difficulty: v })}
              format={cap}
            />
            <div className="rule flex flex-wrap items-center justify-between gap-6 pt-8">
              <button onClick={go} disabled={busy} className="btn-primary" aria-busy={busy}>
                {busy ? "Generating…" : "Generate my challenge ↗"}
              </button>
              <p className="eyebrow" aria-live="polite">
                {busy ? (
                  <span key={phrase} className="animate-fade-up inline-block">
                    {PHRASES[phrase]}
                  </span>
                ) : ai === "connected" ? (
                  "Source: Gemma"
                ) : ai === "connecting" ? (
                  "Checking Gemma…"
                ) : (
                  "Source: built-in challenge"
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
