# PORTING — pushing template changes into derived projects

This template is forked into standalone products. Once forked, they drift: their
own routes, their own `skills-lock.json`, their docs translated or rewritten by
`scripts/init.mjs`. So a fix landed here does **not** reach them by itself.

Two channels, and they answer different questions.

| Channel                     | Good for                             | Cost                                 |
| --------------------------- | ------------------------------------ | ------------------------------------ |
| `pnpm run upgrade-template` | broad catch-up, many commits at once | conflicts on every personalised file |
| A targeted prompt (below)   | one fix you know you want, cleanly   | you write the prompt once            |

## Why `upgrade-template` alone is not enough

It is a `git merge` of `template/main`, so it brings everything — including the
files a derived project has necessarily customised: `package.json`,
`.github/workflows/ci.yml`, `README.md`, `CLAUDE.md`, `KNOWN_ISSUES.md`,
`TESTING.md`, and `skills-lock.json` + `.agents/skills/**` when the skill sets
differ.

The failure mode is not a loud conflict — it is a _quiet half-merge_. Conflict
resolution keeps the interesting file (a script, a helper) and drops the boring
one-liner that actually wires it up: the `package.json` entry, or the CI job. You
end up shipping a guard that never runs. **After any `upgrade-template`, verify
the wiring, not just the code.**

Never merge the template's `skills-lock.json` or `.agents/skills/**` into a
derived project. Those belong to that project; let it run its own
`sync:skills:update`.

## Verifying a derived project (no agent needed)

Three questions, in order. Run from the derived project's root.

```bash
# 1. Is the tooling present? Both must print a definition.
grep -n 'async function hashLocal\|async function runVerify' scripts/sync-skills.mjs
grep -n 'sync:skills:verify' package.json

# 2. Is it actually wired into CI? (the one people forget)
grep -rn -- '--verify' .github/workflows/

# 3. Does it pass? (this is the payoff, not a formality)
node scripts/sync-skills.mjs --verify
```

Steps 1 and 2 are `grep -n`, not `grep -c`, on purpose: a count invites a
hardcoded expected number that goes stale the moment someone adds a comment
mentioning the identifier. Read the lines instead.

Step 3 failing on a first run is **not** a bug in the port — it is the latent rot
the guard exists to find. Do not edit `skills-lock.json` to match the disk; that
ratifies the corruption. Run `pnpm run sync:skills` to repair, then read the
`git diff` to see what had rotted and for how long.

## The drift decision — do not copy it blindly

A derived project must answer "who watches upstream?" before touching CI. Look
at `ls .github/workflows/` for a skills-sync cron:

- **A cron exists** → CI can run `--verify` only, and drop `--check`. Fully
  offline CI: no job can go red because `raw.githubusercontent.com` hiccuped on
  an unrelated PR. Upstream drift is caught by the cron's bump PR.
- **No cron** → keep `--check` in CI **and** add `--verify`. Without a cron, the
  CI check is the only thing watching upstream.

This template has no cron (deliberately — see `KNOWN_ISSUES.md` §
"sync-skills.yml (cron + auto-PR) was removed"), so it runs both jobs. A derived
project that kept its cron is right to run only one. Same code, different correct
answers.

## Prompt — port the skills integrity guard

The worked example, still needed by any project forked before that fix. Paste it
into Claude Code from the derived project's root. It diagnoses before acting, so
it is safe to run against a project that already has some or all of it.

