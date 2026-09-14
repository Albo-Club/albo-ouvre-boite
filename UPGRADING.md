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

**First run without shared history**: projects scaffolded with
`pnpm run init --reset-git`, and GitHub "Use this template" snapshots, share no
git history with the starter, so a plain merge would fail with
`refusing to merge unrelated histories`. The script detects this and grafts the
ancestry automatically with `-s ours`, which touches no files and only records
the parent link. Every later merge is then a normal 3-way merge.

**Where it grafts matters.** The graft claims "my tree equals the tree at that
commit", so the commit has to be the one your project was actually created
from. Two sources, in order:

1. **`.template-ref`** — the exact template SHA, written by `scripts/init.mjs`
   at clone time. Used when it is an ancestor of `template/main`.
2. **`.template-version`** — the release tag, used as a fallback.

The tag alone is not enough, which is why `.template-ref` exists: a tag is only
as fresh as the last `pnpm run release`. Clone `main` a month after a release
and your tree is many commits _newer_ than the tag, but the graft would claim
it is the older one — so the merge re-proposes every commit in between, and
each one conflicts with the rebrand. Grafting on the real commit gives
`Already up to date.` instead.

**Projects created between v0.3.0 and v0.4.0** hit exactly that: `v0.3.0` was
the current tag while `main` ran 28 commits ahead, and they have no
`.template-ref` because `init.mjs` did not write one yet. Do not resolve those
conflicts — the merge is proposing changes you already have, and keeping the
template's side would undo your rebrand. Graft manually on the commit you
cloned, once:

```bash
git remote add template https://github.com/Albo-Club/albo-ouvre-boite.git
git fetch template main
git merge -s ours --allow-unrelated-histories <template-commit-you-cloned>
pnpm run upgrade-template    # from here on, normal 3-way merges
```

If you no longer know the SHA, `5d34eb9` (the tip of `main` at v0.4.0) is right
for anything cloned in the weeks before this release; check with
`pnpm run upgrade-template -- --diff` first — a correct graft point shows
nothing, or only commits you genuinely lack. Recording it as `.template-ref`
afterwards is optional: once the ancestry is grafted, git has a merge base and
the file is never read again.

**Snapshots that predate `.template-version`**: same manual graft, against the
template commit your project was created from.

After any upgrade: `pnpm typecheck && pnpm lint && pnpm build`, then walk
[TESTING.md](TESTING.md) level 1.

## Conflict rule of thumb

Files you have customized (locales, brand.css, routes you reworked) will
conflict with template-side changes to the same lines — that's expected.
Keep your side with `git checkout --ours <path>`, take the template's with
`--theirs`, or merge by hand. Files the template removed that you still use:
`git checkout --ours <path>` restores them.

## Per-version migration notes

### → v0.4.0

**If your first `upgrade-template` is this one, read "Where it grafts matters"
above before running it** — projects created between v0.3.0 and v0.4.0 need a
one-off manual graft, and resolving the conflicts instead would undo the
rebrand.

**New file: `convex.json`.** It carries
`{ "aiFiles": { "skills": { "agents": [] } } }`, which stops the Convex CLI
reinstalling the 32 `convex-*` agent skills (and polluting `skills-lock.json`,
which turns the `skills-verify` CI job red) on `convex dev`. `guidelines.md`
keeps refreshing. Take the template's copy. If you already have a
`convex.json`, merge the `aiFiles` key into yours rather than replacing the
file. If the 32 skills are already installed, `KNOWN_ISSUES.md` §
"…and the Convex CLI puts them straight back" has the cleanup.

**Skills re-pinned.** Ten vendored skills move to current upstream (Better
Auth, TanStack Router, `frontend-design`, `convex-create-component`). Take the
template's `skills-lock.json` and `.agents/skills/` wholesale
(`git checkout --theirs`), then `pnpm run sync:skills` and confirm
`pnpm run sync:skills:verify` is green. Better Auth's CLI is now invoked as
`npx auth@latest`, not `npx @better-auth/cli@latest` — that is upstream's
rename, and only affects the skill text.

**Nothing to do for `.template-ref`** in an existing project: it is written by
`init.mjs` when a _new_ project is derived, and it is never read once your
history is grafted.

### → v0.3.0

**One expected conflict: `skills-lock.json`.** This release reshapes it —
every skill now carries `trackingRef` + `pinnedRef` (immutable pins). On
`upgrade-template` you'll get a conflict; keep the template's pinned format
(`git checkout --theirs skills-lock.json`), then run `pnpm run sync:skills`
to vendor at the pins. The skill machinery (`scripts/sync-skills.mjs`) and
`package.json` (`sync:skills:update`) also change — take the template's.

The TanStack Start skill switches source to the official `TanStack/router`
repo; `pnpm run sync:skills` re-vendors its content automatically.

Resend Claude Code plugin: after merging, put your `RESEND_API_KEY` in the
gitignored `.claude/settings.local.json` `env` block and restart Claude Code.
Nothing to do if you don't use the Resend tooling.

### → v0.2.0

No manual steps required — this release adds the in-app "What's new" panel
(`src/components/app-shell/WhatsNew.tsx`) and the `changelog` i18n namespace.
If you've already customized `AppSidebar.tsx`, merge the `<WhatsNew />` footer
item if you want the panel; otherwise skip it.

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
