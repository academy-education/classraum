#!/usr/bin/env node
/**
 * Check every column this codebase selects against the real database.
 *
 * PostgREST answers a query naming a nonexistent column with an error and
 * no rows. Callers overwhelmingly fall back to `[]` or `0`, so the screen
 * shows an empty list or a zero and nothing anywhere says "broken". That
 * is how `academy_subscriptions.plan_name` (the column is `plan_tier`),
 * `users.academy_id` (does not exist — it broke every subscription
 * endpoint) and a whole `student_payments` table that was never created
 * all survived in shipped code.
 *
 * Not a jest test on purpose: it needs real credentials, and CI must not
 * hold those. Run it by hand after schema changes, and before trusting
 * any number on a dashboard.
 *
 *   node scripts/check-schema-refs.js
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local.
 *
 * KNOWN GAP: this validates scalar columns only. A relationship embed
 * with no foreign key behind it — `notifications` selecting
 * `classroom:classrooms(...)` — fails with PGRST200 and is NOT caught
 * here. One such break was found by hand; there may be others.
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

/** Top-level columns of a PostgREST select string, minus embed bodies. */
function parseSelect(sel) {
  let depth = 0
  let flat = ''
  for (const ch of sel) {
    if (ch === '(') { depth++; continue }
    if (ch === ')') { depth--; continue }
    if (depth === 0) flat += ch
  }
  return flat.split(',').map(s => s.trim()).filter(Boolean)
    .map(s => s.replace(/!inner|!left/g, ''))
    .map(s => (s.includes(':') ? s.split(':')[1].trim() : s))
    .map(s => s.split('.')[0].trim())
    .filter(s => s && s !== '*' && !s.startsWith('count') && /^[a-z_][a-z0-9_]*$/.test(s))
}

function collect() {
  const pairs = new Map()
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
        const [, table, between, , sel] = m
        if (between.includes('.from(')) continue   // a different .from intervened
        if (sel.includes('${')) continue           // dynamic select, unverifiable
        const line = src.slice(0, m.index).split('\n').length
        for (const col of parseSelect(sel)) {
          // Keyed by ref AND site: the same broken column usually appears
          // in several files, and reporting only the first hides the rest.
          // `teachers.id` had three call sites; an earlier version of this
          // script deduped by column alone and showed one.
          const key = `${table}.${col}@${p}:${line}`
          pairs.set(key, { file: p.replace(ROOT + '/', ''), line, table, col })
        }
      }
    }
  }
  walk(path.join(ROOT, 'src'))
  return [...pairs.values()]
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
  const refs = collect()
  console.log(`Checking ${refs.length} table.column references…`)

  const tableCache = new Map()
  const isTable = async name => {
    if (!tableCache.has(name)) {
      const r = await fetch(`${URL}/rest/v1/${name}?limit=0`, { headers })
      tableCache.set(name, r.ok)
    }
    return tableCache.get(name)
  }

  const broken = []
  for (const ref of refs) {
    const r = await fetch(
      `${URL}/rest/v1/${ref.table}?select=${encodeURIComponent(ref.col)}&limit=0`, { headers })
    if (r.ok) continue
    // A "column" that is itself a table is a relationship embed, not a column.
    if (await isTable(ref.col)) continue
    const body = await r.json().catch(() => ({}))
    broken.push({ ...ref, message: (body.message || '').slice(0, 100) })
  }

  if (!broken.length) {
    console.log('OK — every column reference resolves against the live schema.')
    return
  }
  console.error(`\n${broken.length} BROKEN reference(s):\n`)
  for (const b of broken) {
    console.error(`  ${b.file}:${b.line}\n    ${b.table}.${b.col} — ${b.message}`)
  }
  process.exit(1)
})()
