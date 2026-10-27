#!/usr/bin/env node
/**
 * Stage MAP Science batch 1 (verified=false) as THREE cohorts, one per area, so each gets its own L1 spot
 * (MAP-SCIENCE-B1.prereg.md): map-science-v1-life / -phys / -earth. Built on stage-map-science-pilot.mjs (same
 * row shape, same hash, which covers the graphic and the passage), with the batch-1 checker rules.
 *
 *   node scripts/study-bank/stage-map-science-b1.mjs <12 author files> --cleared <cleared.json> [--apply]
 *   node scripts/study-bank/stage-map-science-b1.mjs --selftest          # no DB
 *
 * Refuses (exit 1, nothing written): a missing autonomy-methods entry for any of the three cohorts; any item
 * sci-check (rules b1, slots science-b1/slots.json, the b1 exclusions file) refuses; an EMPTY slot; an id in
 * --cleared that is not in the files; a duplicate content hash inside the batch or already in the bank.
 * Items not in --cleared are dropped and listed. Dry run by default.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, loadExclusions } from './map-v2-work/science-pilot/sci-check.mjs'
import { toRow as pilotRow } from './stage-map-science-pilot.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const B1DIR = join(HERE, 'map-v2-work/science-b1')
export const METHOD_ID = 'map-sci-b1-agents+cfg-v2'
export const COHORT_OF = { 'Life Science': 'map-science-v1-life', 'Physical Science': 'map-science-v1-phys', 'Earth and Space Science': 'map-science-v1-earth' }

export function toRow(it) {
  const r = pilotRow(it)
  r.cohort = COHORT_OF[it.map_area]
  r.verify_meta.method_id = METHOD_ID
  r.verify_meta.map.option_roles = it.option_roles ?? null
  r.verify_meta.draft.qc.note = 'MAP Science batch 1: 12 Claude agent authors (map-v2-work/science-b1/BRIEF.md, seeded slots), sci-check.mjs --rules b1 per item and --batch; two with-source graders on the slot-free brief + grader v2 pre-screen, drop rules per MAP-SCIENCE-B1.prereg.md. Options-only and figure-covered REPORT-ONLY. Route: one L1 spot of 12 per area cohort.'
  r.verify_meta.draft.authored.prior_free = it.prior_free ?? null
  return r
}

export function plan(raw, { slots, exclusions, cleared, methods }) {
  for (const c of Object.values(COHORT_OF)) if (methods?.[c]?.method_id !== METHOD_ID) throw `autonomy-methods.json has no ${c} entry with method_id ${METHOD_ID}`
  const problems = []
  for (const it of raw) {
    if (it?.empty) { problems.push(`${it.id}: EMPTY slot cannot be staged`); continue }
    const pr = checkItem(it, slots[it?.id], exclusions, { rules: 'b1' })
    if (pr.length) problems.push(`${it?.id}: ${pr.join('; ')}`)
  }
  if (problems.length) throw `sci-check refuses ${problems.length} item(s):\n  ${problems.join('\n  ')}`
  const stray = [...cleared].filter(id => !raw.some(it => it.id === id))
  if (stray.length) throw `--cleared names ids that are not in the files: ${stray.join(', ')}`
  const rows = raw.filter(it => cleared.has(it.id)).map(toRow), dropped = raw.filter(it => !cleared.has(it.id)).map(it => it.id)
  const hs = rows.map(r => r.content_hash)
  if (new Set(hs).size !== hs.length) throw 'duplicate content hash inside the batch'
  return { rows, dropped }
}

async function selftest() {
  const { FIXTURES_B1, FIXTURE_SLOTS_B1 } = await import('./map-v2-work/science-pilot/sci-check.fixtures.mjs')
  const methods = Object.fromEntries(Object.values(COHORT_OF).map(c => [c, { method_id: METHOD_ID }]))
  const base = { slots: FIXTURE_SLOTS_B1, exclusions: [], cleared: new Set(FIXTURES_B1.map(f => f.id)), methods }
  let fail = 0
  const t = (name, fn, re) => { try { fn(); if (re) { fail++; console.log(`  FAIL ${name}: no refusal`) } else console.log(`  ok   ${name}`) } catch (e) { if (re?.test(String(e))) console.log(`  ok   ${name} -> refused: ${String(e).split('\n')[0]}`); else { fail++; console.log(`  FAIL ${name}: ${String(e).split('\n')[0]}`) } } }
  t('clean B1 fixtures plan to rows in three area cohorts', () => {
    const r = plan(FIXTURES_B1, base); const c = new Set(r.rows.map(x => x.cohort))
    if (r.rows.length !== FIXTURES_B1.length || c.size !== 3 || r.rows.some(x => x.verified !== false || x.verify_meta.method_id !== METHOD_ID)) throw 'rows'
  })
  t('a missing cohort method entry', () => plan(FIXTURES_B1, { ...base, methods: { ...methods, 'map-science-v1-earth': undefined } }), /map-science-v1-earth/)
  t('B1 rules are applied (lone trend qualifier refused)', () => { const b = structuredClone(FIXTURES_B1); const it = b.find(x => x.id === 'FX-L-02'); it.choices[0] = it.correct_answer = 'It dropped steadily as the weeks went by.'; plan(b, base) }, /QUAL/)
  t('option_roles is stored on variable rows', () => { const r = plan(FIXTURES_B1, base); if (!r.rows.find(x => x.verify_meta.map.option_roles)) throw 'no roles' })
  t('EMPTY slot refused', () => plan([...FIXTURES_B1, { id: 'FX-X-01', empty: true }], base), /EMPTY/)
  console.log(fail ? `B1 STAGER SELFTEST FAILED: ${fail}` : 'B1 STAGER SELFTEST OK')
  process.exit(fail ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  if (A.includes('--selftest')) await selftest()
  const die = (m, c = 1) => { console.error('REFUSING: ' + m); process.exit(c) }
  const ci = A.indexOf('--cleared'), clearedPath = ci >= 0 ? A[ci + 1] : null
  const files = A.filter((a, i) => !a.startsWith('--') && A[i - 1] !== '--cleared')
  if (!files.length || !clearedPath) die('usage: stage-map-science-b1.mjs <author files> --cleared <cleared.json> [--apply]', 2)
  for (const f of [...files, clearedPath]) if (!existsSync(f)) die(`no such file ${f}`, 2)
  const raw = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
  const S = JSON.parse(readFileSync(join(B1DIR, 'slots.json'), 'utf8')), slots = {}
  for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) slots[r.id] = { ...r, area: v.area, author: c }
  const methods = JSON.parse(readFileSync(join(HERE, 'autonomy-methods.json'), 'utf8')).cohorts
  let res
  try { res = plan(raw, { slots, exclusions: loadExclusions(join(B1DIR, 'EXCLUSIONS-science.txt')), cleared: new Set(JSON.parse(readFileSync(clearedPath, 'utf8'))), methods }) } catch (e) { die(String(e)) }
  const { rows, dropped } = res
  if (!rows.length) die('zero rows to stage', 2)
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: clash, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1) die(e1.message)
  if (clash.length) die(`${clash.length} rows already in the bank with these hashes (e.g. cohort ${clash[0].cohort})`)
  const by = {}; for (const r of rows) by[r.cohort] = (by[r.cohort] ?? 0) + 1
  console.log(`rows ${rows.length} ${JSON.stringify(by)}; dropped by the prereg rules: ${dropped.length ? dropped.join(', ') : 'none'}`)
  if (!A.includes('--apply')) { console.log('dry run; pass --apply to insert'); process.exit(0) }
  const { error: e2 } = await db.from('study_item_bank').insert(rows)
  if (e2) die(e2.message)
  for (const [c, n] of Object.entries(by)) {
    const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('cohort', c).eq('verified', false)
    if (error) die(error.message)
    if (count !== n) die(`${c}: expected ${n} staged rows, found ${count}`)
    console.log(`${c}: ${count} staged`)
  }
}
