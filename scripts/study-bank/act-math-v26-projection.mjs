#!/usr/bin/env node
/**
 * act-math-v26-projection.mjs [--selftest] <batch.json ...>
 *
 * PRE-FLIGHT for act-math-v26 (ACT-MATH-V26-PREREGISTERED.md), written 2026-10-08
 * before any v26 item exists. It runs BESIDE key-extremity-projection.mjs (whose
 * v25 bars are kept unchanged and still gate); it does not replace it.
 *
 * v25's register entry, lesson 3: "The projection's band held. Keep it, and
 * re-derive the rates from v25's files as well as v24's." v25's graders kept
 * extreme-key items at 26/36 and interior at 24/26 — a smaller differential than
 * v24's 15/28 vs 24/31. A batch commissioned to v24's rates alone could overshoot
 * if v25's rates are the truth, so v26 projects at all three and gates all three.
 *
 * Rates are DERIVED from the files, never typed, and asserted against the
 * recorded counts (v24 59 / 39 kept; v25 62 / 50 kept):
 *   v24     act-math-v24.batch.json + act-math-v24.verdicts.json would_keep
 *   v25     act-math-v25.batch.json + act-math-v25.verdicts.json would_keep
 *   pooled  v24 + v25
 *
 * Per input file and for the files merged it prints authored position, the
 * kept extreme share at each rate, the equal-rate (no differential drop) interior
 * z at each projected kept n, and author-kept key-extremity-gate.
 *
 * Bars (merged set only; per file is a report):
 *   - v24-rate, v25-rate and pooled-rate kept extreme share each in [45.0%, 55.0%]
 *   - equal-rate interior z >= -1.96 at EVERY projected kept n (the largest n binds)
 *   - author-kept key-extremity-gate PASS
 *   - authored smallest z and largest z within +-1.96 of live act/math
 *   - projected kept n (pooled) >= 10, so the kept-set gates can measure it
 * Exit 1 if a merged bar fails, 2 if it cannot read or score its input.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'

const DIR = new URL('.', import.meta.url).pathname
const pct = x => (100 * x).toFixed(1) + '%'
const z = (obs, n, p) => (obs - n * p) / Math.sqrt(n * p * (1 - p))

function position(items) {
  const t = { min: 0, mid: 0, max: 0, skip: 0, n: 0 }
  for (const it of items) {
    const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
    if (s.skip) { t.skip++; continue }
    t.n++
    if (s.keyMin) t.min++; else if (s.keyMax) t.max++; else t.mid++
  }
  return t
}
function project(t, keepExt, keepInt) {
  const ext = (t.min + t.max) * keepExt, mid = t.mid * keepInt
  return { n: ext + mid, ext, mid, share: ext / (ext + mid) }
}
function survival(batch, verdicts, wantN, wantKeep) {
  const b = JSON.parse(readFileSync(DIR + batch, 'utf8'))
  const keep = new Set(Object.keys(JSON.parse(readFileSync(DIR + verdicts, 'utf8')).would_keep || {}))
  if (b.length !== wantN || keep.size !== wantKeep) { console.error(`REFUSING: ${batch} read ${b.length} / ${keep.size} kept, expected ${wantN} / ${wantKeep}`); process.exit(2) }
  const r = { e0: 0, e1: 0, i0: 0, i1: 0 }
  for (const x of b) {
    const s = scoreItem(x.choices.map(String), String(x.correct_answer)); if (s.skip) continue
    if (s.keyMin || s.keyMax) { r.e0++; if (keep.has(x.id)) r.e1++ } else { r.i0++; if (keep.has(x.id)) r.i1++ }
  }
  return r
}

function selftest() {
  let bad = 0
  const it = (c, k) => ({ choices: c, correct_answer: k })
  const t = position([it(['1', '2', '3', '4'], '1'), it(['1', '2', '3', '4'], '4'), it(['1', '2', '3', '4'], '2'), it(['a', 'b', 'c', 'd'], 'a')])
  if (t.min !== 1 || t.max !== 1 || t.mid !== 1 || t.skip !== 1) { bad++; console.error('position FAIL', t) }
  const p = project({ min: 14, max: 14, mid: 31 }, 15 / 28, 24 / 31)       // v24 reproduces 15/39
  if (Math.abs(p.share - 15 / 39) > 1e-9) { bad++; console.error('v24 project FAIL', p) }
  const r = project({ min: 18, max: 18, mid: 26 }, 26 / 36, 24 / 26)       // v25 reproduces 26/50
  if (Math.abs(r.share - 26 / 50) > 1e-9 || Math.abs(r.n - 50) > 1e-9) { bad++; console.error('v25 project FAIL', r) }
  const s24 = survival('act-math-v24.batch.json', 'act-math-v24.verdicts.json', 59, 39)
  const s25 = survival('act-math-v25.batch.json', 'act-math-v25.verdicts.json', 62, 50)
  if (s24.e1 !== 15 || s24.e0 !== 28 || s24.i1 !== 24 || s24.i0 !== 31) { bad++; console.error('v24 derive FAIL', s24) }
  if (s25.e1 !== 26 || s25.e0 !== 36 || s25.i1 !== 24 || s25.i0 !== 26) { bad++; console.error('v25 derive FAIL', s25) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 5/5')
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
const paths = args.filter(a => !a.startsWith('--'))
if (!paths.length) { console.error('usage: act-math-v26-projection.mjs <batch.json ...>'); process.exit(2) }

const s24 = survival('act-math-v24.batch.json', 'act-math-v24.verdicts.json', 59, 39)
const s25 = survival('act-math-v25.batch.json', 'act-math-v25.verdicts.json', 62, 50)
const RATES = {
  v24: [s24.e1 / s24.e0, s24.i1 / s24.i0],
  v25: [s25.e1 / s25.e0, s25.i1 / s25.i0],
  pooled: [(s24.e1 + s25.e1) / (s24.e0 + s25.e0), (s24.i1 + s25.i1) / (s24.i0 + s25.i0)],
}
console.log(`survival (derived): v24 extreme ${s24.e1}/${s24.e0} interior ${s24.i1}/${s24.i0}; v25 extreme ${s25.e1}/${s25.e0} interior ${s25.i1}/${s25.i0}; pooled extreme ${pct(RATES.pooled[0])} interior ${pct(RATES.pooled[1])}`)

const env = Object.fromEntries(readFileSync(DIR + '../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'act').eq('section', 'math')
    .eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
  if (error) { console.error(error.message); process.exit(2) }
  rows.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'act').eq('section', 'math').eq('verified', true).eq('archived', false)
if (!rows.length || rows.length !== count || new Set(rows.map(r => r.id)).size !== count) { console.error(`REFUSING: live read ${rows.length} vs count ${count}`); process.exit(2) }
const L = position(rows.map(r => r.item).filter(Boolean))
const pMin = L.min / L.n, pMax = L.max / L.n, pMid = L.mid / L.n
console.log(`live act/math ${L.n} scorable of ${count}: smallest ${pct(pMin)} / interior ${pct(pMid)} / largest ${pct(pMax)}`)

let failed = false
const files = paths.map(p => ({ p, items: JSON.parse(readFileSync(p, 'utf8')) }))
const sets = files.length > 1 ? [...files, { p: 'MERGED', items: files.flatMap(f => f.items), merged: true }] : files.map(f => ({ ...f, merged: true }))
for (const { p, items, merged } of sets) {
  if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${p} holds no items`); process.exit(2) }
  const t = position(items)
  if (t.n < 1) { console.error(`REFUSING: ${p} scored 0 items`); process.exit(2) }
  const ext = t.min + t.max
  const zA = { min: z(t.min, t.n, pMin), max: z(t.max, t.n, pMax), mid: z(t.mid, t.n, pMid) }
  const kept = items.filter(i => i?.self_audit?.risk !== 'at-risk')
  const g = keyExtremityVerdict(kept)
  console.log(`\n== ${p.replace(/^.*\//, '')}  items ${items.length}, scorable ${t.n}, non-numeric ${t.skip}`)
  console.log(`  authored     smallest ${t.min} / interior ${t.mid} / largest ${t.max}   extreme ${ext}/${t.n} = ${pct(ext / t.n)}   z: smallest ${zA.min.toFixed(2)} largest ${zA.max.toFixed(2)} interior ${zA.mid.toFixed(2)}`)
  const pr = {}
  for (const [k, [ke, ki]] of Object.entries(RATES)) {
    pr[k] = project(t, ke, ki)
    const zEq = z((t.mid / t.n) * pr[k].n, pr[k].n, pMid)
    pr[k].zEq = zEq
    console.log(`  ${(k + '-rate').padEnd(12)} kept ~${pr[k].n.toFixed(1)}, extreme ${pct(pr[k].share)}   equal-rate interior z at that n ${zEq.toFixed(2)}`)
  }
  console.log(`  author-kept  ${kept.length} of ${items.length}  key-extremity-gate ${g.status.toUpperCase()}  ${g.n ? `${g.ext}/${g.n} = ${pct(g.rate)}` : ''}`)
  if (merged) {
    const fails = []
    for (const k of Object.keys(RATES)) if (!(pr[k].share >= 0.45 && pr[k].share <= 0.55)) fails.push(`${k}-rate ${pct(pr[k].share)} outside [45.0%, 55.0%]`)
    const worst = Object.values(pr).reduce((a, b) => (a.zEq < b.zEq ? a : b))   // the largest projected n is the strictest
    if (worst.zEq < -1.96) fails.push(`equal-rate interior z ${worst.zEq.toFixed(2)} < -1.96 at kept n ${worst.n.toFixed(1)}`)
    if (g.status !== 'pass') fails.push(`author-kept key-extremity-gate ${g.status}`)
    if (Math.abs(zA.min) > 1.96 || Math.abs(zA.max) > 1.96) fails.push('authored per-side z outside +-1.96')
    if (pr.pooled.n < 10) fails.push(`pooled projected kept n ${pr.pooled.n.toFixed(1)} < 10`)
    console.log(`  V26 PROJECTION ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
    if (fails.length) failed = true
  }
}
process.exit(failed ? 1 : 0)
