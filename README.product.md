# __APP_NAME__

B2B SaaS built on a multi-tenant starter: **TanStack Start + Convex + Better
Auth + Resend + Anthropic + Tailwind v4**. Orgs, members, invitations and
roles are wired in, with an AI chat sidebar, transactional emails and
rate-limiting.

## Getting started

**Prerequisites**

- **Node 20+** (LTS recommended)
- **pnpm** — enable it once via Corepack (bundled with Node): `corepack enable`
- **git**

**1. Get the code**

```bash
git clone <your-repo-url> __APP_NAME__
cd __APP_NAME__
```

**2. Configure everything**

One interactive command. It installs dependencies (if needed), logs you into
Convex, provisions your backend, and collects your API keys:

```bash
pnpm run setup
```

> Use `pnpm run setup`, **not** `pnpm setup` — `setup` is a reserved pnpm
> built-in, so the bare form never reaches this project's script.
>
> The Convex step opens a browser to log you in and asks you to create a
> project (pick **cloud deployment**). It pushes your functions once and
> returns to the wizard automatically — no Ctrl-C needed.

It's idempotent — re-run any time, each step skips if already done.

**3. Start the app**

Run this in its own terminal — it stays in the foreground (Vite + Convex
together):

```bash
pnpm dev
```

Then open **http://localhost:3000** and create your first account. The first
user across the deployment becomes `superAdmin: true` automatically.

## Staying up to date with the starter

This project was scaffolded from the
[`albo-ouvre-boite`](https://github.com/Albo-Club/albo-ouvre-boite) starter.
To pull in non-conflicting upstream improvements later:

```bash
pnpm run upgrade-template            # merges the starter into HEAD (no auto-commit)
pnpm run upgrade-template -- --diff  # preview what would change first
```

The first run adds a `template` git remote pointing at the starter; subsequent
runs reuse it. Review the merge, resolve conflicts, then commit.

## See also

- [TESTING.md](TESTING.md) — end-to-end test plan (auth, multi-tenant, AI…).
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — pinned versions and why.
- [CLAUDE.md](CLAUDE.md) — guidelines for AI-assisted work in this repo.
