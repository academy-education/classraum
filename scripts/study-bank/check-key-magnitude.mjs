#!/usr/bin/env node
/**
 * check-key-magnitude.mjs — is the key's VALUE RANK predictable?
 *
 * Found 2026-09-04 by a with-source grader reading three math batches as a
 * set: the key was the largest option in only 7 of 62 numeric items (11%
 * against a 25% control), and 1 of 18 in one batch. "Eliminate the largest
 * option" is then a free elimination on nearly every item.
 *
 * The cause is the authoring brief, not chance: the "forgot the last step /
 * didn't convert the unit" distractor is systematically LARGER than the key
 * (8640 seconds, 108 dollars, 28 km, 20000 members). Reshuffling letters does
 * not fix it — SAT and ACT both list options in ascending order, so the fix is
 * to vary which direction the incomplete answer points.
 *
 * This is decidable arithmetic, so it is measured over the whole population
 * rather than sampled — the rule this repo already applies to the hub.
 *
 *   node scripts/study-bank/check-key-magnitude.mjs --selftest
 *   node scripts/study-bank/check-key-magnitude.mjs <batch.json>...
 *   node scripts/study-bank/check-key-magnitude.mjs --bank [family] [section]
 */
import { readFileSync } from 'node:fs'

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-key-magnitude.mjs')

/** Parse an option to a number; null when it is not purely numeric. */
export function value(s) {
  const t = String(s ?? '').trim().replace(/[\s,$%]/g, '')
  if (/^-?\d+\/-?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b === 0 ? null : a / b }
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t)
  return null
}

/** rank 1 = smallest. null when the set is not fully numeric or has ties. */
export function keyRank(choices, key) {
  const vals = choices.map(value)
  if (vals.some(v => v === null)) return null
  if (new Set(vals).size !== vals.length) return null
  const ki = choices.indexOf(key)
  if (ki < 0) return null
  const sorted = [...vals].sort((a, b) => a - b)
  return { rank: sorted.indexOf(vals[ki]) + 1, n: vals.length }
}

function report(label, rows) {
  const scored = rows.map(r => keyRank(r.choices, r.key)).filter(Boolean)
  if (!scored.length) { console.log(`${label.padEnd(34)} no fully-numeric option sets`); return }
  const n = scored.length
  const hist = {}
  for (const s of scored) hist[s.rank] = (hist[s.rank] ?? 0) + 1
  // Option count comes from the DATA, not a hardcoded 4. This printed ranks
  // 1-4 against a 25% control for SSAT, which is five-choice: rank 5 was
  // silently dropped and the percentages summed to 83%, not 100. Found by an
  // SSAT author who noticed the columns did not add up.
  const widths = [...new Set(scored.map(s => s.n))].sort()
  const k = Math.max(...widths)
  const ctrl = 100 / k
  const pct = r => (100 * (hist[r] ?? 0) / n)
  const ranks = Array.from({ length: k }, (_, i) => i + 1)
  const worst = ranks.reduce((a, r) => Math.abs(pct(r) - ctrl) > Math.abs(pct(a) - ctrl) ? r : a, 1)
  const mixed = widths.length > 1 ? `  MIXED widths ${widths.join('/')}` : ''
  console.log(`${label.padEnd(34)} ${String(n).padStart(4)} numeric   ranks ` +
    ranks.map(r => `${r}:${pct(r).toFixed(0)}%`).join(' ') +
    `   worst rank ${worst} at ${pct(worst).toFixed(1)}% vs ${ctrl.toFixed(1)}%${mixed}`)
  return { n, hist, k }
}

if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  let ok = true
  const t = (name, got, want) => {
    const pass = JSON.stringify(got) === JSON.stringify(want)
    if (!pass) ok = false
    console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
  }
  t('key is smallest', keyRank(['2', '5', '9', '14'], '2'), { rank: 1, n: 4 })
  t('key is largest', keyRank(['2', '5', '9', '14'], '14'), { rank: 4, n: 4 })
  t('order in the list does not matter', keyRank(['14', '2', '9', '5'], '9'), { rank: 3, n: 4 })
  t('currency and commas parse', keyRank(['$1,200', '$300', '$600', '$900'], '$300'), { rank: 1, n: 4 })
  t('fractions parse', keyRank(['1/2', '1/4', '3/4', '1/8'], '1/8'), { rank: 1, n: 4 })
  t('non-numeric set is skipped', keyRank(['x + 1', '2', '3', '4'], '2'), null)
  t('duplicate values are skipped', keyRank(['5', '5', '9', '14'], '9'), null)
  // control: over a set of items with the key at each rank once, the
  // histogram must be flat, so a clean bank reads 25/25/25/25.
  const flat = [1, 2, 3, 4].map(r => ({ choices: ['1', '2', '3', '4'], key: String(r) }))
  const res = report('  (control, key at each rank)', flat)
  t('control is flat', res.hist, { 1: 1, 2: 1, 3: 1, 4: 1 })
  console.log(ok ? '\nself-test passed.' : '\nSELF-TEST FAILED.')
  process.exit(ok ? 0 : 1)
}

const bankIdx = RUN_AS_CLI ? process.argv.indexOf('--bank') : -1
if (bankIdx >= 0) {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const wantFam = process.argv[bankIdx + 1], wantSec = process.argv[bankIdx + 2]
  const all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('family,section,domain,item').eq('verified', true).eq('archived', false).range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  const g = {}
  for (const r of all) {
    if (wantFam && r.family !== wantFam) continue
    if (wantSec && r.section !== wantSec) continue
    const it = r.item
    if (!Array.isArray(it?.choices) || it.correct_answer == null) continue
    ;(g[`${r.family}/${r.section}`] ??= []).push({ choices: it.choices, key: it.correct_answer })
  }
  console.log(`live bank, ${all.length} verified rows read\n`)
  const every = []
  for (const [k, rows] of Object.entries(g).sort()) { report(k, rows); every.push(...rows) }
  console.log(); report('ALL', every)
} else if (RUN_AS_CLI) {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const every = []
  for (const f of files) {
    const j = JSON.parse(readFileSync(f, 'utf8'))
    const items = Array.isArray(j) ? j : j.items
    const rows = items.filter(i => Array.isArray(i.choices)).map(i => ({ choices: i.choices, key: i.correct_answer }))
    report(f.split('/').pop().replace('.batch.json', ''), rows); every.push(...rows)
  }
  if (files.length > 1) { console.log(); report('ALL', every) }
}
