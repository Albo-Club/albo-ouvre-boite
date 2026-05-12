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

import { execSync } from 'node:child_process'

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

function main() {
  ensureClean()
  ensureRemote()

  console.log('Fetching template…')
  sh('git fetch template main')

  if (diffOnly) {
    console.log('Changes that would be merged from template/main:')
    sh('git log --oneline HEAD..template/main')
    sh('git diff HEAD..template/main --stat')
    return
  }

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