```text
Port the skills-pipeline integrity guard into this repo. It shipped upstream in
the template `Albo-Club/albo-ouvre-boite` (public) at commit 0e2b8f3 (PR #52).

    gh api repos/Albo-Club/albo-ouvre-boite/commits/0e2b8f3 \
      --jq '.files[] | "\(.filename)"'

Read the diff of `scripts/sync-skills.mjs` before writing anything. Apply ONLY
that PR: do not touch `.agents/skills/` contents or `skills-lock.json`, which
belong to this project, not to the template.

## The defect

`--check` and the default mode both compare the lock's hash to UPSTREAM.
`isVendored()` only tests that files EXIST. Nothing ever re-reads the content
actually vendored on disk. So a file under `.agents/skills/**` that was
hand-edited, truncated or left stale is invisible from both sides.

## Step 1 — diagnose BEFORE coding, and report what you find

1. Does this repo already have the fix? Look in `scripts/sync-skills.mjs` for
   `hashLocal`, `runVerify`, `verifyOnly`, and the `local.hash !==
   info.computedHash` comparison inside `runSync`. Check `sync:skills:verify` in
   `package.json` and `--verify` in the CI workflows.
   → If all present, write no code: go to step 4.
   → If partial, tell me exactly what is missing. The dangerous state is
     "script updated but no CI job": the guard exists and never runs.

2. Reproduce the hole — do not take my word for it:

       node scripts/sync-skills.mjs --check      # note the exit code
       echo "CORRUPTION" >> <a vendored SKILL.md>
       node scripts/sync-skills.mjs --check      # still green? exit 0?
       git checkout -- .agents/skills

   Also confirm the shape of it: DELETING a file IS caught (existence test),
   MODIFYING its content is not.

## Step 2 — the decision that depends on THIS repo; do not guess it

Run `ls .github/workflows/` and look for a skills-sync cron.

- A cron exists → you may drop `--check` from CI and keep only `--verify`
  (fully offline CI; the cron catches upstream drift).
- No cron → KEEP the `--check` job AND add `--verify`. Without a cron the CI
  check is the only thing watching upstream.

Tell me which case applies, and why, before editing any YAML.

## Step 3 — implement

1. `scripts/sync-skills.mjs`:
   - `hashLocal(name, info)`: mirror of `fetchSkillAt()` against the working
     tree — same file order (`relPaths`), same framing, so the digest is
     comparable to `computedHash` byte for byte. Return `{ missing: rel }` when
     a file is absent.
   - `runVerify(lock)`: the new `--verify` mode. Compare `hashLocal` to
     `computedHash`, name every divergent skill, exit 2 if any. No network.
   - `runSync` becomes self-healing: `needsWrite` includes
     `local.hash !== info.computedHash`, so a plain `sync:skills` repairs a
     corrupted tree without `--force` (a missing file leaves `local.hash`
     undefined, which also mismatches). `isVendored` stays — `runCheck` still
     uses it.
   - Update the comment banner at the top of the file (modes, exit codes). It
     documents the modes; it must stay accurate.
2. `package.json`: `"sync:skills:verify": "node scripts/sync-skills.mjs --verify"`.
3. CI: add a job running `node scripts/sync-skills.mjs --verify` (no
   `pnpm install` — the script has no dependencies). In YAML comments, state
   which question each job answers: `--verify` = "is my tree intact?" (offline);
   `--check` = "has upstream moved?" (network).
4. Docs, in THIS repo's language (check the existing files before choosing):
   both modes and how they differ, the `sync:skills:verify` command, the fact
   that the default mode is now self-healing, the rule "--verify guards, --check
   detects, --update bumps", and a "when the verify job is red" procedure. Fix
   any claim that became false in passing (command outputs, job names, phrasing
   like "invisible to sync:skills and --check" that must now name three modes).

## Step 4 — prove it, do not assert it

1. `--verify` on a clean tree → exit 0.
2. THREE corruption types exit 2 with the skill named: modified `SKILL.md`,
   modified file under `references/`, deleted file.
3. `sync:skills` ALONE (no `--force`) repairs all three, and `git status` returns
   to 0 modified files under `.agents/skills/`.
4. `sync:skills` is idempotent on a second pass.
5. `--check` unchanged.
6. `skills-lock.json` untouched by the exercise (compare its sha256 before and
   after).
7. The project's lint and build pass.

## ⚠️ If `--verify` is red on the FIRST run against a clean tree

That is not a bug in your implementation — it is the rot the hole already
allowed. Do NOT edit `skills-lock.json` to match the disk; that ratifies the
corruption. Run `sync:skills` to repair, then read the `git diff` and tell me
what had rotted and since when (`git log` on the affected files). That is the
most valuable outcome of the whole exercise.

## Do NOT

- Touch anything under `.agents/skills/`, `skills-lock.json`, or the script's
  `MAX_IN_FLIGHT`.
- Merge the template's skill contents — this repo has its own set.
- Run `--update`: this is not a skills bump.
- Drop the `--check` job without having verified a cron exists (step 2).
```

## Prompt — port the pnpm version pin

`upgrade-template` will not carry this cleanly: `package.json` is the most
conflict-prone file in any derived project, and the fix is three coordinated
edits across `package.json`, `.github/workflows/ci.yml` and the docs. A derived
project that skips it keeps working right up until someone's Corepack resolves
pnpm 11 — then every `pnpm run *` dies at once, with an error that blames
esbuild.

```
This project was forked from the albo-ouvre-boite template. The template pinned
its package manager after pnpm 11 broke every npm script. Port that fix here.

## The defect

pnpm 11 removed two config locations without a hard error:
  - `pnpm.overrides` in package.json is ignored (one [WARN] line, then it
    carries on with the pins silently lifted)
  - `onlyBuiltDependencies` was replaced by `allowBuilds`; unapproved builds
    now exit 1 instead of warning, and pnpm runs a dep check before every
    script — so typecheck, lint, build and dev all die before running.

Nothing pins the pnpm version, so Corepack hands out whatever is newest.

## Step 1 — diagnose BEFORE coding, and report what you find

Run these and paste the output. Do not skip: this repo may already be pinned,
or may legitimately differ from the template.

  node -e "const p=require('./package.json');console.log('packageManager:',p.packageManager??'ABSENT');console.log('engines:',JSON.stringify(p.engines??'ABSENT'));console.log('overrides:',JSON.stringify(p.pnpm?.overrides??'ABSENT'))"
  pnpm --version
  grep -nA3 'pnpm/action-setup' .github/workflows/ci.yml
  git status --short pnpm-lock.yaml pnpm-workspace.yaml

Report: is `pnpm-lock.yaml` dirty? If yes, does its diff delete an `overrides:`
block? That is the pnpm 11 rewrite, and it means the pins are already lifted in
whatever is installed locally.

## Step 2 — the decision that depends on THIS repo; do not guess it

Which pnpm major to pin. Do not assume 10 because the template says 10.
  - Check where this project deploys. Vercel supports pnpm 6-10 only
    (vercel.com/docs/package-managers); pnpm 11 needs the experimental
    ENABLE_EXPERIMENTAL_COREPACK=1 project env var. Other hosts differ.
  - Pin the newest major your host supports natively. Get the exact version
    from `npm view pnpm dist-tags`.
  - If and only if you land on 11: also move `pnpm.overrides` into
    `overrides:` in pnpm-workspace.yaml and swap `onlyBuiltDependencies` for
    `allowBuilds: {<pkg>: true}`. On 10 or below, leave both exactly where
    they are — pnpm 9 cannot read pnpm-workspace.yaml settings.

State your choice and why before editing.

## Step 3 — implement

  - `corepack use pnpm@<chosen version>` — writes `packageManager` WITH its
    sha512 integrity hash. Never hand-write that string.
  - Add `engines`: `{"node": ">=22", "pnpm": "<major>.x"}` — this is the guard
    for anyone running with Corepack disabled.
  - In ci.yml, DELETE the `with: version:` block under `pnpm/action-setup@v4`.
    The action reads `packageManager`. Leaving a version there recreates the
    exact split-brain you are fixing.
  - `git checkout pnpm-lock.yaml pnpm-workspace.yaml` if step 1 showed them
    dirty from a pnpm 11 install.

## Step 4 — prove it, do not assert it

  pnpm --version                      # must print the pinned version
  CI=true pnpm install --frozen-lockfile
  git status --short                  # pnpm-lock.yaml MUST be unmodified
  pnpm typecheck && pnpm lint && pnpm build

Then confirm the pins actually came back — list the overridden packages under
node_modules/.pnpm/ and check the versions match `pnpm.overrides`. If one
drifted, the override is not applying and the fix is incomplete.

Finally, prove the guard bites:

  corepack pnpm@<a different major> install --frozen-lockfile

must fail with "This project is configured to use <pinned>". If it installs,
the pin is decorative.

## Do NOT

- Bump the overridden packages "while you're in there". Check whether this repo
  has a renovate rule disabling them and respect it.
- Add `node-linker` or `package-import-method` to .npmrc. The defaults use APFS
  copy-on-write clones; overriding them multiplies disk use per worktree.
- Set `--frozen-lockfile=false` in a deploy config to make a red build go
  green. That hides the drift instead of fixing it.
```

## Writing the next one

The prompt above is the shape to copy. What makes it work is not the file list —
it is the four beats: **diagnose before acting** (a derived project may already
be fixed, or half-fixed), **name the project-specific decision** instead of
guessing it, **demand proof rather than assertion**, and **say what not to
touch**. Keep those and the rest is detail.

Include the upstream commit SHA and the `gh api` line to read it. A prompt that
describes a diff the agent cannot fetch is a prompt that invents one.
