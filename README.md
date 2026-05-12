# albo — l'ouvre-boîte

Opinionated B2B SaaS MVP starter: **TanStack Start + Convex + Better Auth + Resend + Anthropic + Tailwind v4**.

Multi-tenant by default (orgs, members, invitations, roles), with an AI chat
sidebar wired in, transactional emails, rate-limiting, and CI/CD on day one.

## Stack

| Layer        | Choice                                                       |
| ------------ | ------------------------------------------------------------ |
| Front-end    | React 19 · TanStack Start v1 · TanStack Router (file-based)  |
| State / data | TanStack Query · Convex (real-time queries, mutations, HTTP) |
| Forms        | TanStack Form · Zod                                          |
| Styling      | Tailwind v4 (CSS-first) · shadcn/ui · Inter · tokens in oklch |
| Auth         | Better Auth (email/password + magic link) + `organization()` |
| Email        | Resend (HTML + plain text templates)                         |
| AI           | Convex Agent + Anthropic Claude (Haiku 4.5 default, with tools) |
| Limiter      | `@convex-dev/rate-limiter`                                   |
| Observ.      | Sentry (front-end), Convex built-in logs                     |

## Getting started

```bash
pnpm install
pnpm exec convex dev     # one-time: provisions the deployment
pnpm exec convex env set BETTER_AUTH_SECRET "$(openssl rand -hex 32)"
pnpm exec convex env set SITE_URL "http://localhost:3000"
pnpm exec convex env set RESEND_API_KEY re_...
pnpm exec convex env set RESEND_FROM "hello@yourdomain.com"
pnpm exec convex env set RESEND_TEST_MODE false
pnpm exec convex env set ANTHROPIC_API_KEY sk-ant-...
cp .env.example .env.local
# fill VITE_CONVEX_URL + CONVEX_DEPLOYMENT
pnpm dev
```

The first user across the deployment becomes `superAdmin: true` automatically.

## Personalize a fresh copy

```bash
pnpm run init my-project --reset-git
```

Renames the package, replaces `albo` / `Albo` in user-facing strings, and
optionally resets git history to a clean initial commit.

## Project layout

```
convex/                Convex backend
  auth.ts              Better Auth config (email + magic link)
  schema.ts            users · organizations · members · invitations · items
  organizations.ts     org CRUD, members, role helpers
  invitations.ts       invite, accept, revoke (with email send)
  users.ts             me, provisionMe, updateProfile
  admin.ts             super-admin queries + purgeExcept (dev cleanup)
  items.ts             example multi-tenant CRUD
  agent.ts             AI agent instance (Anthropic, default Haiku 4.5)
  agentTools.ts        DB-acting tools the chat agent can call (items CRUD)
  chat.ts              threads, sendMessage, listMessages, HTTP /api/chat
  rateLimiters.ts      named limits + consumeLimit helper
  lib/auth.ts          requireAppUser, requireOrgMember, requireOrgRole, …
  lib/webhooks.ts      isValidHmac() for incoming webhooks
  emailTemplates.ts    inline-styled HTML + plain text
src/
  routes/              File-based routes (TanStack Router)
    api/auth/$.ts      Better Auth proxy
    app/               Authenticated area
      route.tsx        auth gate + lazy provisioning
      $orgSlug/        Org-scoped routes
        route.tsx      Top app bar + AI chat sidebar mount point
        settings/      General · Members · Invitations
        items.tsx      CRUD example
      admin.tsx        Super-admin
      me.tsx           Profile + change password
    login.tsx / register.tsx / accept-invite.$token.tsx
  components/
    AiChat.tsx         Slide-over chat panel using Convex Agent React hooks
    Logo.tsx
    ui/                shadcn primitives
  lib/
    auth-client.ts     Better Auth client (+ plugins)
    sentry.ts          Front-end Sentry init (no-op if VITE_SENTRY_DSN unset)
scripts/
  sync-skills.mjs      Pull SKILL.md files from upstream GitHub
  init.mjs             Rebrand the template
  upgrade-template.mjs Pull non-conflicting updates from upstream
```

## Routes at a glance

| Path                                  | What it does                          |
| ------------------------------------- | ------------------------------------- |
| `/`                                   | Marketing landing with sign-in CTA    |
| `/login`, `/register`                 | Email/password + redirect support     |
| `/accept-invite/:token`               | Token-as-credential state machine     |
| `/app`                                | Org switcher / onboarding redirect    |
| `/app/onboarding`                     | First-org creation                    |
| `/app/me`                             | Profile, password, sign-out           |
| `/app/admin`                          | Super-admin overview                  |
| `/app/:orgSlug`                       | Org dashboard                         |
| `/app/:orgSlug/items`                 | Example multi-tenant CRUD             |
| `/app/:orgSlug/settings/{general,members,invitations}` | Settings UI |

## Auth model

- `users.superAdmin: boolean` for deployment-wide privileges.
- `organizationMembers.role`: `owner` > `admin` > `member`.
- Roles are **never** stored on the Better Auth user table.
- Every Convex query/mutation reads roles via `requireAppUser` / `requireOrgRole` / `requireSuperAdmin`.
- Invitations: 7-day expiry, token *is* the credential; UI never bounces the
  invitee through sign-in unless the email already has an account.
- Last-owner protection on every demote/remove path.

## AI chat

The `AiChat` slide-over uses the Convex Agent's React hooks
(`useUIMessages`) so streaming deltas arrive via WebSocket — no manual SSE
plumbing. Threads are keyed by `${orgId}:${userId}`.

The chat agent ships with **DB-acting tools** (`convex/agentTools.ts`) so it
can list / create / update / delete `items` for the user's current org —
membership is re-checked inside every tool via the thread's scope key.
Tool calls cap out at 5 rounds per turn (`stepCountIs(5)`).

There's also an HTTP streaming endpoint at `<convex-site-url>/api/chat` for
clients that prefer plain HTTP streaming (curl, custom clients).

## CI / Ops

- Renovate: weekly, groups non-majors, automerges devDeps, freezes the
  pinned `pnpm.overrides` until you bump them.
- `ci.yml`: install + typecheck on push/PR.
- `sync-skills.yml`: weekly skill freshness PR.
- `release-please.yml`: conventional-commit changelog + tags.

## Common commands

```bash
pnpm dev                          # vite + convex dev (concurrently)
pnpm typecheck                    # tsc --noEmit
pnpm run sync:skills              # pull latest SKILL.md files
pnpm run sync:skills:check        # exit 2 if any drifted
pnpm run init <name>              # personalize template
pnpm run upgrade-template         # merge upstream template changes
pnpm exec convex env list         # inspect Convex env vars
pnpm exec convex run admin:purgeExcept '{"keepEmail":"you@yourco.com"}'
```

## See also

- [TESTING.md](TESTING.md) — end-to-end test plan (auth, multi-tenant, AI…).
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — pinned versions and why.
- [CLAUDE.md](CLAUDE.md) — guidelines for AI-assisted work in this repo.
