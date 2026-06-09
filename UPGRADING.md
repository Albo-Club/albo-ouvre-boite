# Upgrading from the template

How a project derived from this starter pulls in upstream improvements.
What changed in each release lives in [CHANGELOG.md](CHANGELOG.md); this file
covers the mechanics plus any manual migration steps per version.

## How it works

```bash
pnpm run upgrade-template -- --diff   # preview what would change
pnpm run upgrade-template             # merge template/main into HEAD
```

The first run adds a `template` git remote pointing at the starter. The merge
is `--no-commit --no-ff`: review, resolve conflicts, commit yourself.

**First run on a "Use this template" snapshot**: GitHub template snapshots
share no git history with the starter, so a plain merge would fail with
`refusing to merge unrelated histories`. The script detects this and grafts
the ancestry automatically — it merges the release tag recorded in
`.template-version` with `-s ours`, which touches no files and only records
the parent link. Every later merge is then a normal 3-way merge.

**Snapshots that predate `.template-version`**: graft manually against the
template commit your project was created from, then re-run:

```bash
git remote add template https://github.com/Albo-Club/albo-ouvre-boite.git
git fetch template
git merge -s ours --allow-unrelated-histories <template-commit-at-fork-time>
pnpm run upgrade-template
```

After any upgrade: `pnpm typecheck && pnpm lint && pnpm build`, then walk
[TESTING.md](TESTING.md) level 1.

## Conflict rule of thumb

Files you have customized (locales, brand.css, routes you reworked) will
conflict with template-side changes to the same lines — that's expected.
Keep your side with `git checkout --ours <path>`, take the template's with
`--theirs`, or merge by hand. Files the template removed that you still use:
`git checkout --ours <path>` restores them.

## Per-version migration notes

### → v0.1.0

First tagged release — no migration steps if you derive from here. If your
snapshot predates it:

- The demo pages (`calendar`, `tasks`, `map`, `billing` under
  `/app/$orgSlug/`) were removed, along with their nav entries, locale keys
  and the `leaflet`, `react-leaflet`, `@types/leaflet`, `react-day-picker`
  dependencies. If you built on any of them, keep your copies during the
  merge and re-add the dependencies you need.
- CI now runs `pnpm lint` and `pnpm build`; fix any lint backlog before
  merging or the inherited workflow will fail.
