import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useAiStatus } from "@/components/AiStatus";
import { generateChallenge } from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CONSTRAINTS,
  CONSTRAINT_LABEL,
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
      { title: "Design your Invisible Mission — StepOut" },
      {
        name: "description",
        content:
          "AI designs the experience. You lock your phone. Real life becomes the experience.",
      },
      { property: "og:title", content: "Design your Invisible Mission — StepOut" },
      {
        property: "og:description",
        content: "A tailored, phone-free mindfulness mission into the physical world.",
      },
    ],
  }),
  component: CreatePage,
});

const PHRASES = [
  "Designing your Invisible Mission…",
  "Calibrating your observation goal…",
  "Preparing instructions to step outside…",
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
    durationMinutes: 10,
    environment: "neighbourhood",
    category: "notice",
    difficulty: "curious",
    constraint: "none",
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
            <p className="eyebrow">The Invisible Mission / Step 01</p>
            <h1 className="display-xl mt-6">
              AI designs the mission. Real life becomes the <em>experience.</em>
            </h1>
            <p className="mt-6 max-w-sm text-lg text-ink-soft">
              Set a few parameters. StepOut crafts a specific, achievable mission so you can put
              your phone away.
            </p>
            <div className="mt-8 rounded-lg border border-border/80 bg-paper/60 p-4 text-xs text-ink-soft">
              <strong className="text-foreground">Phone-free promise:</strong> No photography, no
              GPS tracking, no endless checklists. You read your briefing, lock your screen, and
              step into the world.
            </div>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <Group
              label="Available Time"
              value={p.durationMinutes}
              options={DURATIONS}
              onChange={(v) => setP({ ...p, durationMinutes: v })}
              format={(v) => `${v} min`}
            />
            <Group
              label="Surroundings"
              value={p.environment}
              options={ENVIRONMENTS}
              onChange={(v) => setP({ ...p, environment: v })}
              format={(v) => ENV_LABEL[v]}
            />
            <Group
              label="Preferred Experience"
              value={p.category}
              options={CATEGORIES}
              onChange={(v) => setP({ ...p, category: v })}
              format={(v) => CATEGORY_LABEL[v]}
            />
            <Group
              label="Intensity"
              value={p.difficulty}
              options={DIFFICULTIES}
              onChange={(v) => setP({ ...p, difficulty: v })}
              format={cap}
            />
            <Group
              label="Physical & Accessibility Context (Optional)"
              value={p.constraint || "none"}
              options={CONSTRAINTS}
              onChange={(v) => setP({ ...p, constraint: v })}
              format={(v) => CONSTRAINT_LABEL[v]}
            />
            <div className="rule flex flex-wrap items-center justify-between gap-6 pt-8">
              <button onClick={go} disabled={busy} className="btn-primary" aria-busy={busy}>
                {busy ? "Designing Mission…" : "Design my mission ↗"}
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
                  "Source: built-in mission generator"
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
