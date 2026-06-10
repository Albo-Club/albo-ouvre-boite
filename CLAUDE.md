# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Keep the Docs and Skills Fresh

**Tidy-room rule** : every doc line earns its keep, every fact lives in exactly
one file. Surface non-obvious knowledge ; drift kills future you.

### Pre-PR doc audit (run it yourself, every PR, without being prompted)

Before pushing the final commit, walk through these four questions. If none
fire, write nothing — the diff and commit message already document the *what*.
Docs are for the *why* and the *trap*.

1. **Touched a route, page, env var, or workflow listed in `TESTING.md`** ?
   → update the matching row in the same PR.
2. **Hit a non-obvious gotcha that'd cost the next dev > 30 min** (SSR trap,
   pinned version, bundler quirk, API edge case) ? → add a section to
   `KNOWN_ISSUES.md`. Include the *why* and the workaround pattern.
3. **Found a stale claim while reading existing docs** (file path that no
   longer exists, flag that was renamed, API that changed) ? → fix it in the
   same commit as the change that made it stale.
4. **Discovered a behavioral rule worth applying to every future PR** ? → add
   it here in `CLAUDE.md`. Only for *repeatable* guidance, never as a
   changelog of what shipped.

### Where things live (don't duplicate across files)

- `README.md` — how to use, quickstart, public-facing onboarding.
- `TESTING.md` — manual + automated validation steps, organized per route /
  feature. Update when adding or changing a verifiable surface.
- `KNOWN_ISSUES.md` — traps, pinned versions, SSR/bundler/browser gotchas,
  "we tried X, here's why we chose Y". One section per trap.
- `CLAUDE.md` — repeatable behavioral rules for future agents. Never a
  changelog of completed work.
- `AGENTS.md` — pointer to the agent-skill workflow. Static, rarely changes.

If you're about to add the same info to two of these files, you're doing it
wrong — link, don't duplicate.

### Skills

`.agents/skills/` is pulled from upstream — never edit in place
(`pnpm run sync:skills` overwrites). When upstream is wrong or missing,
override here via `CLAUDE.md` / `KNOWN_ISSUES.md`. When
`pnpm run sync:skills:check` reports drift, read the new SKILL.md and
update project overrides if needed — don't mute the check.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project-specific guide

## Language

All code-related content must be written in English: source code comments,
skill files, `CLAUDE.md`, `TESTING.md`, `KNOWN_ISSUES.md`, inline
documentation, error messages visible to developers, log strings, and any
other developer-facing text. The only exceptions are user-facing copy in
`src/locales/fr/` and bilingual email templates in `convex/emailTemplates.ts`.

## End-to-end test plan

Before forking the template into a prod project, run through `TESTING.md`
(levels 1 → 6, ~70 min). Level 1 is automated (`pnpm typecheck`,
`pnpm lint`, `pnpm build`, `pnpm test:smoke`, `pnpm sync:skills:check`);
the rest is manual — a sign-off checklist to validate auth, multi-tenant,
invitations, items CRUD, uploads, account lifecycle, super-admin, AI chat,
security.

## Stack

- **Frontend** : React 19 + TypeScript strict, TanStack Start v1 (Node server target), TanStack Router (file-based, `src/routes/`), TanStack Query, TanStack Form + Zod, Vite.
- **Styling** : Tailwind CSS v4 (CSS-first, no `tailwind.config.js`), shadcn/ui (neutral theme, `src/components/ui/`), Inter, radius `0.5rem`, tokens in `src/styles/brand.css` (oklch).
- **Backend** : Convex (`^1.x`) — queries, mutations, actions, HTTP routes, file storage, components.
- **Auth** : Better Auth via `@convex-dev/better-auth` with `magicLink()` + `convex()`. Multi-tenant (orgs/members/invitations/roles) is implemented **natively in the Convex schema** (`organizations`, `organizationMembers`, `invitations` tables). The BA `organization()` plugin is deliberately **not loaded** — its tables aren't first-class Convex (no `withIndex` joins). See `KNOWN_ISSUES.md` for trade-offs.
- **Emails** : `@convex-dev/resend` for transactional.
- **AI** : `@convex-dev/agent` backend (default model `claude-haiku-4-5`, override via `ANTHROPIC_MODEL`) + `@assistant-ui/react` front + streaming HTTP route `/api/chat`. Provider abstracted via `getModel()` in `convex/agent.ts`. The chat agent ships with **DB-acting tools** (`convex/agentTools.ts`) scoped to the thread's org: list/create/update/delete `items`.
- **File storage** : Convex native (`ctx.storage.generateUploadUrl()`), 20 MB cap.
- **Observability** : Sentry (front + Convex actions). CORS strict, security headers, HMAC verify on webhooks.

