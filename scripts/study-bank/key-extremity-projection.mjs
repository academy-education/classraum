#!/usr/bin/env node
/**
 * key-extremity-projection.mjs [--selftest] <batch.json ...>
 *
 * PRE-FLIGHT for act-math-v25 (written 2026-10-08, before any v25 item exists).
 *
 * act-math-v24 passed the screen and the graders and was HELD at stage 4 because
 * the KEPT set failed key-extremity-gate (15/39 = 38.5% < 40.0%): the graders
 * dropped extreme-key items 13 of 28 and interior-key items 7 of 31. The gate was
 * run on what was authored (28/59 = 47.5%, a pass) and never on what would
 * survive. This script projects the kept set's key position BEFORE the attack.
 *
 * It prints, per input file and for the files merged:
 *
 *   authored        smallest / interior / largest by value (key-extremity-breakdown's
 *                   evaluator; a non-numeric item is counted, never scored)
 *   v24-rate        expected kept extreme share if extreme-key and interior-key
 *                   items survive at the rates act-math-v24 MEASURED. The rates are
 *                   DERIVED from act-math-v24.batch.json + act-math-v24.verdicts.json
 *                   (would_keep), never typed in.
 *   equal-rate      expected kept extreme share if both positions survive equally
 *                   (= the authored share): the OVERSHOOT case
 *   author-kept     key-extremity-gate (the real refusing gate, imported) on the
 *                   file minus every item whose author marked
 *                   `self_audit.risk === "at-risk"`
 *   magnitude       check-key-magnitude's z against the LIVE act/math rates (paged,
 *                   count asserted) for the authored set, and for the equal-rate and
 *                   v24-rate projections at the projected kept n
 *
 * Bars (ACT-MATH-V25-PREREGISTERED.md, merged set only; per file is a report):
 *   - v24-rate projection     >= 45.0% and <= 55.0%
 *   - equal-rate projection   interior z >= -1.96 at the projected kept n (would the
 *                             kept set fail check-key-magnitude if the graders do NOT
 *                             drop extremes more often?)
 *   - author-kept             key-extremity-gate PASS
 *   - authored per side       largest z and smallest z within +-1.96 of live
 * Exit 1 if a merged bar fails, 2 if it cannot read or score its input.
 *
 * --profile sat-alg25 (added 2026-10-08 for sat-math-v25-alg, PREREG-ALG25-2026-10-08.md):
 *   rates     DERIVED from sat-math-v24-alg.batch.json (the 13 frozen) and
 *             sat-math-v24-alg.held.batch.json (the 7 that survived the gate):
 *             extreme-key 2/7, interior-key 5/6 (REGISTER A84). Asserted, never typed.
 *   live      family sat, section math (magnitude z is reported, not barred)
 *   bars      merged set only: rate projection 45.0-55.0%; projected kept n >= 12;
 *             authored largest vs smallest within 2 of each other.
 *             equal-rate share and authored per-side z are REPORTED, not barred:
 *             commissioning to land at 50% after a 2.9x differential drop puts
 *             the authored set near 75% extreme by construction, so neither can
 *             hold, and the prereg records the equal-rate case as the known risk.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'

const DIR = new URL('.', import.meta.url).pathname
const pct = x => (100 * x).toFixed(1) + '%'

export function position(items) {
  const t = { min: 0, mid: 0, max: 0, skip: 0, n: 0 }
  for (const it of items) {
    const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
    if (s.skip) { t.skip++; continue }
    t.n++
    if (s.keyMin) t.min++; else if (s.keyMax) t.max++; else t.mid++
  }
  return t
}

/** expected kept counts given survival rates by position */
export function project(t, keepExt, keepInt) {
  const ext = (t.min + t.max) * keepExt, mid = t.mid * keepInt
  return { n: ext + mid, ext, mid, share: ext / (ext + mid), min: t.min * keepExt, max: t.max * keepExt }
}

const z = (obs, n, p) => (obs - n * p) / Math.sqrt(n * p * (1 - p))

