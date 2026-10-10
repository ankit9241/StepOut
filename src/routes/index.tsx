import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import heroImg from "@/assets/hero.jpg";
import closingImg from "@/assets/closing.jpg";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { FEATURED, SAMPLE_CHALLENGE, imageFor, meta, type Challenge } from "@/lib/challenges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StepOut — Prove you're human. Step outside." },
      {
        name: "description",
        content:
          "A physical CAPTCHA. One small challenge, a few minutes in the real world — something no screen can do for you.",
      },
      { property: "og:title", content: "StepOut — Prove you're human. Step outside." },
      {
        property: "og:description",
        content: "A physical CAPTCHA: small, safe, real-world challenges instead of puzzles.",
      },
    ],
  }),
  component: Index,
});

let introPlayed = false;

function useHeroIntro(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (introPlayed || reduced) return;
    introPlayed = true;
    let ctx: { revert: () => void } | undefined;
    import("gsap").then(({ gsap }) => {
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-hero-img]", {
          clipPath: "inset(100% 0 0 0)",
          duration: 1.1,
          ease: "power4.inOut",
        })
          .from("[data-hero-line]", { yPercent: 105, duration: 0.8, stagger: 0.09 }, 0.15)
          .from("[data-hero-em]", { opacity: 0, x: -12, duration: 0.6 }, 0.6)
          .from("[data-hero-copy]", { opacity: 0, y: 14, duration: 0.6 }, 0.7)
          .from("[data-hero-cta]", { opacity: 0, y: 10, duration: 0.5 }, 0.85)
          .from("[data-hero-note]", { opacity: 0, y: -8, duration: 0.5 }, 1.0);
      }, el);
    });
    return () => ctx?.revert();
  }, [root]);
}

