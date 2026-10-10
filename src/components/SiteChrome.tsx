import { Link } from "@tanstack/react-router";
import { AiStatusBadge } from "./AiStatus";

export function Wordmark() {
  return (
    <Link to="/" className="flex items-baseline gap-1.5" aria-label="StepOut home">
      <span className="font-display text-[1.65rem] leading-none">Step</span>
      <span className="font-display text-[1.65rem] italic leading-none text-primary">out</span>
      <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="page-x">
      <div className="page-max flex items-center justify-between py-5">
        <Wordmark />
        <nav className="flex items-center gap-5 md:gap-8 text-sm">
          <Link to="/how-it-works" className="link-underline hidden sm:inline">
            How it works
          </Link>
          <span className="hidden md:inline">
            <AiStatusBadge />
          </span>
          <Link to="/create" className="btn-primary !px-4 !py-2.5 !text-sm">
            Try a challenge
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="page-x rule mt-24">
      <div className="page-max flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-6 text-sm text-ink-soft">
          <Link to="/how-it-works" className="link-underline">
            How it works
          </Link>
          <Link to="/how-it-works" hash="privacy" className="link-underline">
            Privacy
          </Link>
          <AiStatusBadge />
          <span className="eyebrow">Week 1 DevProject</span>
        </div>
      </div>
    </footer>
  );
}
