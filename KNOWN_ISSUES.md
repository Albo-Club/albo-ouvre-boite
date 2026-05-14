# Known issues

Pinned versions, workarounds, and rough edges. Update this file as upstream
fixes land so renovate (which respects `pnpm.overrides`) can be unblocked.

## Account linking & verified email (anti-doublon)

### What went wrong (the trap)

Initial config in `convex/auth.ts` had:
- `emailAndPassword.requireEmailVerification: false` — password sign-up
  produced an **untrusted** BA account (BA can't confirm the user owns
  the mailbox).
- `magicLink` plugin — produced a **trusted** account on first click.
- **No `account.accountLinking`** — BA's default is `enabled: false`.

When a single human signed up via `/register` (password) then later
clicked a magic link with the same email, BA created **two distinct BA
users** (different `betterAuthId`). Our `provisionAppUser` then inserted
**two `users` rows** into Convex with the same email, because it
dedup'd only by `betterAuthId`.

Result : prod had two duplicate `users` rows for one human.

### The rule (anti-récidive)

**Before adding or modifying any auth method in `convex/auth.ts`**, check
all three :

1. **All enabled methods must be trusted.** A method is trusted when BA
   marks `emailVerified: true` after the first sign-in. Sources of
   trust : magic link, OAuth (Google/GitHub/…), or email/password with
   `requireEmailVerification: true`. **Never enable email/password with
   verification off if any other method is enabled.**
2. **`account.accountLinking.enabled: true` in `createAuth(...)`.**
   Without it, two trusted methods with the same email still produce
   two BA users. With it, BA auto-links on the second sign-in.
3. **Convex-side dedup**: `provisionAppUser` in `convex/lib/auth.ts`
   already falls back from `betterAuthId` lookup to email lookup, and
   re-points the existing row's `betterAuthId` instead of inserting.
   If you ever write a new "create app user" code path, copy that
   pattern — don't dedup on `betterAuthId` alone.
4. **Magic link must not auto-sign-up**:
   `magicLink({ disableSignUp: true })` is mandatory. Our only legit
   entry point is `/register` (password + verification). Without it,
   any random email gets a verified BA account on first link click,
   bypassing the `/register` flow and leaving password-less accounts
   that later 500 on `signIn.email`.

### Security coupling

Conditions (1) and (2) are coupled. If you enable account linking but
let one method stay untrusted, an attacker can register
`victim@example.com` with their own password (no verification needed),
wait for the victim to OAuth/magic-link with the same email, and BA
will silently link the attacker's password account to the victim's
session → account takeover.

Verified email closes the hole : the attacker's password account stays
unverified, so BA refuses to link it.

### Legacy users

Comptes prod créés avant ce fix ont `emailVerified: false` côté BA. Au
prochain `signIn.email`, ils seront bloqués — l'écran `/login` détecte
`EMAIL_NOT_VERIFIED` et propose "Resend verification email" pour
débloquer. Pas de migration automatique.

Pour les doublons `users` déjà créés en prod, `provisionAppUser` les
convergera vers une seule rangée au prochain login du user, mais le
second BA user reste en base. Cleanup manuel via dashboard Convex.

## Auth hardening (Phase 0)

### `sendChangeEmailConfirmation`, pas `sendChangeEmailVerification`

The handler that fires on **email-change** lives under
`user.changeEmail.sendChangeEmailConfirmation` in Better Auth (verified
in `node_modules/better-auth/dist/api/routes/update-user.mjs:427`). An
earlier revision used `sendChangeEmailVerification`, which **does not
exist** — BA silently swallowed the callback and only sent the
verification email to the *new* address. A hijacked session could
change the email to attacker@evil.com without the legitimate owner of
the current inbox ever being notified.

Rule: if you rename or relocate the change-email handler, grep BA
source for the exact key BA reads (`ctx.context.options.user.changeEmail.<…>`)
and match it byte-for-byte. The TypeScript types here are permissive
(extra keys are accepted), so a typo compiles but ships broken.

### Anti-enumeration on `/register`

When a signup hits `USER_ALREADY_EXISTS`, the UI renders the *exact
same* "Check your inbox" screen as a successful new signup
(`src/routes/register.tsx`). No verification email is actually sent in
the duplicate case — BA aborts at 422. An attacker can no longer
enumerate registered emails by watching the signup response.

