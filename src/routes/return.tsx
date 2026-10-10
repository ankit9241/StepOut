import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { MissingChallenge } from "@/components/Missing";
import { useActive } from "@/hooks/use-active";
import { store, uid } from "@/lib/session";

export const Route = createFileRoute("/return")({
  head: () => ({
    meta: [
      { title: "What did you find? — StepOut" },
      { name: "description", content: "Record what you noticed out there, in your own words." },
      { property: "og:title", content: "What did you find? — StepOut" },
      {
        property: "og:description",
        content: "A field-journal page for your real-world challenge.",
      },
    ],
  }),
  component: ReturnPage,
});

const TAGS = [
  "A texture",
  "A sound",
  "A colour",
  "Light or shadow",
  "Something alive",
  "Something changed",
];
const MOODS = ["Curious", "Calm", "Energised", "Grounded"];

function ReturnPage() {
  const { ready, challenge, session } = useActive();
  const navigate = useNavigate();
  const [obs, setObs] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<string | undefined>();
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (session) setMinutes(String(Math.max(1, Math.round(session.elapsedSeconds / 60))));
  }, [session]);

  if (!ready) return <div className="min-h-screen" />;
  if (!challenge || !session)
    return (
      <>
        <SiteHeader />
        <MissingChallenge />
      </>
    );

  function save(skip: boolean) {
    if (saving.current || !challenge || !session) return;
    const m = Number(minutes);
    if (!skip) {
      if (obs.trim().length < 3)
        return setError("Add a few words about what you noticed — or skip the reflection.");
      if (!Number.isFinite(m) || m < 0 || m > 600)
        return setError("Time outside should be between 0 and 600 minutes.");
    }
    saving.current = true;
    const id = uid("r");
    store.addReflection({
      id,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      sessionId: session.id,
      observation: skip ? "" : obs.trim().slice(0, 1000),
      discoveries: skip ? [] : tags,
      mood: skip ? undefined : mood,
      actualMinutes: Number.isFinite(m) ? m : Math.round(session.elapsedSeconds / 60),
      evidenceStatus: "none",
      verificationMethod: "self_report",
      createdAt: new Date().toISOString(),
    });
    navigate({ to: "/result", search: { id } });
  }

  const toggle = (t: string) =>
    setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  return (
    <div className="bg-paper min-h-screen">
      <SiteHeader />
      <section className="page-x">
        <div className="page-max grid gap-12 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-5">
            <p className="eyebrow">Field journal / {challenge.title}</p>
            <h1 className="display-xl mt-6">
              What did you find out <em>there?</em>
            </h1>
            <p className="mt-6 max-w-sm text-lg text-ink-soft">
              It doesn't need to be extraordinary. Just tell us what actually happened.
            </p>
          </div>

          <form
            className="md:col-span-6 md:col-start-7"
            onSubmit={(e) => {
              e.preventDefault();
              save(false);
            }}
            noValidate
          >
            <label className="block">
              <span className="eyebrow">01 — What did you notice?</span>
              <textarea
                value={obs}
                onChange={(e) => {
                  setObs(e.target.value);
                  setError(null);
                }}
                rows={4}
                maxLength={1000}
                className="field mt-3 resize-none"
                placeholder="A crack in the step with a tiny flower growing through it…"
                aria-invalid={!!error}
                aria-describedby={error ? "obs-err" : undefined}
              />
            </label>

            <fieldset className="mt-10">
              <legend className="eyebrow">02 — What stood out? (optional)</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    aria-pressed={tags.includes(t)}
                    data-checked={tags.includes(t)}
                    onClick={() => toggle(t)}
                    className="choice"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-10">
              <legend className="eyebrow">03 — How did it feel? (optional)</legend>
              <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    role="radio"
                    aria-checked={mood === m}
                    data-checked={mood === m}
                    onClick={() => setMood(mood === m ? undefined : m)}
                    className="choice"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-10 block max-w-[12rem]">
              <span className="eyebrow">04 — Time outside (min)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="field mt-3"
              />
            </label>

            <p className="mt-10 text-sm text-muted-foreground">
              Photo evidence isn't collected in this version. Your entry is saved on this device and
              marked as self-reported.
            </p>

            {error && (
              <p id="obs-err" role="alert" className="mt-6 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="rule mt-10 flex flex-wrap items-center gap-8 pt-8">
              <button type="submit" className="btn-primary">
                Save and continue ↗
              </button>
              <button type="button" onClick={() => save(true)} className="btn-ghost">
                Skip reflection
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
