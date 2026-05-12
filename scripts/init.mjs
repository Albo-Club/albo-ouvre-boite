#!/usr/bin/env node
// Personalize this template for a new project.
// Usage: pnpm run init <project-name>
//
// What it does:
//  - Renames `name` in package.json to <project-name>
//  - Replaces every literal "albo" (case-preserving) in user-facing files with
//    the new brand (kebab in package.json, capitalized elsewhere).
//  - Optionally resets git history to a single "chore: scaffold" commit
//    (only if --reset-git is passed).
//
// Run from the project root. Idempotent: re-running with the same name is a
// no-op once everything is renamed.

import { existsSync } from 'node:fs'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const TARGETS = [
  'package.json',
  'README.md',
  'src/routes/__root.tsx',
  'src/routes/index.tsx',
  'src/routes/login.tsx',
  'src/routes/register.tsx',
  'src/routes/accept-invite.$token.tsx',
  'src/routes/app/me.tsx',
  'src/routes/app/admin.tsx',
  'src/routes/app/onboarding.tsx',
  'src/routes/app/$orgSlug/items.tsx',
  'src/components/Logo.tsx',
  'convex/emailTemplates.ts',
  'convex/agent.ts',
]

function usage() {
  console.error('Usage: pnpm run init <project-name> [--reset-git]')
  process.exit(1)
}

const name = process.argv[2]
const resetGit = process.argv.includes('--reset-git')
if (!name || name.startsWith('-')) usage()

const slug = name
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')
if (slug.length < 3 || slug.length > 40) {
  console.error('Project name must produce a 3-40 char kebab slug.')
  process.exit(1)
}
const display = slug
  .split('-')
  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
  .join(' ')

let touched = 0
for (const rel of TARGETS) {
  const path = resolve(ROOT, rel)
  if (!existsSync(path)) continue
  const before = await readFile(path, 'utf8')
  let after = before
  // package.json: rename `"name"` field
  if (rel === 'package.json') {
    after = after.replace(
      /"name":\s*"[^"]+"/,
      `"name": ${JSON.stringify(slug)}`,
    )
  }
  // Replace user-facing brand strings.
  after = after.replace(/\bAlbo\b/g, display)
  after = after.replace(/\balbo\b/g, slug)
  if (after !== before) {
    await writeFile(path, after)
    touched += 1
    console.log(`✓ ${rel}`)
  }
}

if (touched === 0) {
  console.log('Nothing to rename — already personalized?')
} else {
  console.log(`Rebranded ${touched} file${touched > 1 ? 's' : ''}.`)
}

if (resetGit) {
  console.log('Resetting git history…')
  await rm(resolve(ROOT, '.git'), { recursive: true, force: true })
  execSync('git init -b main', { cwd: ROOT, stdio: 'inherit' })
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' })
  execSync('git commit -m "chore: scaffold from albo-ouvre-boite"', {
    cwd: ROOT,
    stdio: 'inherit',
  })
  console.log('Done. Set a remote with `git remote add origin …` when ready.')
}
