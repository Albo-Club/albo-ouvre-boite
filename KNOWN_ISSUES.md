# Known issues

Pinned versions, workarounds, and rough edges. Update this file as upstream
fixes land so renovate (which respects `pnpm.overrides`) can be unblocked.

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

`convex/agent.ts` defaults to `claude-sonnet-4-5`. Override via the
`ANTHROPIC_MODEL` Convex env var to pick a different model. Anthropic
sometimes ships dated aliases (`claude-sonnet-4-5-20251022`) for stability.

## Vite dev fails with `_gensync(...) is not a function`

Under Node 22 + `@babel/core@7.29.0`, the CJS-ESM interop loading of
`gensync@1.0.0-beta.2` (transitive via `@vitejs/plugin-react`) intermittently
yields a module shape that babel's `gensync-utils/async.js` cannot call. Pure
dev-time failure — production builds and Convex dev are unaffected.

**Workaround**: `pnpm dedupe` or `pnpm install --force`. If that fails, downgrade
to Node 20.x for local dev. Tracking upstream babel / gensync.

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
- **Anthropic model default `claude-sonnet-4-5`** (brief asked `4-6`). Override
  via `ANTHROPIC_MODEL` env var.
- **Rate-limit thresholds** chosen for usable defaults (e.g. invitations 20/h
  burst 5) rather than the brief's tight 3/min example.
- **Super-admin lacks impersonate** — out of scope for MVP, needs a careful
  session-signing flow.
- **Sentry only on the front-end** — Convex Dashboard logs cover errors;
  Sentry-on-Convex would need a fetch-to-envelope helper.

## Convex dev typecheck

`pnpm exec convex dev` runs its own typecheck (`--typecheck=enable`). If
that fails the deploy is rejected. Use `pnpm typecheck` separately to keep
the local feedback loop tight; the Convex check catches the same errors at
deploy time anyway.
