# Known issues

Pinned versions, workarounds, and rough edges. Update this file as upstream
fixes land so renovate (which respects `pnpm.overrides`) can be unblocked.

## Account linking & verified email (anti-doublon)

`convex/auth.ts` requires `emailVerification` on email/password sign-up
**and** enables `account.accountLinking.enabled`. The two are coupled by
design — don't relax one without the other.

**Why coupled**: with account linking enabled, BA links two accounts when
they share an email. If email/password were untrusted (no verification),
an attacker could register `victim@example.com` with their own password,
then wait for the victim to magic-link and silently inherit access. The
`requireEmailVerification: true` requirement closes that hole: a
password account can only ever be linked once the email is verified
through a click on the link sent to that mailbox.

Defense in depth: `provisionAppUser` (`convex/lib/auth.ts`) falls back to
a lookup by `email` if the `betterAuthId` lookup misses, and re-points
the existing `users` row to the new `betterAuthId` instead of inserting
a duplicate. This heals legacy doublons as users come back in.

**Legacy users** : comptes prod créés avant ce fix ont `emailVerified:
false` côté BA. Au prochain `signIn.email`, ils seront bloqués — l'écran
`/login` affiche un bouton "Resend verification email" pour débloquer.
Pas de migration automatique.

## pnpm.overrides

### `@tanstack/react-router: 1.168.26` + `@tanstack/router-core: 1.169.2`

Two router-core versions coexisting (one pulled by `react-router`, one by
`start-client-core`) prevented `server.handlers` from being type-augmented
on `createFileRoute`. Pinning both to compatible versions resolves it.

**Unblock when**: TanStack publishes a release where `react-router` and
`react-start` agree on a single `router-core` version.

### `@tanstack/react-start: 1.167.65`

Pinned in lockstep with the router pin above.

### `better-call: 1.3.4`

`better-call@1.3.5` ships without `openapi.mjs` and `validator.mjs`,
breaking Better Auth's runtime imports. Pinned to the last working release.

**Unblock when**: a `better-call` release re-includes the missing files
(or Better Auth bumps past the regression).

## Zod v4 required for Better Auth 1.6.10

Better Auth's `better-call` subdependency uses `.meta()` on Zod schemas,
which is **v4-only**. The install warning is the only signal — runtime
errors otherwise look like opaque schema failures.

We ship `zod ^4.4.3`. If you must downgrade, also pin `better-auth` to a
release that supports zod v3.

## Resend test-mode trap

`new Resend(component, { testMode: <bool> })` defaults to `true`. We pass
`testMode: process.env.RESEND_TEST_MODE !== 'false'` so production emails
actually fly. Symptom of the wrong setting: "Test mode is enabled, but
email address is not a valid resend test address".

## macOS Finder duplicates

Any `* 2.ts` / `* 2.tsx` file (created by Finder copy/paste or "Save as"
sidebars) will be picked up by Convex AND Vite and break the build with
ambiguous module errors. After heavy file-move ops, run:

```
find . \( -path ./node_modules -o -path ./.output \) -prune -o \
  -type f \( -name '* 2.ts' -o -name '* 2.tsx' \) -print
```

## Anthropic model id

`convex/agent.ts` defaults to `claude-haiku-4-5`. Override via the
`ANTHROPIC_MODEL` Convex env var to pick a different model. Anthropic
sometimes ships dated aliases (`claude-haiku-4-5-20251001`) for stability.

## SITE_URL drift in prod = broken email links

`SITE_URL` is the Convex env var that builds every email URL (magic link,
invitation accept, change-email verification, delete-account confirm) and
feeds Better Auth's `baseURL`. If you forget to set it on the prod Convex
deployment, emails ship with `http://localhost:3000/...` links — silent
data loss until a user complains.

`convex/auth.ts` throws at boot if `APP_ENV=production` AND `SITE_URL`
matches `localhost` / `127.0.0.1`. So:

- Set `APP_ENV=development` on dev deployments (no guard, localhost is fine).
- Set `APP_ENV=production` AND a real `SITE_URL` on prod. A `convex deploy`
  with the wrong combo will fail loudly.

```bash
pnpm exec convex env set --prod APP_ENV production
pnpm exec convex env set --prod SITE_URL "https://your-domain"
```

## `vercel link` wipes `CONVEX_DEPLOYMENT` from `.env.local`

The first `pnpm dlx vercel@latest link` follows up with an interactive
"Would you like to pull environment variables now?" prompt. Saying **yes**
makes Vercel overwrite `.env.local` with **only the vars defined on
Vercel** — and since `CONVEX_DEPLOYMENT` is per-developer (never set on
Vercel), it gets stripped. Next `pnpm run setup:prod` / `convex env list`
then fails with `No CONVEX_DEPLOYMENT set`.

**Two fixes**:

- When linking the first time, answer **no** to the env pull prompt.
- If it already happened, re-run `pnpm exec convex dev` once — it
  re-binds your local repo to the existing dev deployment and rewrites
  `CONVEX_DEPLOYMENT=dev:…` into `.env.local`. **Pick the existing
  deployment**, do not let it create a new one.