function selftest() {
  let bad = 0
  const it = (c, k) => ({ choices: c, correct_answer: k })
  const t = position([it(['1', '2', '3', '4'], '1'), it(['1', '2', '3', '4'], '4'), it(['1', '2', '3', '4'], '2'), it(['a', 'b', 'c', 'd'], 'a')])
  if (t.min !== 1 || t.max !== 1 || t.mid !== 1 || t.skip !== 1) { bad++; console.error('position FAIL', t) }
  // v24 itself: 28 extreme / 31 interior authored, kept 15 / 24 -> v24-rate projection must reproduce 15/39
  const p = project({ min: 14, max: 14, mid: 31 }, 15 / 28, 24 / 31)
  if (Math.abs(p.share - 15 / 39) > 1e-9) { bad++; console.error('project FAIL', p) }
  const q = project({ min: 10, max: 10, mid: 20 }, 1, 1)
  if (Math.abs(q.share - 0.5) > 1e-9) { bad++; console.error('equal-rate FAIL', q) }
  // sat-math-v24-alg itself: 7 extreme / 6 interior frozen, kept 2 / 5 -> must reproduce 2/7 = 28.6%
  const r = project({ min: 2, max: 5, mid: 6 }, 2 / 7, 5 / 6)
  if (Math.abs(r.share - 2 / 7) > 1e-9 || Math.abs(r.n - 7) > 1e-9) { bad++; console.error('sat-alg24 project FAIL', r) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 4/4')
}

const argv = process.argv.slice(2)
const pi = argv.indexOf('--profile')
const PROFILE = pi >= 0 ? argv[pi + 1] : 'act-v25'
const args = argv.filter((a, i) => !(i === pi || (pi >= 0 && i === pi + 1)))
if (!['act-v25', 'sat-alg25'].includes(PROFILE)) { console.error(`REFUSING: unknown --profile ${PROFILE}`); process.exit(2) }
const SAT = PROFILE === 'sat-alg25'
if (args.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
if (!args.length) { console.error('usage: key-extremity-projection.mjs [--profile act-v25|sat-alg25] <batch.json ...>'); process.exit(2) }

// the measured survival by position, derived from the source batch's files
let v24, v24keep
if (SAT) {
  v24 = JSON.parse(readFileSync(DIR + 'sat-math-v24-alg.batch.json', 'utf8'))
  v24keep = new Set(JSON.parse(readFileSync(DIR + 'sat-math-v24-alg.held.batch.json', 'utf8')).map(x => x.id))
  if (v24.length !== 13 || v24keep.size !== 7) { console.error(`REFUSING: sat-math-v24-alg files read ${v24.length} frozen / ${v24keep.size} survived, expected 13 / 7`); process.exit(2) }
} else {
  v24 = JSON.parse(readFileSync(DIR + 'act-math-v24.batch.json', 'utf8'))
  v24keep = new Set(Object.keys(JSON.parse(readFileSync(DIR + 'act-math-v24.verdicts.json', 'utf8')).would_keep || {}))
  if (v24.length !== 59 || v24keep.size !== 39) { console.error(`REFUSING: v24 files read ${v24.length} items / ${v24keep.size} kept, expected 59 / 39`); process.exit(2) }
}
let e0 = 0, e1 = 0, i0 = 0, i1 = 0
for (const x of v24) {
  const s = scoreItem(x.choices.map(String), String(x.correct_answer)); if (s.skip) continue
  if (s.keyMin || s.keyMax) { e0++; if (v24keep.has(x.id)) e1++ } else { i0++; if (v24keep.has(x.id)) i1++ }
}
const KE = e1 / e0, KI = i1 / i0
if (SAT && (e1 !== 2 || e0 !== 7 || i1 !== 5 || i0 !== 6)) { console.error(`REFUSING: sat-math-v24-alg rates derived ${e1}/${e0}, ${i1}/${i0}; A84 measured 2/7, 5/6`); process.exit(2) }
console.log(`[${PROFILE}] ${SAT ? 'sat-math-v24-alg' : 'act-math-v24'} survival (derived): extreme-key ${e1}/${e0} = ${pct(KE)}, interior-key ${i1}/${i0} = ${pct(KI)}`)

// live maths rates for the profile's family
const FAM = SAT ? 'sat' : 'act'
const env = Object.fromEntries(readFileSync(DIR + '../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', FAM).eq('section', 'math')
    .eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
  if (error) { console.error(error.message); process.exit(2) }
  rows.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', FAM).eq('section', 'math').eq('verified', true).eq('archived', false)
if (!rows.length || rows.length !== count || new Set(rows.map(r => r.id)).size !== count) { console.error(`REFUSING: live read ${rows.length} vs count ${count}`); process.exit(2) }
const L = position(rows.map(r => r.item).filter(Boolean))
const pMin = L.min / L.n, pMax = L.max / L.n, pMid = L.mid / L.n
console.log(`live ${FAM}/math ${L.n} scorable of ${count}: smallest ${pct(pMin)} / interior ${pct(pMid)} / largest ${pct(pMax)}`)

let failed = false
const files = args.map(p => ({ p, items: JSON.parse(readFileSync(p, 'utf8')) }))
const sets = files.length > 1 ? [...files, { p: 'MERGED', items: files.flatMap(f => f.items), merged: true }] : files.map(f => ({ ...f, merged: true }))
for (const { p, items, merged } of sets) {
  if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${p} holds no items`); process.exit(2) }
  const t = position(items)
  if (t.n < 1) { console.error(`REFUSING: ${p} scored 0 items`); process.exit(2) }
  const ext = t.min + t.max
  const vr = project(t, KE, KI), er = project(t, 1, 1)
  const atRisk = items.filter(i => i?.self_audit?.risk === 'at-risk')
  const kept = items.filter(i => i?.self_audit?.risk !== 'at-risk')
  const g = keyExtremityVerdict(kept)
  const zA = { min: z(t.min, t.n, pMin), max: z(t.max, t.n, pMax), mid: z(t.mid, t.n, pMid) }
  const zE = z(er.mid * (vr.n / er.n), vr.n, pMid)   // equal-rate kept set at the v24-rate kept size
  const zV = z(vr.mid, vr.n, pMid)
  console.log(`\n== ${p.replace(/^.*\//, '')}  items ${items.length}, scorable ${t.n}, non-numeric ${t.skip}`)
  console.log(`  authored     smallest ${t.min} / interior ${t.mid} / largest ${t.max}   extreme ${ext}/${t.n} = ${pct(ext / t.n)}`)
  console.log(`               magnitude z vs live: largest ${zA.max.toFixed(2)}  smallest ${zA.min.toFixed(2)}  interior ${zA.mid.toFixed(2)}`)
  console.log(`  v24-rate     kept ~${vr.n.toFixed(1)}, extreme ${pct(vr.share)}  (interior z at that n ${zV.toFixed(2)})`)
  console.log(`  equal-rate   extreme ${pct(er.share)}  (interior z at kept n ${vr.n.toFixed(1)}: ${zE.toFixed(2)})`)
  console.log(`  author-kept  ${kept.length} of ${items.length} (at-risk ${atRisk.length}${atRisk.length ? ': ' + atRisk.map(i => i.id).join(',') : ''})  key-extremity-gate ${g.status.toUpperCase()}  ${g.n ? `${g.ext}/${g.n} = ${pct(g.rate)}` : ''}`)
  if (merged && SAT) {
    const fails = []
    if (!(vr.share >= 0.45 && vr.share <= 0.55)) fails.push(`alg24-rate ${pct(vr.share)} outside [45.0%, 55.0%]`)
    if (vr.n < 12) fails.push(`projected kept n ${vr.n.toFixed(1)} < 12`)
    if (Math.abs(t.max - t.min) > 2) fails.push(`authored largest ${t.max} vs smallest ${t.min} differ by more than 2`)
    console.log(`  (reported, not barred under sat-alg25: equal-rate share ${pct(er.share)}; authored per-side z largest ${zA.max.toFixed(2)} smallest ${zA.min.toFixed(2)})`)
    console.log(`  PROJECTION ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
    if (fails.length) failed = true
  } else if (merged) {
    const fails = []
    if (!(vr.share >= 0.45 && vr.share <= 0.55)) fails.push(`v24-rate ${pct(vr.share)} outside [45.0%, 55.0%]`)
    if (zE < -1.96) fails.push(`equal-rate interior z ${zE.toFixed(2)} < -1.96 (kept set would fail check-key-magnitude)`)
    if (g.status !== 'pass') fails.push(`author-kept key-extremity-gate ${g.status}`)
    if (Math.abs(zA.min) > 1.96 || Math.abs(zA.max) > 1.96) fails.push('authored per-side z outside +-1.96')
    console.log(`  PROJECTION ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
    if (fails.length) failed = true
  }
}
process.exit(failed ? 1 : 0)