Trade-off : a legit user who signs up twice (e.g. forgot they already
have an account) gets the success screen but no email, then bounces.
The "try a different email" link on that screen and the
`/forgot-password` flow are the recovery paths. Accepted cost for
closing the enumeration leak — same pattern shipped by Linear and
Stripe.

### Cookie attributes are explicit, secure flag is APP_ENV-gated

`convex/auth.ts` pins:

```
advanced: {
  useSecureCookies: APP_ENV === 'production',
  cookiePrefix: 'albo',
  defaultCookieAttributes: { sameSite: 'lax', secure: APP_ENV === 'production', httpOnly: true },
}
```

`secure: true` is required in prod but breaks local dev over plain
`http://localhost` (the cookie is set but the browser refuses to send
it back). The `APP_ENV === 'production'` check keeps localhost working
in dev while forcing the flag everywhere else. If you ever spin up a
staging deploy, set `APP_ENV=production` so the cookie hardening
applies — same trap as the `SITE_URL` guard below.

### Per-endpoint rate-limit storage

BA's built-in `rateLimit` block with `storage: 'database'` is wired
into the Convex adapter — no separate component to install. BA writes
to an auto-created `rateLimit` table on the BA-side schema. We rely
on it for `/sign-in/email`, `/sign-up/email`, `/forgot-password`,
`/reset-password`, `/sign-in/magic-link`, `/email-verification/send`,
`/change-email`, `/change-password`, `/delete-user`.

`convex/rateLimiters.ts` (the `@convex-dev/rate-limiter` component) is
*separate* — it covers application-level limits (invitations, chat,
email-send wrappers). Do not confuse the two : BA's limiter is on the
auth HTTP edge, ours is on Convex mutations/actions.

### Password policy (Phase 1)

- BA: `minPasswordLength: 12`, `maxPasswordLength: 128`.
- Zod schemas in `/register`, `/reset-password`, `/me` mirror the
  minimum. Both layers must agree — if you tighten the Convex side,
  bump the Zod min in the same commit or signup passes client
  validation and 400s on submit.
- HIBP k-anonymity check on every new-password field (`onBlurAsync`
  validator). `src/lib/hibp.ts` soft-fails on network errors so an
  outage at api.pwnedpasswords.com doesn't block signups; the
  server-side minimum still applies.
- zxcvbn-ts strength meter is indicative, not blocking. The wordlist
  is ~1.2 MB but lazy-loaded only when a password field mounts.

### eslint must be a direct devDependency

`eslint.config.mjs` does `import { defineConfig } from 'eslint/config'`,
which requires `eslint` to be resolvable from the project root. pnpm
10's strict isolation does not hoist transitive devDeps, so without
`"eslint": "^10"` in `devDependencies` the lint script fails with
`Cannot find package 'eslint'`.

This was silently broken before Phase 1 (the `| tail -40` wrapper in
the lint script swallowed the failing exit code). Adding `eslint` to
`devDependencies` fixes the run; it also surfaces ~240 pre-existing
lint errors (`sort-imports`, `import/order`, `@typescript-eslint/array-type`)
across non-auth routes that pre-date Phase 0/1 and want a separate
cleanup PR. The new Phase 1 files (`hibp.ts`, `auth-errors.ts`,
`password-input.tsx`, `password-strength.tsx`) lint clean.

## Production deploy is wired into the Vercel build

`vercel.json` runs `npx convex deploy --cmd 'pnpm build'`, so every
`main` push that lands on Vercel **also** deploys Convex functions and
schema in lockstep. You should never run `pnpm exec convex deploy --prod`
by hand for a normal release — the Vercel deployment is the source of
truth.

**Required Vercel env vars** (set in Project Settings → Environment
Variables, scoped to **Production** only) :

