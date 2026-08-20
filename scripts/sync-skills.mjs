#!/usr/bin/env node
// Sync skills declared in skills-lock.json from their upstream GitHub repos.
//
// Each skill is pinned to an immutable commit (`pinnedRef`) and watched on a
// moving branch (`trackingRef`). This decouples *what we vendored* (a fixed
// SHA, reproducible) from *how we notice upstream moved* (the branch tip):
//
//   { source, sourceType, skillPath, trackingRef, pinnedRef, computedHash,
//     references? }
//
// We fetch raw content from github.com/<source>/<ref>/<skillPath>, hash it with
// SHA-256, and reconcile.
//
// `references` is an optional list of auxiliary files a skill links to
// (upstream increasingly splits examples out of SKILL.md). Paths are relative
// to the directory holding SKILL.md, both upstream and locally — so the
// relative Markdown links inside SKILL.md resolve unchanged after vendoring.
// They are folded into `computedHash`, so drift detection covers them too;
// with no `references` the hash stays plain SHA-256 of SKILL.md (legacy hashes
// remain valid).
//
// Folder layout produced:
//   .agents/skills/<name>/SKILL.md           (canonical content @ pinnedRef)
//   .agents/skills/<name>/<reference>        (auxiliary files, same layout)
//   .claude/skills/<name> -> ../../.agents/skills/<name>   (symlink)
//
// Two different questions, two different modes — don't conflate them:
//   --check  "has upstream moved?"      → needs the network, answer changes
//                                          without anyone touching the repo.
//   --verify "is my tree intact?"       → pure local re-hash, deterministic,
//                                          offline.
// `--check` alone is blind to a vendored file edited, truncated or left stale
// on disk: it compares the upstream tip to the lock and never reads what we
// actually shipped. That blind spot let three Convex reference files rot
// unnoticed (see KNOWN_ISSUES.md).
//
// Modes:
//   (default)   vendor each skill at its pinnedRef (reproducible, no network
//               surprise). Self-healing: a local file that no longer matches
//               `computedHash` is rewritten, so a corrupted tree repairs
//               itself without --force.
//   --verify    re-hash the vendored files and compare to `computedHash`.
//               No network, no GitHub API — safe in CI and offline.
//   --check     compare each trackingRef tip against the pinned content. Drift
//               means a newer upstream exists — a deliberate bump is due.
//               Content-only (no GitHub API), safe to run on every session.
//   --update    advance pinnedRef to the current trackingRef tip and re-vendor.
//               This is the deliberate bump; produces a reviewable diff.
//   --force     ignore hashes, re-download everything at pinnedRef.
//
// Run:
//   pnpm run sync:skills
//   pnpm run sync:skills:verify
//   pnpm run sync:skills:check
//   pnpm run sync:skills:update
//
// Exit codes:
//   0   nothing to do, or successful sync/update
//   1   network or filesystem error
//   2   drift detected and not synced (--check) or local tree corrupt
//       (--verify)

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
const verifyOnly = process.argv.includes('--verify')
const update = process.argv.includes('--update')

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const short = (sha) => (sha ? sha.slice(0, 7) : '?')

function rawUrl(source, ref, skillPath) {
  return `https://raw.githubusercontent.com/${source}/${ref}/${skillPath}`
}

// Reference paths are relative to the directory holding SKILL.md upstream.
function upstreamPath(skillPath, rel) {
  const slash = skillPath.lastIndexOf('/')
  return slash === -1 ? rel : `${skillPath.slice(0, slash + 1)}${rel}`
}

// The files a skill owns locally, relative to .agents/skills/<name>/.
function relPaths(info) {
  return ['SKILL.md', ...[...(info.references ?? [])].sort()]
}

// Hash SKILL.md bare, then each reference framed by its path. With no
// references this is byte-identical to the historical sha256(content), so
// existing lock entries keep their hash.
function combinedHash(files) {
  const h = createHash('sha256').update(files[0].content)
  for (const f of files.slice(1)) h.update(`\0${f.rel}\0`).update(f.content)
  return h.digest('hex')
}

// Every skill is fetched in parallel, and a skill with `references` multiplies
// its file count. Past ~30 simultaneous TLS handshakes raw.githubusercontent
// stops answering and undici burns its full 10s connect timeout — which blows
// the SessionStart hook budget and flakes CI. Cap in-flight requests instead of
// capping how many skills we may vendor.
const MAX_IN_FLIGHT = 8
const waiting = []
let inFlight = 0

async function withSlot(fn) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise((r) => waiting.push(r))
  inFlight += 1
  try {
    return await fn()
  } finally {
    inFlight -= 1
    waiting.shift()?.()
  }
}

async function fetchText(source, ref, path) {
  const res = await withSlot(() => fetch(rawUrl(source, ref, path)))
  if (!res.ok) return { error: `${res.status} ${rawUrl(source, ref, path)}` }
  return { content: await res.text() }
}

