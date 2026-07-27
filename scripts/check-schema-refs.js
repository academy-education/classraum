#!/usr/bin/env node
/**
 * Check every supabase select in this codebase against the real database.
 *
 * PostgREST answers a query naming a nonexistent column with an error and
 * no rows. Callers here overwhelmingly fall back to `[]` or `0`, so the
 * screen shows an empty list or a zero and nothing anywhere says
 * "broken". That is how `academy_subscriptions.plan_name` (the column is
 * plan_tier), `users.academy_id` (does not exist — it broke every
 * subscription endpoint), `teachers.id` (the PK is user_id — it emptied
 * the sessions teacher picker) and a whole `student_payments` table that
 * was never created all survived in shipped code.
 *
 * Each select is sent WHOLE, exactly as written, with limit=0. That is
 * deliberate: an earlier version of this script checked columns one at a
 * time and therefore could not see relationship embeds. It passed clean
 * while `invoices.select('..., academies(name)')` was failing in
 * production with "Could not find a relationship between 'invoices' and
 * 'academies'" — PostgREST builds embeds from foreign keys, and that one
 * was missing. Sending the real select catches bad columns and bad
 * embeds together, and costs one request instead of N.
 *
 * Not a jest test on purpose: it needs real credentials, and CI must not
 * hold those. Run it after schema changes, and before trusting any
 * number on a dashboard.
 *
 *   node scripts/check-schema-refs.js
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local.
 *
 * REMAINING BLIND SPOTS, so nobody reads a clean run as more than it is:
 *   - selects built from template literals are skipped (unverifiable
 *     statically)
 *   - `.eq()` / `.order()` / `.in()` column names are not checked, only
 *     the select list
 *   - a passing select says the SHAPE is valid, not that RLS lets any
 *     particular user see rows
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = process.cwd()

function loadEnv() {
  const txt = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const env = {}
  for (const line of txt.split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

/** Every (table, select, site) triple the codebase issues. */
function collect() {
  const found = []
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next') continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(ts|tsx)$/.test(e.name)) continue
      if (/__tests__|\.test\./.test(p)) continue
      const src = fs.readFileSync(p, 'utf8')
      const re = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)([\s\S]{0,400}?)\.select\(\s*(['"`])([\s\S]*?)\3/g
      let m
      while ((m = re.exec(src))) {
        const [, table, between, , rawSelect] = m
        if (between.includes('.from(')) continue   // a different .from intervened
        if (rawSelect.includes('${')) continue     // dynamic, unverifiable
        // Collapse the whitespace of multi-line template selects.
        const select = rawSelect.replace(/\s+/g, '')
        if (!select) continue
        found.push({
          file: p.replace(ROOT + '/', ''),
          line: src.slice(0, m.index).split('\n').length,
          table,
          select,
        })
      }
    }
  }
  walk(path.join(ROOT, 'src'))
  return found
}

;(async () => {
  const env = loadEnv()
  const URL = env.NEXT_PUBLIC_SUPABASE_URL
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL || !KEY) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(2)
  }
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

  const selects = collect()
  console.log(`Checking ${selects.length} selects across ` +
    `${new Set(selects.map(s => s.table)).size} tables…`)

  const broken = []
  // Cache by (table, select): the same query often appears in several files,
  // but every SITE is still reported — deduping by query alone once hid two
  // further `teachers.id` call sites behind the first one found.
  const seen = new Map()
  for (const s of selects) {
    const key = `${s.table}?${s.select}`
    if (!seen.has(key)) {
      const r = await fetch(
        `${URL}/rest/v1/${s.table}?select=${encodeURIComponent(s.select)}&limit=0`, { headers })
      seen.set(key, r.ok ? null : ((await r.json().catch(() => ({}))).message || `HTTP ${r.status}`))
    }
    const err = seen.get(key)
    if (err) broken.push({ ...s, message: err })
  }

  if (!broken.length) {
    console.log(`OK — all ${selects.length} selects resolve against the live schema.`)
    return
  }
  console.error(`\n${broken.length} BROKEN select(s):\n`)
  for (const b of broken) {
    console.error(`  ${b.file}:${b.line}\n    from('${b.table}').select('${b.select.slice(0, 90)}')\n    → ${b.message}\n`)
  }
  process.exit(1)
})()
