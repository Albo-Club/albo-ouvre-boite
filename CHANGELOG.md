# Changelog

Template releases, newest first. Each tag matches `.template-version` at that
commit. Downstream projects: read the sections between your version and the
latest **before** running `pnpm run upgrade-template` — migration steps live
in [UPGRADING.md](UPGRADING.md).

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
