#!/usr/bin/env node
// Pull upstream changes from the albo-ouvre-boite template into a downstream
// project that was scaffolded from it.
//
// Usage:
//   pnpm run upgrade-template                  (merges template/main into HEAD)
//   pnpm run upgrade-template -- --diff        (show what would change)
//   pnpm run upgrade-template -- --remote URL  (override template remote URL)
//
// First run adds a `template` remote pointing to the upstream repo. Subsequent
// runs reuse it. The merge is `--no-commit --no-ff` so you can inspect, resolve
// conflicts, and commit yourself.
//
// Snapshots created via GitHub's "Use this template" share no git history with
// the template, so a plain merge would fail with "refusing to merge unrelated
// histories". On first run we graft the ancestry: merge the release tag from
// `.template-version` with `-s ours` (tree untouched, only the parent link is
// recorded), after which every merge is a clean 3-way.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const DEFAULT_REMOTE = 'https://github.com/Albo-Club/albo-ouvre-boite.git'

const args = process.argv.slice(2)
const diffOnly = args.includes('--diff')
const remoteIdx = args.indexOf('--remote')
const remoteUrl =
  remoteIdx >= 0 && args[remoteIdx + 1] ? args[remoteIdx + 1] : DEFAULT_REMOTE

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts })
}
function shOut(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
}

function ensureClean() {
  const status = shOut('git status --porcelain')
  if (status.length > 0) {
    console.error('Working tree is not clean. Commit or stash first.')
    process.exit(1)
  }
}

function ensureRemote() {
  const remotes = shOut('git remote').split('\n')
  if (!remotes.includes('template')) {
    console.log(`Adding remote template -> ${remoteUrl}`)
    sh(`git remote add template ${remoteUrl}`)
  } else {
    const currentUrl = shOut('git remote get-url template')
    if (currentUrl !== remoteUrl) {
      console.log(`Updating remote template -> ${remoteUrl}`)
      sh(`git remote set-url template ${remoteUrl}`)
    }
  }
}

function hasMergeBase() {
  try {
    shOut('git merge-base HEAD template/main')
    return true
  } catch {
    return false
  }
}

function snapshotVersion() {
  let version
  try {
    version = readFileSync('.template-version', 'utf8').trim()
  } catch {
    console.error(
      'No shared history with the template and no .template-version file.\n' +
        'This snapshot predates template versioning. Graft the ancestry\n' +
        'manually against the template commit your project was created from:\n' +
        '  git merge -s ours --allow-unrelated-histories <commit>\n' +
        'then re-run this script.',
    )
    process.exit(1)
  }
  console.log(`Fetching template tags…`)
  try {
    sh('git fetch template --tags')
    shOut(`git rev-parse ${version}^{commit}`)
  } catch {
    console.error(
      `Tag ${version} (from .template-version) not found on the template ` +
        'remote.\nThe template maintainer needs to push it: git push origin --tags',
    )
    process.exit(1)
  }
  return version
}

function graftAncestry(version) {
  console.log(`Grafting template ancestry at ${version} (tree untouched)…`)
  sh(
    `git merge -s ours --allow-unrelated-histories ` +
      `-m "chore: graft template ancestry (${version})" ${version}`,
  )
}

function main() {
  ensureClean()
  ensureRemote()

  console.log('Fetching template…')
  sh('git fetch template main')

  const related = hasMergeBase()

  if (diffOnly) {
    // Without a merge base, HEAD..template/main would list the template's
    // entire history — diff from the snapshot's release tag instead.
    const base = related ? 'HEAD' : snapshotVersion()
    if (!related) {
      console.log(
        `No shared history yet — showing changes since ${base}. The first ` +
          'real run will graft the ancestry automatically.',
      )
    }
    console.log('Changes that would be merged from template/main:')
    sh(`git log --oneline ${base}..template/main`)
    sh(`git diff ${base}..template/main --stat`)
    return
  }

  if (!related) graftAncestry(snapshotVersion())

  console.log('Merging template/main (no-commit, no-fast-forward)…')
  try {
    sh('git merge --no-commit --no-ff template/main')
    console.log(
      '\nMerge prepared. Review the changes, then commit with a message like:\n' +
        '  git commit -m "chore: upgrade from template"',
    )
  } catch {
    console.log(
      '\nMerge has conflicts. Resolve them, then run:\n' +
        '  git add . && git commit -m "chore: upgrade from template"\n' +
        'To abort: git merge --abort',
    )
  }
}

main()
