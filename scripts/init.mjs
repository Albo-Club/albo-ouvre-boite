#!/usr/bin/env node
// Personalize this template for a new project.
// Usage: pnpm run init <project-name> [--reset-git]
//
// What it does:
//  - Renames `name` in package.json to <project-name>
//  - Replaces every literal "albo" (case-preserving) in user-facing files with
//    the new brand (kebab in package.json + cookie/agent IDs, capitalized
//    elsewhere in titles and prose).
//  - Optionally resets git history to a single "chore: scaffold" commit
//    (only if --reset-git is passed).
//
// Run from the project root. Idempotent: re-running with the same name is a
// no-op once everything is renamed.
//
// Also exposes `rebrand(name)` for programmatic reuse from other scripts.

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
  'TESTING.md',
  'TEST-PLAN.md',
  'src/routes/__root.tsx',
  'src/routes/index.tsx',
  'src/routes/login.tsx',
  'src/routes/register.tsx',
  'src/routes/forgot-password.tsx',
  'src/routes/reset-password.tsx',
  'src/routes/accept-invite.$token.tsx',
  'src/routes/app/me.tsx',
  'src/routes/app/admin.tsx',
  'src/routes/app/onboarding.tsx',
  'src/routes/app/$orgSlug/index.tsx',
  'src/routes/app/$orgSlug/items.tsx',
  'src/routes/app/$orgSlug/billing.tsx',
  'src/routes/app/$orgSlug/calendar.tsx',
  'src/routes/app/$orgSlug/map.tsx',
  'src/routes/app/$orgSlug/tasks.tsx',
  'src/components/Logo.tsx',
  'convex/auth.ts',
  'convex/emailTemplates.ts',
  'convex/agent.ts',
  'scripts/test-cookies.sh',
]

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toDisplay(slug) {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Rebrand the template in place.
 * @param {string} name raw project name (gets slugified)
 * @returns {Promise<{ slug: string, display: string, touched: number }>}
 */
export async function rebrand(name) {
  const slug = toSlug(name)
  if (slug.length < 3 || slug.length > 40) {
    throw new Error('Project name must produce a 3-40 char kebab slug.')
  }
  const display = toDisplay(slug)

  let touched = 0
  for (const rel of TARGETS) {
    const path = resolve(ROOT, rel)
    if (!existsSync(path)) continue
    const before = await readFile(path, 'utf8')
    let after = before
    if (rel === 'package.json') {
      after = after.replace(
        /"name":\s*"[^"]+"/,
        `"name": ${JSON.stringify(slug)}`,
      )
    }
    after = after.replace(/\bAlbo\b/g, display)
    after = after.replace(/\balbo\b/g, slug)
    if (after !== before) {
      await writeFile(path, after)
      touched += 1
      console.log(`✓ ${rel}`)
    }
  }
  return { slug, display, touched }
}

function usage() {
  console.error('Usage: pnpm run init <project-name> [--reset-git]')
  process.exit(1)
}

async function cli() {
  const name = process.argv[2]
  const resetGit = process.argv.includes('--reset-git')
  if (!name || name.startsWith('-')) usage()

  try {
    const { touched } = await rebrand(name)
    if (touched === 0) {
      console.log('Nothing to rename — already personalized?')
    } else {
      console.log(`Rebranded ${touched} file${touched > 1 ? 's' : ''}.`)
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
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
}

// Run CLI only if invoked directly (not when imported).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await cli()
}
