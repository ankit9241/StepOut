import { Link } from "@tanstack/react-router";

export function MissingChallenge() {
  return (
    <section className="page-x">
      <div className="page-max py-28">
        <p className="eyebrow">No active challenge</p>
        <h1 className="display-xl mt-4 max-w-3xl">
          There's nothing in progress — <em>yet.</em>
        </h1>
        <p className="mt-6 max-w-md text-ink-soft">
          Pick a challenge to begin a fresh walk away from the screen.
        </p>
        <Link to="/create" className="btn-primary mt-10">
          Get a challenge ↗
        </Link>
      </div>
    </section>
  );
}
