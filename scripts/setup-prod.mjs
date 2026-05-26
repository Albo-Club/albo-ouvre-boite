#!/usr/bin/env node
/**
 * Provision a Convex production deployment for this template.
 *
 * Usage:
 *   node scripts/setup-prod.mjs
 *
 * What it does:
 *   1. Prompts for your prod domain (e.g. https://app.example.com).
 *   2. Reads your dev Convex env vars (`convex env list`).
 *   3. Mirrors the secrets (RESEND_*, ANTHROPIC_*, optional SENTRY_DSN and
 *      optional Google OAuth credentials) onto the prod deployment, sets
 *      APP_ENV=production, SITE_URL + BETTER_AUTH_URL to the chosen domain,
 *      generates a FRESH BETTER_AUTH_SECRET (never reused from dev), and
 *      RESEND_TEST_MODE=false.
 *   4. Asks for confirmation, then runs `convex env set --prod` for each
 *      and `convex deploy` to push the backend.
 *
 * What it does NOT do:
 *   - Touch Vercel. You still need to:
 *       pnpm dlx vercel@latest link
 *       pnpm dlx vercel@latest env add VITE_CONVEX_URL       production
 *       pnpm dlx vercel@latest env add VITE_CONVEX_SITE_URL  production
 *       pnpm dlx vercel@latest --prod   # rebuild so VITE_* gets inlined
 *
 * Why fresh BETTER_AUTH_SECRET: reusing the dev secret in prod means a
 * dev session token would also unlock prod (and vice versa). Always
 * separate.
 */

import { execSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const rl = readline.createInterface({ input, output })
const ask = (q) => rl.question(q)

function listDevEnv() {
  try {
    const raw = execSync('pnpm exec convex env list', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const map = new Map()
    for (const line of raw.split('\n')) {
      const idx = line.indexOf('=')
      if (idx === -1) continue
      map.set(line.slice(0, idx).trim(), line.slice(idx + 1))
    }
    return map
  } catch (e) {
    console.error(
      '\n❌ Could not read dev env. Run `pnpm exec convex dev` once first ' +
        'to provision the dev deployment, then re-run this script.\n',
    )
    process.exit(1)
  }
}

function setProdEnv(key, value) {
  const r = spawnSync(
    'pnpm',
    ['exec', 'convex', 'env', 'set', '--prod', key, value],
    { stdio: 'inherit' },
  )
  if (r.status !== 0) {
    console.error(`❌ Failed to set ${key} on prod`)
    process.exit(1)
  }
}

async function main() {
  console.log('\n  Convex prod setup\n')

  const domain = (
    await ask('Prod domain (e.g. https://app.example.com): ')
  ).trim()
  if (!/^https:\/\/[^\s/]+$/.test(domain)) {
    console.error('❌ Must be a full `https://...` URL with no trailing slash.')
    process.exit(1)
  }

  console.log('\n  Reading dev env vars…')
  const dev = listDevEnv()

  const missing = ['RESEND_API_KEY', 'RESEND_FROM', 'ANTHROPIC_API_KEY'].filter(
    (k) => !dev.get(k),
  )
  if (missing.length) {
    console.error(
      `\n❌ Missing on dev: ${missing.join(', ')}.\n` +
        'Set them on dev first (so this script can mirror them), e.g.:\n' +
        '  pnpm exec convex env set RESEND_API_KEY re_...\n',
    )
    process.exit(1)
  }

  const plan = {
    APP_ENV: 'production',
    SITE_URL: domain,
    BETTER_AUTH_URL: domain,
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    RESEND_API_KEY: dev.get('RESEND_API_KEY'),
    RESEND_FROM: dev.get('RESEND_FROM'),
    RESEND_TEST_MODE: 'false',
    ANTHROPIC_API_KEY: dev.get('ANTHROPIC_API_KEY'),
  }
  for (const k of [
    'ANTHROPIC_MODEL',
    'SENTRY_DSN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]) {
    const v = dev.get(k)
    if (v) plan[k] = v
  }
  const googleMirrored = !!plan.GOOGLE_CLIENT_ID

  console.log('\n  Will set on prod:')
  for (const [k, v] of Object.entries(plan)) {
    const sensitive =
      k.includes('SECRET') || k.includes('KEY') || k.includes('TOKEN')
    console.log(`    ${k} = ${sensitive ? '<redacted>' : v}`)
  }

  const ok = (await ask('\nProceed? [y/N] ')).trim().toLowerCase()
  if (ok !== 'y' && ok !== 'yes') {
    console.log('Aborted.')
    rl.close()
    return
  }
  rl.close()

  console.log('\n  Setting env vars on prod…')
  for (const [k, v] of Object.entries(plan)) {
    setProdEnv(k, v)
  }

  console.log('\n  Deploying Convex prod (re-deploys functions with new env)…')
  const dep = spawnSync('pnpm', ['exec', 'convex', 'deploy'], {
    stdio: 'inherit',
  })
  if (dep.status !== 0) {
    console.error('❌ `convex deploy` failed — fix the error above and re-run.')
    process.exit(1)
  }

  console.log(`
  ✅ Convex prod is provisioned.

  Next (frontend on Vercel):

    pnpm dlx vercel@latest link
    pnpm dlx vercel@latest env add VITE_CONVEX_URL       production
    pnpm dlx vercel@latest env add VITE_CONVEX_SITE_URL  production
    pnpm dlx vercel@latest --prod

  VITE_CONVEX_URL must point at the prod deployment (https://*.convex.cloud
  from the Convex dashboard), NOT your dev one. VITE_CONVEX_SITE_URL is
  the same URL with .site instead of .cloud.

  Then test a magic link from ${domain}. The link should point at
  ${domain}/api/auth/magic-link/verify (not localhost).
`)

  if (googleMirrored) {
    console.log(`  ⚠️  Google OAuth was mirrored to prod. In Google Cloud Console,
      on the SAME OAuth client you use for dev, add these alongside the
      existing localhost entries:

        Authorized redirect URI:  ${domain}/api/auth/callback/google
        Authorized JS origin:     ${domain}

      Until both prod URIs are registered, Google sign-in returns
      redirect_uri_mismatch.
`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