## Skills (READ BEFORE CODING)

**Required**: before writing or modifying any code touching one of the
domains below, read the corresponding skill in `.agents/skills/`
(symlinked at `.claude/skills/`). It supersedes your training knowledge,
which is stale for these libraries.

Manifest: `skills-lock.json` (source, upstream path, SHA-256 hash).
Drift detected in CI (job `skills-drift` in `.github/workflows/ci.yml`);
remediation: `pnpm run sync:skills` + review the diff + commit.
Verify locally: `pnpm run sync:skills:check`.

| Skill                                     | Domain                                 | Upstream source                            | Official?  |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------ | ---------- |
| `convex`                                  | Convex skill router                    | `get-convex/agent-skills`                  | ✅ official |
| `convex-quickstart`                       | Convex bootstrap                       | `get-convex/agent-skills`                  | ✅ official |
| `convex-setup-auth`                       | Convex auth + identity + RBAC          | `get-convex/agent-skills`                  | ✅ official |
| `convex-create-component`                 | Building a Convex component            | `get-convex/agent-skills`                  | ✅ official |
| `convex-migration-helper`                 | Schema / data migrations               | `get-convex/agent-skills`                  | ✅ official |
| `convex-performance-audit`                | Perf audit reads/subscriptions/OCC     | `get-convex/agent-skills`                  | ✅ official |
| `better-auth-best-practices`              | General Better Auth config             | `better-auth/skills`                       | ✅ official |
| `better-auth-security-best-practices`     | Hardening (rate-limit, CSRF, sessions) | `better-auth/skills`                       | ✅ official |
| `email-and-password-best-practices`       | Email/password BA                      | `better-auth/skills`                       | ✅ official |
| `two-factor-authentication-best-practices`| 2FA / TOTP / backup codes              | `better-auth/skills`                       | ✅ official |
| `organization-best-practices`             | BA `organization()` plugin             | `better-auth/skills`                       | ✅ official ⚠️ |
| `create-auth-skill`                       | Auth BA scaffolding                    | `better-auth/skills`                       | ✅ official |
| `tanstack-start-best-practices`           | SSR, server functions, middleware      | `deckardger/tanstack-agent-skills`         | ⚠️ community |

**⚠️ `organization-best-practices`**: official BA skill, but the
`organization()` plugin is **disabled** in this project (see `KNOWN_ISSUES.md`).
Read it to understand the concepts; don't apply the BA code as-is —
our orgs/members live in the custom Convex schema.

**⚠️ TanStack Start (`deckardger/tanstack-agent-skills`)**: TanStack does not
(yet) publish an official skill. The best community source is the Deckardger
repo. Maintenance strategy:
1. Check the upstream repo every 1–2 months (the weekly sync detects drift).
2. If quality degrades or TanStack publishes an official repo, update
   `source` + `skillPath` in `skills-lock.json` and re-run `pnpm run sync:skills`.
3. As a fallback, use the `context7` MCP (`mcp__…__query-docs`) for
   `/tanstack/start` on demand.

**shadcn/ui**: no agent skill yet. Conventions live in `components.json`
(alias `@/components`, neutral theme, radius 0.5rem, oklch tokens in
`src/styles/brand.css`). To generate/update a component, use the CLI
`pnpm dlx shadcn@latest add <component>` or the shadcn MCP if configured.
NEVER modify `src/components/ui/*` by hand to restyle — go through CSS tokens.