async function fetchSkillAt(source, ref, info) {
  const files = await Promise.all(
    relPaths(info).map(async (rel) => {
      const path =
        rel === 'SKILL.md' ? info.skillPath : upstreamPath(info.skillPath, rel)
      return { rel, ...(await fetchText(source, ref, path)) }
    }),
  )
  const failed = files.find((f) => f.error)
  if (failed) return { error: failed.error }
  return { files, hash: combinedHash(files) }
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

async function vendor(name, info, files, hash) {
  const dir = resolve(AGENTS_DIR, name)
  for (const f of files) {
    const target = resolve(dir, f.rel)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, f.content)
  }

  const linkPath = resolve(CLAUDE_DIR, name)
  if (!existsSync(linkPath)) {
    await mkdir(CLAUDE_DIR, { recursive: true })
    await symlink(relative(CLAUDE_DIR, dir), linkPath, 'dir')
  }
  info.computedHash = hash
}

function isVendored(name, info) {
  return relPaths(info).every((rel) =>
    existsSync(resolve(AGENTS_DIR, name, rel)),
  )
}

// Mirror of fetchSkillAt against the working tree: same file order, same
// framing, so the digest is comparable to `computedHash` byte for byte.
async function hashLocal(name, info) {
  const files = []
  for (const rel of relPaths(info)) {
    const path = resolve(AGENTS_DIR, name, rel)
    if (!existsSync(path)) return { missing: rel }
    files.push({ rel, content: await readFile(path, 'utf8') })
  }
  return { hash: combinedHash(files) }
}

// Offline integrity gate: does .agents/skills still hold exactly what the lock
// says we vendored? Catches hand edits, truncated files and stale copies that
// --check cannot see. No network, so it never flakes a PR.
async function runVerify(lock) {
  let broken = 0
  for (const [name, info] of Object.entries(lock.skills)) {
    if (info.sourceType !== 'github') continue

    const local = await hashLocal(name, info)
    if (local.missing) {
      console.log(
        `~ ${name}: ${local.missing} missing — run \`pnpm run sync:skills\``,
      )
      broken += 1
      continue
    }
    if (local.hash !== info.computedHash) {
      console.log(
        `~ ${name}: local content differs from skills-lock.json — run \`pnpm run sync:skills\``,
      )
      broken += 1
    }
  }

  if (broken > 0) {
    console.log(
      `${broken} skill${broken > 1 ? 's' : ''} differ from skills-lock.json.`,
    )
  } else {
    console.log('Vendored skills match skills-lock.json.')
  }
  process.exit(broken > 0 ? 2 : 0)
}

async function runCheck(lock) {
  let drift = 0
  let unreachable = 0
  await Promise.all(
    Object.entries(lock.skills)
      .filter(([, info]) => info.sourceType === 'github')
      .map(async ([name, info]) => {
        const tip = await fetchSkillAt(info.source, info.trackingRef, info)
        if (tip.error) {
          console.error(`✗ ${name}: ${tip.error}`)
          unreachable += 1
          return
        }
        if (!isVendored(name, info)) {
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

  // An unreachable skill is NOT "no drift" — it is a skill we failed to check.
  // A 404 means upstream deleted or moved it (worse than drift, not better); a
  // network blip means we know nothing. Counting it separately matters because
  // `process.exit()` overrides `process.exitCode`, so setting the latter inside
  // the loop was silently discarded here: with drift === 0 the job printed
  // "Skills up to date with upstream." and exited 0 on a tree it never checked.
  if (unreachable > 0) {
    console.log(
      `${unreachable} skill${unreachable > 1 ? 's' : ''} could not be checked against upstream.`,
    )
  }
  if (drift > 0) {
    console.log(`${drift} skill${drift > 1 ? 's' : ''} drifted from upstream.`)
  }
  if (drift === 0 && unreachable === 0) {
    console.log('Skills up to date with upstream.')
  }
  process.exit(drift > 0 || unreachable > 0 ? 2 : 0)
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

    const at = await fetchSkillAt(info.source, info.pinnedRef, info)
    if (at.error) {
      console.error(`✗ ${name}: ${at.error}`)
      process.exitCode = 1
      continue
    }

    // Rewrite when the pin moved OR when what's on disk no longer matches the
    // lock — the second case is what makes a plain `sync:skills` self-healing
    // (a missing file leaves `local.hash` undefined, which also mismatches).
    const local = await hashLocal(name, info)
    const needsWrite =
      force || at.hash !== info.computedHash || local.hash !== info.computedHash
    if (!needsWrite) continue

    await vendor(name, info, at.files, at.hash)
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
  if (verifyOnly) {
    await runVerify(lock)
  } else if (checkOnly) {
    await runCheck(lock)
  } else {
    await runSync(lock)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