function Index() {
  const heroRef = useRef<HTMLElement>(null);
  useHeroIntro(heroRef);
  const [f1, f2, f3, f4, f5] = FEATURED as [Challenge, Challenge, Challenge, Challenge, Challenge];

  return (
    <div>
      <SiteHeader />

      {/* HERO */}
      <section ref={heroRef} className="page-x">
        <div className="page-max grid gap-10 pb-20 pt-8 md:grid-cols-12 md:gap-8 md:pt-14 lg:min-h-[min(86vh,860px)]">
          <div className="flex flex-col justify-between md:col-span-7">
            <p className="eyebrow">Physical verification / 001 — A different kind of human check</p>
            <h1 className="display-hero mt-10 md:mt-0">
              <span className="block overflow-hidden">
                <span data-hero-line className="block">
                  Prove you're
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-hero-line className="block">
                  human. Step
                </span>
              </span>
              <span className="block overflow-hidden pb-2">
                <span data-hero-line className="block">
                  <em data-hero-em className="inline-block text-primary">
                    outside.
                  </em>
                </span>
              </span>
            </h1>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:items-end">
              <p data-hero-copy className="max-w-sm text-lg leading-relaxed text-ink-soft">
                One small challenge. A few minutes in the real world. Something no screen can do for
                you.
              </p>
              <div data-hero-cta className="flex flex-wrap items-center gap-6">
                <Link to="/create" className="btn-primary">
                  Get a challenge ↗
                </Link>
                <Link to="/how-it-works" className="btn-ghost">
                  How it works
                </Link>
              </div>
            </div>
          </div>

          <figure className="relative md:col-span-5">
            <img
              data-hero-img
              src={heroImg}
              alt="The shadow of a leafy branch falling across a warm plaster wall and pavement"
              width={1024}
              height={1280}
              className="h-full max-h-[min(78vh,760px)] w-full object-cover"
            />
            <figcaption
              data-hero-note
              className="absolute -left-3 bottom-8 bg-background px-3 py-2 md:-left-10"
            >
              <span className="eyebrow block text-foreground">No puzzles. No bot traffic.</span>
              <span className="eyebrow block">Just real life.</span>
            </figcaption>
            <span className="eyebrow absolute right-0 top-full mt-2">Fig. 01 — Shadow, 16:42</span>
          </figure>
        </div>
      </section>

      {/* INVITATION */}
      <section className="page-x rule">
        <div className="page-max grid gap-10 py-24 md:grid-cols-12 md:py-36">
          <div className="md:col-span-5">
            <span className="numeral block">05</span>
            <p className="eyebrow mt-4">Minutes. That's all it asks.</p>
          </div>
          <div className="md:col-span-7">
            <h2 className="display-xl">
              The world is your <em>CAPTCHA.</em>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-ink-soft">
              Forget the traffic lights. Look up from the screen. Your next challenge is waiting out
              there.
            </p>
            <article className="mt-16 border-l-2 border-primary pl-6 md:pl-10">
              <p className="eyebrow">{meta(SAMPLE_CHALLENGE)} · Sample challenge</p>
              <h3 className="display-md mt-3">{SAMPLE_CHALLENGE.title}</h3>
              <p className="mt-4 max-w-xl text-ink-soft">{SAMPLE_CHALLENGE.description}</p>
              <Link
                to="/challenge"
                search={{ id: SAMPLE_CHALLENGE.id }}
                className="btn-primary mt-8"
              >
                Try this challenge ↗
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="page-x rule">
        <div className="page-max py-24 md:py-32">
          <p className="eyebrow">The method</p>
          <ol className="mt-10 grid md:grid-cols-3">
            {[
              [
                "01",
                "Get a challenge",
                "Gemma creates a small, practical task inspired by the world around you — or a built-in one if AI is offline.",
              ],
              [
                "02",
                "Leave the screen",
                "Put your phone away. Step outside. Notice something real.",
              ],
              [
                "03",
                "Come back with proof",
                "Record what happened. Your entry is honestly labelled as self-reported.",
              ],
            ].map(([n, t, d], i) => (
              <li
                key={n}
                className={`rule py-8 md:border-t-0 md:py-0 md:pr-10 ${i > 0 ? "md:border-l md:pl-10" : ""}`}
              >
                <span className="numeral block !text-foreground">{n}</span>
                <h3 className="display-md mt-6">{t}</h3>
                <p className="mt-3 max-w-xs text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURED */}
      <section className="page-x rule">
        <div className="page-max py-24 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display-lg">
              A few things <em>to notice.</em>
            </h2>
            <Link to="/create" className="btn-ghost">
              Make your own
            </Link>
          </div>
          <div className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-12">
            <Feature c={f1} className="md:col-span-7" aspect="aspect-[4/3]" />
            <Feature
              c={f2}
              className="md:col-span-4 md:col-start-9 md:mt-32"
              aspect="aspect-[3/4]"
            />
            <Feature c={f3} className="md:col-span-4" aspect="aspect-square" />
            <Feature c={f4} className="md:col-span-5 md:mt-20" aspect="aspect-[4/3]" />
            <Feature c={f5} className="md:col-span-3" aspect="aspect-[3/4]" />
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="relative">
        <img
          src={closingImg}
          alt="An empty street at dusk with a single tree under a streetlight"
          width={1600}
          height={912}
          loading="lazy"
          className="h-[80vh] w-full object-cover"
        />
        <div className="page-x absolute inset-x-0 top-0 pt-20 md:pt-28">
          <div className="page-max text-night-foreground">
            <h2 className="display-hero max-w-3xl">
              The internet can <em>wait.</em>
            </h2>
            <p className="mt-6 max-w-md text-lg opacity-85">
              There is a whole world happening outside the window.
            </p>
            <Link to="/create" className="btn-primary mt-10">
              Take five minutes ↗
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Feature({
  c,
  className,
  aspect,
}: {
  c: (typeof FEATURED)[number];
  className: string;
  aspect: string;
}) {
  return (
    <Link to="/challenge" search={{ id: c.id }} className={`group block ${className}`}>
      <div className={`overflow-hidden ${aspect}`}>
        <img
          src={imageFor(c)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.04]"
        />
      </div>
      <p className="eyebrow mt-4">{meta(c)}</p>
      <h3 className="display-md mt-2 flex items-baseline justify-between gap-4">
        {c.title}
        <span className="text-primary transition-transform group-hover:translate-x-1" aria-hidden>
          ↗
        </span>
      </h3>
      <p className="mt-2 max-w-md text-ink-soft">{c.description}</p>
    </Link>
  );
}