**Better Auth UI** (`better-auth-ui.com`, `daveyplate/better-auth-ui`,
shadcn registry, v1.6.x, active): unofficial drop-in kit for Better Auth that
ships `<SignIn>`, `<SignUp>`, `<ForgotPassword>`, `<ResetPassword>`,
`<SignOut>`, `<Settings>`, `<AccountSettings>`, `<ChangeEmail>`,
`<ChangePassword>`, `<SecuritySettings>`, `<ActiveSessions>`,
`<LinkedAccounts>`, `<UserButton>`, `<UserAvatar>`, plus React hooks
(`useSession`, `useListSessions`, `useChangePassword`, …) and email templates
(`<EmailVerificationEmail>`, `<MagicLinkEmail>`, `<PasswordChangedEmail>`,
`<NewDeviceEmail>`, …). Install via `pnpm dlx shadcn@latest add
https://better-auth-ui.com/r/auth.json`. Full inventory:
`better-auth-ui.com/llms.txt`.

**When to consult**: new projects or new auth surfaces (passkey, multi-session,
OAuth providers, OTP, active sessions, captcha). Do **not** retroactively
migrate `/login`, `/register`, `/forgot-password`, `/reset-password`: we
already have custom code on top (anti-enum, error classifier, HIBP, zxcvbn
meter, FieldDescription, inline alert) that the kit doesn't cover. For
**gaps** identified vs Better Auth UI (active sessions, post-event
notifications, linked accounts), evaluate case by case whether to adopt the
drop-in components or roll our own to stay consistent with the rest of the
project.

**Project-specific Convex guidelines**: `convex/_generated/ai/guidelines.md`
(regenerated by `convex dev`). Required reading before non-trivial Convex
patterns — it overrides everything, including upstream skills.

## Routing conventions

- Imports from `@tanstack/react-router`, never `react-router-dom`.
- No trailing slash in paths.
- Every route with a loader must define `errorComponent` AND `notFoundComponent`.
- Shareable routes must have their own `head()` with title, description, og:\*.
- Anchors `#section` only for intra-page (TOC, long FAQ).
- Naming convention: flat with dots (`posts.$postId.tsx`).

## Server functions vs Convex

- **Live data (read/write DB)** → `useQuery(api.foo.bar)` / `useMutation(api.foo.create)` client-side (Convex real-time auto).
- **Server business logic + LLM calls** → Convex `action` with `"use node"` if Node-only deps.
- **Transactional email** → Convex `action` + `@convex-dev/resend`.
- **Incoming webhook** → Convex HTTP route in `convex/http.ts`.
- **Auth proxy** → `createServerFn` or TanStack route `server.handlers`.
- **Read a secret + complex logic** → `createServerFn`.

## Multi-tenant recipes

### Query data scoped to an org

```ts
// convex/items.ts
export const list = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    const user = await requireAppUser(ctx)
    await requireOrgMember(ctx, { orgId, userId: user._id })
    return ctx.db
      .query('items')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()
  },
})
```

### Mutation with role check

```ts
export const remove = mutation({
  args: { itemId: v.id('items') },
  handler: async (ctx, { itemId }) => {
    const user = await requireAppUser(ctx)
    const item = await ctx.db.get(itemId)
    if (!item) throw new ConvexError('not_found')
    await requireOrgRole(ctx, {
      orgId: item.orgId,
      userId: user._id,
      minRole: 'admin',
    })
    await ctx.db.delete(itemId)
  },
})
```

### Protect a route by org membership

`/app/$orgSlug/route.tsx` :

- Auth guard (redirect `/login` if no session).
- Resolve `orgSlug` → `orgId` via Convex.
- Check membership; otherwise redirect `/app`.
- Store `orgId` in child router context.

## Anti-patterns