- `CONVEX_DEPLOY_KEY` — generated from the Convex dashboard
  (Project → Settings → URL & Deploy Key → "Generate Production Deploy
  Key"). Vercel forwards it to the build step ; the Convex CLI uses it
  to push functions/schema to the prod deployment.

The shell guard in `package.json` → `build:vercel` requires **both**
`VERCEL=1` (auto-set by Vercel) and `CONVEX_DEPLOY_KEY` before running
`convex deploy`. Falls back to plain `pnpm build` otherwise. Effects :

- Preview deployments without a Convex preview key → frontend builds
  but runs against the current prod Convex backend. Fine for read-only
  UI changes ; **never ship preview deploys that depend on
  un-deployed schema/function changes**. If you need preview-isolated
  Convex, generate a Preview Deploy Key in the Convex dashboard and
  add `CONVEX_DEPLOY_KEY` scoped to Preview in Vercel.
- Local `pnpm build:vercel` → `$VERCEL` is empty, so the script
  always skips `convex deploy` even if a dev happens to have a deploy
  key in their shell env. Safe to run locally for build smoke-tests.

**When you DO need the manual command** :
- Local dev (`pnpm exec convex dev` — different command, runs the dev
  deployment with hot reload).
- Emergency hotfix where Vercel is broken : `pnpm exec convex deploy
  --prod` works but is a footgun (frontend still pointing at old
  code). Prefer reverting the bad commit and letting Vercel redeploy.

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

## Leaflet (and any `window`-touching lib) needs client-only mount

`react-leaflet` and the `leaflet/dist/leaflet.css` import both reference
`window` at module load time. TanStack Start renders routes on the server
by default — importing them at the top of a route file crashes SSR with
`ReferenceError: window is not defined`.

**Pattern** used in `src/routes/app/$orgSlug/map.tsx` :

```tsx
function LocationsMap() {
  const [mods, setMods] = useState<LeafletModules | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'), // side-effect, client-only
    ]).then(([rl, L]) => {
      if (cancelled) return
      setMods({ MapContainer: rl.MapContainer, /* … */ divIcon: L.divIcon })
    })
    return () => { cancelled = true }
  }, [])

  if (!mods) return <Skeleton />
  return <mods.MapContainer>…</mods.MapContainer>
}
```

Two non-obvious points :

1. **Custom `divIcon` markers, not the default Leaflet icon.** The default
   `L.Icon.Default` ships PNGs whose URLs assume `/marker-icon.png` at the
   site root — bundlers (Vite included) don't rewrite those paths, so pins
   render as broken-image placeholders. `divIcon({ html: '<span …/>' })`
   sidesteps the whole thing and lets us color-code by status.
2. **The Popup uses inline HTML/`style={{…}}`, not Tailwind classes.**
   Leaflet's `<Popup>` renders its content outside the React tree (into a
   Leaflet-controlled DOM node), so Tailwind utility classes inside it get
   applied but the popup container itself ignores theme switching. Inline
   styles with explicit hex are the safe baseline. If you ever need
   theme-aware popups, read `STATUS_COLOR` from `data-theme` instead.

Same pattern applies to any future browser-only library (Chart.js,
Mermaid, Three.js, etc.) on TanStack Start.

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

## Post-event notification coverage

`notifications.notifyPasswordChanged` fires from the client right after
`authClient.changePassword()` succeeds on `/app/me`. **It does NOT fire on
the `/forgot-password` → `/reset-password` flow** because that path runs
server-side inside Better Auth and we don't have a clean hook (BA exposes
`sendResetPassword` for sending the *link*, not a post-reset callback). The
existing `revokeSessionsOnPasswordReset: true` covers the takeover-mitigation
side (all sessions revoked, user must re-auth) so a hijacker is locked out;
the missing piece is the *informational* email to the rightful owner.

Two paths if/when this matters:
1. Add `databaseHooks.account.update.after(account)` in `convex/auth.ts` and
   gate on `providerId === 'credential'`. Risk: BA's `databaseHooks` type
   surface is heavy and may trigger the TS inference cycle that CLAUDE.md
   anti-pattern flags. Try in isolation.
2. Add a thin wrapper around `authClient.resetPassword()` that, on success,
   POSTs to a public Convex mutation. Symmetric to the `/me` pattern but
   needs the user's email — derivable from the JWT BA sets on the response,
   or by passing it through the reset-password page state.

**NewDeviceEmail** is not implemented for the same scoping reason: detecting
"new device" requires storing UA fingerprints in our schema (BA's component
tables aren't queryable from `ctx.db` directly). Tracked as Phase 3 work
behind a dedicated PR — needs a `deviceFingerprints` table + a session-create
hook + an action to send the email.
