#!/usr/bin/env node
/**
 * One-shot dev setup wizard.
 *
 * Usage: pnpm run setup   (NOT `pnpm setup` — that's a reserved pnpm built-in)
 *
 * What it does, in order:
 *   1. Detects whether this is still a fresh "albo" clone — if so, prompts for
 *      a project name and runs the rebrand (scripts/init.mjs#rebrand).
 *   2. Provisions the Convex dev deployment if missing (spawns `convex dev`
 *      in the foreground; user logs in via the browser, then presses Ctrl-C
 *      when "Convex functions ready!" appears).
 *   3. Computes VITE_CONVEX_SITE_URL from VITE_CONVEX_URL (deterministic
 *      .cloud → .site swap) and writes it to .env.local if missing.
 *   4. Prompts for ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM (with
 *      direct dashboard URLs printed inline so the user knows where to look).
 *   5. Generates a fresh BETTER_AUTH_SECRET.
 *   6. Confirms the plan with the user (secrets masked), then applies all
 *      env vars via `convex env set` in one batch.
 *
 * Idempotent — re-run it any time; each step skips if already done.
 */

import { execSync, spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import readline from 'node:readline/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { rebrand } from './init.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const ENV_LOCAL = resolve(ROOT, '.env.local')

const C = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => rl.question(q)

function ok(msg) {
  console.log(`${C.green}✓${C.reset} ${msg}`)
}
function info(msg) {
  console.log(`${C.cyan}→${C.reset} ${msg}`)
}
function warn(msg) {
  console.log(`${C.yellow}!${C.reset} ${msg}`)
}
function fail(msg) {
  console.error(`${C.red}✗${C.reset} ${msg}`)
}
function section(title) {
  console.log(`\n${C.bold}${title}${C.reset}`)
}

function mask(v) {
  if (!v) return ''
  if (v.length <= 8) return '••••'
  return `${v.slice(0, 4)}…${v.slice(-4)}`
}

async function parseEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return {}
  const raw = await readFile(ENV_LOCAL, 'utf8')
  const map = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const k = trimmed.slice(0, idx).trim()
    let v = trimmed.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    map[k] = v
  }
  return map
}

async function setEnvLocal(key, value) {
  const exists = existsSync(ENV_LOCAL)
  const current = exists ? await readFile(ENV_LOCAL, 'utf8') : ''
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(current)) {
    await writeFile(ENV_LOCAL, current.replace(re, `${key}=${value}`))
  } else {
    const prefix = exists && !current.endsWith('\n') ? '\n' : ''
    await appendFile(ENV_LOCAL, `${prefix}${key}=${value}\n`)
  }
}