- ❌ `process.env.X` at top-level of a file imported client-side.
- ❌ `VITE_` prefix on a secret.
- ❌ DB / secret key directly in a `loader` (loaders are isomorphic).
- ❌ `react-router-dom` instead of `@tanstack/react-router`.
- ❌ Hard-coded color in `className`.
- ❌ User role stored on BA user table (use `users.superAdmin` or `organizationMembers.role`).
- ❌ Role check via `localStorage`.
- ❌ `await prefetchQuery(...)` (blocks navigation).
- ❌ `QueryClient` as module-level singleton.
- ❌ `ConvexReactClient` recreated each render.
- ❌ Loading BA plugin `admin()` (breaks signup validator).
- ❌ Inline BA triggers (TS inference cycle with `internal.users.*`).
- ❌ Enabling a new BA auth method without checking **both** conditions:
  (1) the method produces a verified email on first use (magic link,
  OAuth, or email/password with `requireEmailVerification: true`), and
  (2) `account.accountLinking.enabled: true` is set in `createAuth`.
  Skipping either creates duplicate BA users — and therefore duplicate
  Convex `users` rows — for the same email. See `KNOWN_ISSUES.md`
  "Account linking & verified email".
- ❌ Dedup users by `betterAuthId` only in any new code path. Always
  also fall back to email via `withIndex('by_email', ...)` — pattern in
  `convex/lib/auth.ts:provisionAppUser`.
- ❌ Surfacing Better Auth errors via `error.message` (or worse, a regex
  on it) in any new client code. Always classify through
  `classifyAuthError()` + `formatAuthError(code, ctx)` from
  `src/lib/auth-errors.ts`. Reason: BA codes are granular (USER_NOT_FOUND
  vs INVALID_PASSWORD vs INVALID_EMAIL_OR_PASSWORD) and surfacing them raw
  leaks enumeration. Raw `error.message` is also locale-fragile and may
  change between BA versions. The classifier collapses safe equivalence
  classes and centralises the user-facing copy.
- ❌ Anchor `#section` for nav between major sections.
- ❌ Unrequested dark/light toggle.
- ❌ `tailwind.config.js` (Tailwind v4 is CSS-first).
- ❌ Editing `routeTree.gen.ts` or `convex/_generated/*` manually.
- ❌ Hardcoding a user-facing string anywhere (UI **or** transactional
  email). All user-facing copy goes through i18n: `t()` from react-i18next
  with namespaced keys in `src/locales/{en,fr}/<ns>.json`, or the bilingual
  templates in `convex/emailTemplates.ts`. **Dev-facing** strings stay in
  English and are never translated: internal error codes
  (`ConvexError('not_found')`, `AuthErrorCode` values), logs, comments,
  i18n key names. New strings need both an `en` and a `fr` entry. See
  `KNOWN_ISSUES.md` "i18n (react-i18next) SSR" for the no-flash rules.
- ❌ Module-level Zod schema carrying a hardcoded user-facing message. Build
  the schema inside the component via `useMemo(() => z.object({...}), [t])`
  so messages resolve from the `validation` namespace.
- ❌ A hardcoded page `<title>` in a route `head()`. `head()` runs outside
  React — resolve titles with
  `getI18n(getLocale()).getFixedT(null, '<ns>')('key')`.
- ❌ Surfacing an auth error via raw copy. Classify with `classifyAuthError`,
  then `formatAuthError(code, ctx, t)` where `t` resolves the `errors`
  namespace (pass `(k) => t(\`errors:${k}\`)`).

## Security

- Application roles in `users.superAdmin` and `organizationMembers.role`, NEVER in the BA user table.
- Auth checks always server-side via helpers (`requireAppUser`, `requireOrgMember`, `requireOrgRole`, `requireSuperAdmin`).
- Secrets via `pnpm exec convex env set X <value>` or `.env.local` (never committed).
- No `VITE_` prefix on secrets.
- HMAC verify on every incoming webhook (`crypto.timingSafeEqual`).
- Better Auth CORS reduced to origins allowed in `BETTER_AUTH_URL`.

## Dev workflow

- `pnpm add <pkg>` BEFORE writing the import (otherwise Vite hard-fails).
- Create the target file BEFORE writing a local import.
- `pnpm dev` runs Vite + `convex dev` in parallel (via `concurrently`).
- Before commit: `pnpm typecheck` must pass + Convex log must show `ready`.
- Shipped something users can see? Add an in-app changelog entry: metadata
  in `src/lib/changelog.ts`, copy (en + fr) in
  `src/locales/{en,fr}/changelog.json`.
