#!/usr/bin/env node
// Sync skills declared in skills-lock.json from their upstream GitHub repos.
//
// Each skill is pinned to an immutable commit (`pinnedRef`) and watched on a
// moving branch (`trackingRef`). This decouples *what we vendored* (a fixed
// SHA, reproducible) from *how we notice upstream moved* (the branch tip):
//
//   { source, sourceType, skillPath, trackingRef, pinnedRef, computedHash }
//
// We fetch raw content from github.com/<source>/<ref>/<skillPath>, hash it with
// SHA-256, and reconcile.
//
// Folder layout produced:
//   .agents/skills/<name>/SKILL.md           (canonical content @ pinnedRef)
//   .claude/skills/<name> -> ../../.agents/skills/<name>   (symlink)
//
// Modes:
//   (default)   vendor each skill at its pinnedRef (reproducible, no network
//               surprise). Use after a fresh clone or to repair the tree.
//   --check     compare each trackingRef tip against the pinned content. Drift
//               means a newer upstream exists — a deliberate bump is due.
//               Content-only (no GitHub API), safe to run on every session.
//   --update    advance pinnedRef to the current trackingRef tip and re-vendor.
//               This is the deliberate bump; produces a reviewable diff.
//   --force     ignore hashes, re-download everything at pinnedRef.
//
// Run:
//   pnpm run sync:skills
//   pnpm run sync:skills:check
//   pnpm run sync:skills:update
//
// Exit codes:
//   0   nothing to do, or successful sync/update
//   1   network or filesystem error
//   2   skill drift detected and not synced (when run with --check)

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const LOCK_PATH = resolve(ROOT, 'skills-lock.json')
const AGENTS_DIR = resolve(ROOT, '.agents/skills')
const CLAUDE_DIR = resolve(ROOT, '.claude/skills')

const force = process.argv.includes('--force')
const checkOnly = process.argv.includes('--check')
const update = process.argv.includes('--update')

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const short = (sha) => (sha ? sha.slice(0, 7) : '?')

function rawUrl(source, ref, skillPath) {
  return `https://raw.githubusercontent.com/${source}/${ref}/${skillPath}`
}

async function fetchHashAt(source, ref, skillPath) {
  const res = await fetch(rawUrl(source, ref, skillPath))
  if (!res.ok) {
    return { error: `${res.status} ${rawUrl(source, ref, skillPath)}` }
  }
  const content = await res.text()
  const hash = createHash('sha256').update(content).digest('hex')
  return { content, hash }
}

// Resolve a branch/tag to an immutable commit SHA via the GitHub API.
// Only used by --update (never by --check), so it stays off the hot path.
async function resolveTip(source, trackingRef) {
  const url = `https://api.github.com/repos/${source}/commits/${trackingRef}`
  const headers = { Accept: 'application/vnd.github.sha' }
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`
  const res = await fetch(url, { headers })
  if (!res.ok)
    throw new Error(`resolve ${source}@${trackingRef}: ${res.status}`)
  return (await res.text()).trim()
}

async function vendor(name, info, content, hash) {
  const dir = resolve(AGENTS_DIR, name)
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, 'SKILL.md'), content)

  const linkPath = resolve(CLAUDE_DIR, name)
  if (!existsSync(linkPath)) {
    await mkdir(CLAUDE_DIR, { recursive: true })
    await symlink(relative(CLAUDE_DIR, dir), linkPath, 'dir')
  }
  info.computedHash = hash
}

async function runCheck(lock) {
  let drift = 0
  await Promise.all(
    Object.entries(lock.skills)
      .filter(([, info]) => info.sourceType === 'github')
      .map(async ([name, info]) => {
        const filePath = resolve(AGENTS_DIR, name, 'SKILL.md')
        const tip = await fetchHashAt(
          info.source,
          info.trackingRef,
          info.skillPath,
        )
        if (tip.error) {
          console.error(`✗ ${name}: ${tip.error}`)
          process.exitCode = 1
          return
        }
        if (!existsSync(filePath)) {
          console.log(
            `~ ${name}: missing locally — run \`pnpm run sync:skills\``,
          )
          drift += 1
          return
        }
        if (tip.hash !== info.computedHash) {
          console.log(
            `~ ${name}: ${info.trackingRef} moved since pinned ${short(info.pinnedRef)} — run \`pnpm run sync:skills:update\``,
          )
          drift += 1
        }
      }),
  )

  if (drift > 0) {
    console.log(`${drift} skill${drift > 1 ? 's' : ''} drifted from upstream.`)
  } else {
    console.log('Skills up to date with upstream.')
  }
  process.exit(drift > 0 ? 2 : 0)
}

async function runSync(lock) {
  let changed = 0
  for (const [name, info] of Object.entries(lock.skills)) {
    if (info.sourceType !== 'github') continue

    // --update advances the pin to the current tracking tip before vendoring.
    if (update) {
      const tip = await resolveTip(info.source, info.trackingRef)
      if (tip !== info.pinnedRef) {
        console.log(`↑ ${name}: ${short(info.pinnedRef)} → ${short(tip)}`)
        info.pinnedRef = tip
      }
    }

    const at = await fetchHashAt(info.source, info.pinnedRef, info.skillPath)
    if (at.error) {
      console.error(`✗ ${name}: ${at.error}`)
      process.exitCode = 1
      continue
    }

    const filePath = resolve(AGENTS_DIR, name, 'SKILL.md')
    const needsWrite =
      force || at.hash !== info.computedHash || !existsSync(filePath)
    if (!needsWrite) continue

    await vendor(name, info, at.content, at.hash)
    changed += 1
    console.log(`✓ ${name} @ ${short(info.pinnedRef)}`)
  }

  if (changed > 0) {
    await writeFile(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n')
    console.log(
      `Updated skills-lock.json (${changed} skill${changed > 1 ? 's' : ''})`,
    )
  } else {
    console.log('Skills up to date.')
  }
}

async function main() {
  const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8'))
  if (checkOnly) {
    await runCheck(lock)
  } else {
    await runSync(lock)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
