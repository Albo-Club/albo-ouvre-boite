/**
 * Every tool the agent exposes has a human label in the chat locales
 * (`chat:tool.labels.<name>`), so the AI panel never shows a raw function
 * name such as `listDeals`. The list of tools is read from the
 * `export const <domain>Tools = { ... }` blocks of `convex/agentTools*.ts`;
 * a tool added there without its two labels (fr + en) fails here.
 *
 * Run with Node's native test runner via tsx (no dependency):
 *   pnpm test:unit
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONVEX_DIR = join(ROOT, 'convex')

function agentToolNames(): Array<string> {
  const names = new Set<string>()
  for (const file of readdirSync(CONVEX_DIR)) {
    if (!/^agentTools.*\.ts$/.test(file)) continue
    const src = readFileSync(join(CONVEX_DIR, file), 'utf8')
    for (const block of src.matchAll(/export const \w+Tools = \{([^}]*)\}/g)) {
      const body = block[1].replace(/\/\/[^\n]*/g, '')
      for (const entry of body.split(',')) {
        const name = entry.trim().split(/[:\s]/)[0]
        if (name) names.add(name)
      }
    }
  }
  return [...names].sort()
}

function labels(lang: 'fr' | 'en'): Record<string, string> {
  const json = JSON.parse(
    readFileSync(join(ROOT, 'src/locales', lang, 'chat.json'), 'utf8'),
  ) as { tool: { labels: Record<string, string> } }
  return json.tool.labels
}

describe('AI panel tool labels', () => {
  const tools = agentToolNames()

  it('reads the agent tool inventory', () => {
    assert.ok(tools.length >= 4, `only ${tools.length} tools found`)
    assert.ok(tools.includes('listItems'))
  })

  for (const lang of ['fr', 'en'] as const) {
    it(`every tool has a ${lang} label`, () => {
      const known = labels(lang)
      const missing = tools.filter((name) => !known[name])
      assert.deepEqual(
        missing,
        [],
        `missing ${lang} labels: ${missing.join(', ')}`,
      )
    })

    it(`no ${lang} label is orphaned`, () => {
      const orphans = Object.keys(labels(lang)).filter(
        (name) => !tools.includes(name),
      )
      assert.deepEqual(
        orphans,
        [],
        `labels without a tool: ${orphans.join(', ')}`,
      )
    })
  }
})
