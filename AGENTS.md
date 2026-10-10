<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- StepOut state (active challenge, timer session, reflections) lives in localStorage via `src/lib/session.ts`; components never touch storage directly — single place to handle corrupt data.
- Gemma runs on an external backend reached through `src/lib/api.ts` using `VITE_API_URL`; every call falls back to the deterministic built-in generator and labels its true source.
- The challenge timer is timestamp-based (pure functions in session.ts), never tick-accumulated.
