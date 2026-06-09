#!/usr/bin/env node
// Tag a template release, keeping `.template-version` and `CHANGELOG.md` in
// sync. Downstream projects read `.template-version` to graft ancestry on
// their first `pnpm run upgrade-template` (see UPGRADING.md).
//
// Usage:
//   pnpm run release v0.2.0
//
// Requires a clean tree and a `## v0.2.0` section in CHANGELOG.md. Commits
// the version bump, creates the tag, and tells you what to push.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]

function sh(cmd) {
  return execSync(cmd, { stdio: 'inherit' })
}
function shOut(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
}

if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: pnpm run release vX.Y.Z')
  process.exit(1)
}

if (shOut('git status --porcelain').length > 0) {
  console.error('Working tree is not clean. Commit or stash first.')
  process.exit(1)
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
if (!changelog.includes(`## ${version}`)) {
  console.error(
    `CHANGELOG.md has no "## ${version}" section. Write the release notes ` +
      'first — the changelog is what downstream projects read before merging.',
  )
  process.exit(1)
}

try {
  shOut(`git rev-parse ${version}`)
  console.error(`Tag ${version} already exists.`)
  process.exit(1)
} catch {
  // tag is free
}

const current = readFileSync('.template-version', 'utf8').trim()
if (current !== version) {
  writeFileSync('.template-version', `${version}\n`)
  sh('git add .template-version')
  sh(`git commit -m "chore(release): ${version}"`)
}

sh(`git tag ${version}`)
console.log(`\nTagged ${version}. Publish it with:\n  git push origin main --follow-tags`)
