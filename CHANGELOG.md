# Changelog

Template releases, newest first. Each tag matches `.template-version` at that
commit. Downstream projects: read the sections between your version and the
latest **before** running `pnpm run upgrade-template` — migration steps live
in [UPGRADING.md](UPGRADING.md).

## v0.3.0 — 2026-06-15

### Added

- **Resend Claude Code plugin** enabled at project scope
  (`.claude/settings.json` → `enabledPlugins`): bundles the Resend MCP server
  + skills, auto-updating via the official `claude-plugins-official`
  marketplace (so it stays out of `skills-lock.json` on purpose). Put your
  `RESEND_API_KEY` in the gitignored `.claude/settings.local.json` `env`
  block. See README "Claude Code plugin — Resend" and `KNOWN_ISSUES.md`
  "Resend: two integrations".
- **`pnpm run sync:skills:update`** — deliberate pin bump for skills.

### Changed

- **Skills are now pinned to immutable commits.** `skills-lock.json` gains
  `trackingRef` (watched branch) + `pinnedRef` (vendored SHA); `sync:skills`
  vendors at the pin (reproducible), `sync:skills:check` flags drift,
  `sync:skills:update` bumps. Stops a silent upstream change landing
  unreviewed. **Downstream:** `skills-lock.json` will conflict on
  `upgrade-template` — keep the template's pinned format (`--theirs`), then
  `pnpm run sync:skills`.
- **TanStack Start skill** now sourced from the official `TanStack/router`
  monorepo (`packages/react-start/skills/react-start/SKILL.md`) instead of
  the community `deckardger/tanstack-agent-skills`.
- All developer-facing docs translated to English.

### Removed

- The weekly `sync-skills.yml` cron + auto-PR workflow (Actions off by
  default, bot PRs without CI, cron never fired). The `skills-drift` CI job
  in `ci.yml` is now the whole freshness chain — see `KNOWN_ISSUES.md`.

## v0.2.0 — 2026-06-10

### Added

- **In-app changelog ("What's new")**: a sidebar-footer button (bottom left)
  with an unread dot opens a dialog listing user-facing release notes,
  newest first, bilingual. Entry metadata lives in `src/lib/changelog.ts`,
  copy in `src/locales/{en,fr}/changelog.json` — add an entry there whenever
  you ship something users can see.

## v0.1.0 — 2026-06-09

First tagged release. Baseline: TanStack Start + Convex + Better Auth
multi-tenant starter with magic link + email/password auth, orgs/members/
invitations, items CRUD, AI chat with org-scoped DB tools, bilingual
transactional emails, rate limiting, i18n (en/fr), dark mode.

### Added

- **Template propagation channel fixed for "Use this template" snapshots**:
  `pnpm run upgrade-template` now grafts ancestry from `.template-version` on
  first run (`git merge -s ours`), so snapshots without shared git history get
  clean 3-way merges. Previously the merge failed with
  `refusing to merge unrelated histories`.
- `.template-version`, `pnpm run release`, this changelog and UPGRADING.md.
- `release-tag` workflow: pushes to `main` touching `.template-version` or
  `CHANGELOG.md` publish the release tag automatically (idempotent).
- Global router error boundary and a styled 404 page.
- Markdown rendering in the AI chat.
- Skeleton loading states on the dashboard and items table.
- CI now gates `pnpm lint` and `pnpm build` (was: typecheck only).

### Removed

- Mock-data demo pages: `/app/$orgSlug/calendar`, `/tasks`, `/map`,
  `/billing`, plus their nav entries, locales and the `leaflet` /
  `react-leaflet` / `react-day-picker` dependencies. They were dead weight
  every derived project had to delete or finish. If your fork uses them, keep
  your copies during the merge (`git checkout --ours <path>`).

### Fixed

- Hardcoded English `aria-label`s now go through i18n.