Never put `CONVEX_DEPLOYMENT` on Vercel: it's a per-developer dev
binding, not a deploy target.

## Vite / Convex dev fails after partial install state

If `pnpm dev` errors with one of:
- `_gensync(...) is not a function`
- `Cannot destructure property 'isCompatTag' of 'react'`
- `esbuild failed: import_esbuild2.default.build is not a function`

…the node_modules tree is in an inconsistent state (typically after a
mid-session `pnpm dedupe` or after pnpm skipped postinstall scripts on
`esbuild`).

**Fix**:
```bash
rm -rf node_modules
pnpm install
pnpm rebuild esbuild   # ensures esbuild's native binary is fetched
```

`pnpm rebuild esbuild` is required because pnpm 10 skips lifecycle scripts
by default, so esbuild's `install.js` doesn't download the platform binary.

## Vercel framework preset traps TanStack Start

Vercel's auto-detection lands on **Vite** the moment it sees `vite.config.ts`,
and the Vite preset serves `dist/` as static files. TanStack Start + Nitro
emit the Build Output API layout in `.vercel/output/` instead — so the
preset and the actual output never meet, and every route returns 404.

Two things must both be true:

1. `vite.config.ts` loads `nitro()` from `nitro/vite` *after* `tanstackStart()`.
   Without Nitro, `pnpm build` only produces `.output/server/index.mjs`
   (generic Node server) which Vercel cannot serve.
2. `vercel.json` overrides the preset:
   ```json
   { "framework": null, "buildCommand": "pnpm build", "installCommand": "pnpm install --frozen-lockfile=false" }
   ```
   Editing the preset in the dashboard works too, but the file is the
   durable answer — survives team handoffs and project re-imports.

**Symptom**: `curl -I https://<your-domain>/` returns `HTTP/2 404` with
`server: Vercel` and a static-looking `cache-control: public, max-age=...`.

## Trade-offs vs PROJECT_BRIEF.md

Choices that diverge from the brief, with rationale. See
`/Users/benjaminbouquet/.claude/plans/glistening-puzzling-kay.md` for the full
audit.

- **Better Auth `organization()` plugin not loaded** — its tables are not Convex
  first-class (no `withIndex` joins). We mirror orgs/members/invitations in our
  own schema. Loss: `leaveOrganization`, session-level active-org, explicit
  reject/cancel invitation states.
- **AI front uses `useUIMessages` from `@convex-dev/agent/react`** instead of
  `@assistant-ui/react`. No Convex adapter exists for assistant-ui; the brief's
  pick would require ~200 lines of glue. Loss: markdown rendering, attachments,
  tool-call UI, edit/regenerate. Migrate later if polish is needed.
- **Anthropic model default `claude-haiku-4-5`** — choisi pour le ratio
  coût/latence sur un assistant in-app. Override via `ANTHROPIC_MODEL` env var
  (ex. `claude-sonnet-4-6` pour des tâches plus lourdes).
- **Rate-limit thresholds** chosen for usable defaults (e.g. invitations 20/h
  burst 5) rather than the brief's tight 3/min example.
- **Super-admin lacks impersonate** — out of scope for MVP, needs a careful
  session-signing flow.
- **Sentry only on the front-end** — Convex Dashboard logs cover errors;
  Sentry-on-Convex would need a fetch-to-envelope helper.

## Color theme picker SSR flash

The 4-theme picker (`ThemePicker.tsx`) reads `localStorage` in a `useEffect`
and applies `data-theme` to `<html>` after mount. Until then, the page
renders with the default neutral theme, which means a brief flash of color
on first paint when the user has a non-default theme saved.

`next-themes` already prevents the dark/light flash via its own pre-mount
script. The color theme is on a separate channel (data-theme attr vs class)
and doesn't get that treatment — acceptable for v1 since only the `--primary`
hue changes, not background colors.

**Fix later**: inject a synchronous `<script>` in `__root.tsx` that reads
the `app-color-theme` localStorage key and sets `data-theme` before React
hydrates. Or migrate to a cookie-based scheme so SSR can render the right
theme directly.

## react-day-picker v10 vs shadcn calendar template

`pnpm dlx shadcn@latest add calendar` generates a `calendar.tsx` whose
`classNames` map includes a `table` key, which was valid in
`react-day-picker` v9 but removed in v10. Symptom: `tsc` errors with
`'table' does not exist in type 'Partial<ClassNames>'`.

We dropped that one line. If you re-run the shadcn CLI with overwrite,
re-apply the deletion (or it will reintroduce the type error).

## Convex dev typecheck

`pnpm exec convex dev` runs its own typecheck (`--typecheck=enable`). If
that fails the deploy is rejected. Use `pnpm typecheck` separately to keep
the local feedback loop tight; the Convex check catches the same errors at
deploy time anyway.