function listConvexEnv() {
  try {
    const raw = execSync('pnpm exec convex env list', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const map = {}
    for (const line of raw.split('\n')) {
      const idx = line.indexOf('=')
      if (idx === -1) continue
      map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
    return map
  } catch {
    return null
  }
}

function setConvexEnv(key, value) {
  const r = spawnSync('pnpm', ['exec', 'convex', 'env', 'set', key, value], {
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    const out = (r.stderr?.toString() || r.stdout?.toString() || '').trim()
    fail(`Failed to set ${key} on Convex dev${out ? `: ${out}` : ''}`)
    process.exit(1)
  }
}

// Step 1 — rebrand if still on "albo"
async function maybeRebrand() {
  section('1/4  Project name')
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'))
  if (!/^albo[-_]?/.test(pkg.name)) {
    ok(`Already renamed to "${pkg.name}" — skipping rebrand`)
    return
  }
  info('Looks like a fresh template clone — let\'s pick a name.')
  console.log(
    `  ${C.dim}Used as: package name, page titles, agent identity, cookie prefix.${C.reset}`,
  )
  let name = ''
  while (!name) {
    const raw = (await ask('  Project name (3–40 chars, e.g. "moonshot"): ')).trim()
    if (!raw) continue
    try {
      const result = await rebrand(raw)
      ok(`Rebranded ${result.touched} file${result.touched > 1 ? 's' : ''} → "${result.slug}"`)
      name = result.slug
    } catch (err) {
      warn(err.message)
    }
  }
}

// Step 2 — provision Convex dev (idempotent)
async function bootstrapConvex() {
  section('2/4  Convex backend')
  const env = await parseEnvLocal()
  if (env.CONVEX_DEPLOYMENT && env.VITE_CONVEX_URL) {
    ok(`Convex already provisioned (${env.CONVEX_DEPLOYMENT})`)
  } else {
    console.log(`
  We need to provision your Convex dev deployment.
  A browser will open for Convex login (first time only).
  When you see ${C.green}"Convex functions ready!"${C.reset} press ${C.bold}Ctrl-C${C.reset}
  here to return to the setup.
`)
    await ask(`  ${C.dim}Press ENTER to launch \`convex dev\`…${C.reset}`)

    // Pause our readline so it doesn't eat the child's input.
    rl.pause()
    // Swallow SIGINT in parent — Ctrl-C should only kill convex dev.
    const swallow = () => {}
    process.on('SIGINT', swallow)
    await new Promise((done) => {
      const child = spawn('pnpm', ['exec', 'convex', 'dev'], { stdio: 'inherit' })
      child.on('exit', () => done(null))
    })
    process.off('SIGINT', swallow)
    rl.resume()

    const after = await parseEnvLocal()
    if (!after.CONVEX_DEPLOYMENT || !after.VITE_CONVEX_URL) {
      fail(`Convex bootstrap incomplete — .env.local is missing CONVEX_DEPLOYMENT or VITE_CONVEX_URL.

  Try running ${C.bold}pnpm exec convex dev${C.reset} manually to debug, then re-run ${C.bold}pnpm run setup${C.reset}.`)
      process.exit(1)
    }
    ok(`Convex provisioned (${after.CONVEX_DEPLOYMENT})`)
  }

  // Compute VITE_CONVEX_SITE_URL if missing.
  const env2 = await parseEnvLocal()
  if (!env2.VITE_CONVEX_SITE_URL) {
    const siteUrl = env2.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site')
    await setEnvLocal('VITE_CONVEX_SITE_URL', siteUrl)
    ok(`Wrote VITE_CONVEX_SITE_URL=${siteUrl} to .env.local`)
  }
}

// Step 3 — collect secrets
async function promptSecrets() {
  section('3/4  API keys')
  const cx = listConvexEnv()
  if (cx === null) {
    fail('Could not read Convex env. Is `convex dev` reachable?')
    process.exit(1)
  }

  const plan = {}

  // Anthropic
  if (cx.ANTHROPIC_API_KEY) {
    ok(`ANTHROPIC_API_KEY already set (${mask(cx.ANTHROPIC_API_KEY)})`)
  } else {
    console.log(
      `\n  ${C.bold}Anthropic API key${C.reset} — for the AI chat agent.\n  ${C.cyan}→ Get yours: https://console.anthropic.com/settings/keys${C.reset}`,
    )
    let key = ''
    while (!key) {
      const raw = (await ask('  ANTHROPIC_API_KEY: ')).trim()
      if (!raw) continue
      if (!raw.startsWith('sk-ant-')) {
        warn('Expected format: sk-ant-… (try again, or paste anyway)')
        const confirm = (await ask('  Use it anyway? [y/N] ')).trim().toLowerCase()
        if (confirm !== 'y' && confirm !== 'yes') continue
      }
      key = raw
    }
    plan.ANTHROPIC_API_KEY = key
  }

  // Resend
  if (cx.RESEND_API_KEY) {
    ok(`RESEND_API_KEY already set (${mask(cx.RESEND_API_KEY)})`)
  } else {
    console.log(
      `\n  ${C.bold}Resend API key${C.reset} — for transactional emails (magic links, invitations).\n  ${C.cyan}→ Get yours: https://resend.com/api-keys${C.reset}`,
    )
    let key = ''
    while (!key) {
      const raw = (await ask('  RESEND_API_KEY: ')).trim()
      if (!raw) continue
      if (!raw.startsWith('re_')) {
        warn('Expected format: re_… (try again, or paste anyway)')
        const confirm = (await ask('  Use it anyway? [y/N] ')).trim().toLowerCase()
        if (confirm !== 'y' && confirm !== 'yes') continue
      }
      key = raw
    }
    plan.RESEND_API_KEY = key
  }

  // Resend FROM
  if (cx.RESEND_FROM) {
    ok(`RESEND_FROM already set (${cx.RESEND_FROM})`)
  } else {
    console.log(
      `\n  ${C.bold}Resend sender email${C.reset} — must come from a verified domain in prod.\n  ${C.cyan}→ Verify a domain: https://resend.com/domains${C.reset}\n  ${C.dim}For dev, "onboarding@resend.dev" works out of the box.${C.reset}`,
    )
    const raw = (await ask('  RESEND_FROM [onboarding@resend.dev]: ')).trim()
    plan.RESEND_FROM = raw || 'onboarding@resend.dev'
  }

  // Better Auth secret (auto)
  if (cx.BETTER_AUTH_SECRET) {
    ok('BETTER_AUTH_SECRET already set')
  } else {
    plan.BETTER_AUTH_SECRET = randomBytes(32).toString('hex')
    ok('BETTER_AUTH_SECRET generated (32-byte hex)')
  }

  // Google OAuth (optional) — the "Continue with Google" button only ships
  // when both credentials are set. Safe to skip; everything else still works.
  if (cx.GOOGLE_CLIENT_ID && cx.GOOGLE_CLIENT_SECRET) {
    ok('Google OAuth already configured')
  } else {
    const redirectBase = cx.SITE_URL || 'http://localhost:3000'
    console.log(
      `\n  ${C.bold}Google OAuth${C.reset} ${C.dim}(optional)${C.reset} — adds a "Continue with Google" button.\n  ${C.cyan}→ Create an OAuth client: https://console.cloud.google.com/apis/credentials${C.reset}\n  ${C.dim}Authorized redirect URI: ${redirectBase}/api/auth/callback/google${C.reset}\n  ${C.dim}Press Enter to skip.${C.reset}`,
    )
    const id = (await ask('  GOOGLE_CLIENT_ID [skip]: ')).trim()
    if (id) {
      const secret = (await ask('  GOOGLE_CLIENT_SECRET: ')).trim()
      if (secret) {
        plan.GOOGLE_CLIENT_ID = id
        plan.GOOGLE_CLIENT_SECRET = secret
      } else {
        warn('No client secret entered — skipping Google OAuth.')
      }
    }
  }

  // Required dev defaults
  if (!cx.SITE_URL) plan.SITE_URL = 'http://localhost:3000'
  if (!cx.APP_ENV) plan.APP_ENV = 'development'
  if (!cx.RESEND_TEST_MODE) plan.RESEND_TEST_MODE = 'true'

  return plan
}

// Step 4 — confirm + apply
async function applyPlan(plan) {
  section('4/4  Apply')
  const keys = Object.keys(plan)
  if (keys.length === 0) {
    ok('Nothing to apply — Convex dev env is already complete.')
    return
  }
  console.log('  Will set on Convex dev env:')
  for (const k of keys) {
    const sensitive = k.includes('SECRET') || k.includes('KEY') || k.includes('TOKEN')
    console.log(`    ${k} = ${sensitive ? mask(plan[k]) : plan[k]}`)
  }
  const go = (await ask('\n  Apply now? [Y/n] ')).trim().toLowerCase()
  if (go && go !== 'y' && go !== 'yes') {
    warn('Aborted. Re-run `pnpm run setup` whenever you\'re ready.')
    return
  }
  for (const k of keys) {
    setConvexEnv(k, plan[k])
    ok(`Set ${k}`)
  }
}

async function main() {
  console.log(`\n${C.bold}  Dev setup wizard${C.reset}  ${C.dim}(idempotent — safe to re-run)${C.reset}`)

  await maybeRebrand()
  await bootstrapConvex()
  const plan = await promptSecrets()
  await applyPlan(plan)
  rl.close()

  console.log(`
${C.green}${C.bold}✓ Setup complete!${C.reset}

  ${C.bold}Next:${C.reset}

    ${C.cyan}pnpm dev${C.reset}    ${C.dim}# starts Vite + convex dev concurrently${C.reset}

  Then open ${C.bold}http://localhost:3000${C.reset} and create your first account.
  ${C.dim}The first user across the deployment becomes superAdmin automatically.${C.reset}
`)
}

// Run only when invoked directly (`node scripts/setup.mjs`), not on import.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
