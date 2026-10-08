#!/usr/bin/env node
/**
 * act-math-v27-projection.mjs [--selftest] <batch.json ...>
 *
 * PRE-FLIGHT for act-math-v27 (ACT-MATH-V27-PREREGISTERED.md), written 2026-10-08
 * before any v27 item exists. It runs BESIDE act-math-v26-projection.mjs and
 * key-extremity-projection.mjs (both kept with their bars); it replaces neither.
 *
 * WHY A THIRD PROJECTION. v26's register entry, lesson 1: "IES is now the domain
 * that fails." Survival by key position is not one number per batch, it is one
 * number per DOMAIN CLASS, and IES differs from everything else by a factor the
 * batch-level rates hide:
 *
 *     v24-v26   IES       extreme-key  6/17 = 35.3%   interior-key 16/17 = 94.1%
 *     v24-v26   non-IES   extreme-key 63/83 = 75.9%   interior-key 56/66 = 84.8%
 *
 * A88 (SAT Algebra full-form v26) failed its kept-set extremity gate for exactly
 * this reason: it commissioned key position from another domain's survival.
 * v27 commissions IES at about twice its form deficit and gates IES ALONE at
 * stage 4, so IES's own rates must be what the IES commission is projected at.
 *
 * Rates are DERIVED from the files, never typed, and asserted against the
 * recorded counts (v24 59 / 39 kept; v25 62 / 50; v26 62 / 52):
 *   ies       IES items of v24+v25+v26, by key position
 *   nonies    every other item of v24+v25+v26, by key position
 *   pooled3   all items of v24+v25+v26 (no domain split)
 *   v26       v26 alone (the most recent batch)
 *
 * Bars, MERGED set (exit 1 on failure):
 *   - kept extreme share in [45.0%, 55.0%] at the SPLIT rates (IES items at ies,
 *     the rest at nonies), at pooled3, and at v26
 *   - equal-rate interior z >= -1.96 at every projected kept n
 *   - authored smallest z and largest z within +-1.96 of live act/math
 *   - pooled3 projected kept n >= 10
 * Bars, IES-ONLY subset of the merged set (exit 1 on failure):
 *   - kept extreme share at the ies rates in [45.0%, 55.0%]
 *   - projected kept IES n at the ies rates >= 10 (so the stage-4 IES-alone
 *     extremity gate can measure)
 * Reported, not gated (IES only): the share and interior z if IES survived at
 * the nonies rates (the brief WORKS case) and at equal rates (overshoot). No IES
 * composition passes both the ies-rate band and the equal-rate z at n ~ 17, so
 * the IES-alone magnitude gate is not pre-registered as gating (see the prereg).
 * Exit 2 if it cannot read or score its input.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scoreItem } from './key-extremity-breakdown.mjs'

const DIR = new URL('.', import.meta.url).pathname
const IES = 'Integrating Essential Skills'
const pct = x => (100 * x).toFixed(1) + '%'
const z = (obs, n, p) => (obs - n * p) / Math.sqrt(n * p * (1 - p))

function pos(it) {
  const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
  return s.skip ? null : s.keyMin ? 'min' : s.keyMax ? 'max' : 'mid'
}
export function position(items) {
  const t = { min: 0, mid: 0, max: 0, skip: 0, n: 0 }
  for (const it of items) { const p = pos(it); if (!p) { t.skip++; continue } t.n++; t[p]++ }
  return t
}
// project a set at per-class rates: rateOf(item) -> [keepExtreme, keepInterior]
export function project(items, rateOf) {
  let ext = 0, mid = 0
  for (const it of items) { const p = pos(it); if (!p) continue; const [ke, ki] = rateOf(it); if (p === 'mid') mid += ki; else ext += ke }
  return { n: ext + mid, ext, mid, share: ext / (ext + mid) }
}
function survival(tag, wantN, wantKeep) {
  const b = JSON.parse(readFileSync(DIR + `act-math-${tag}.batch.json`, 'utf8'))
  const keep = new Set(Object.keys(JSON.parse(readFileSync(DIR + `act-math-${tag}.verdicts.json`, 'utf8')).would_keep || {}))
  if (b.length !== wantN || keep.size !== wantKeep) { console.error(`REFUSING: ${tag} read ${b.length} / ${keep.size} kept, expected ${wantN} / ${wantKeep}`); process.exit(2) }
  const r = { ies: { e0: 0, e1: 0, i0: 0, i1: 0 }, nonies: { e0: 0, e1: 0, i0: 0, i1: 0 } }
  for (const x of b) {
    const p = pos(x); if (!p) continue
    const c = r[x.domain === IES ? 'ies' : 'nonies']
    if (p === 'mid') { c.i0++; if (keep.has(x.id)) c.i1++ } else { c.e0++; if (keep.has(x.id)) c.e1++ }
  }
  return r
}
const add = (...rs) => rs.reduce((a, r) => ({ e0: a.e0 + r.e0, e1: a.e1 + r.e1, i0: a.i0 + r.i0, i1: a.i1 + r.i1 }), { e0: 0, e1: 0, i0: 0, i1: 0 })
const rate = r => [r.e1 / r.e0, r.i1 / r.i0]

function rates() {
  const s24 = survival('v24', 59, 39), s25 = survival('v25', 62, 50), s26 = survival('v26', 62, 52)
  const ies = add(s24.ies, s25.ies, s26.ies), non = add(s24.nonies, s25.nonies, s26.nonies)
  const all3 = add(ies, non), v26 = add(s26.ies, s26.nonies)
  return { ies, non, all3, v26 }
}

function selftest() {
  let bad = 0
  const it = (c, k, d = 'Algebra') => ({ choices: c, correct_answer: k, domain: d })
  const t = position([it(['1', '2', '3', '4'], '1'), it(['1', '2', '3', '4'], '4'), it(['1', '2', '3', '4'], '2'), it(['a', 'b', 'c', 'd'], 'a')])
  if (t.min !== 1 || t.max !== 1 || t.mid !== 1 || t.skip !== 1) { bad++; console.error('position FAIL', t) }
  const R = rates()
  // derived counts, asserted (the numbers quoted in the header and the prereg)
  if (R.ies.e1 !== 6 || R.ies.e0 !== 17 || R.ies.i1 !== 16 || R.ies.i0 !== 17) { bad++; console.error('ies derive FAIL', R.ies) }
  if (R.non.e1 !== 63 || R.non.e0 !== 83 || R.non.i1 !== 56 || R.non.i0 !== 66) { bad++; console.error('nonies derive FAIL', R.non) }
  if (R.v26.e1 !== 28 || R.v26.e0 !== 36 || R.v26.i1 !== 24 || R.v26.i0 !== 26) { bad++; console.error('v26 derive FAIL', R.v26) }
  // per-class projection reproduces a known split exactly: v26's IES 12 at v26's own IES rates -> kept 2 extreme of 7
  const b26 = JSON.parse(readFileSync(DIR + 'act-math-v26.batch.json', 'utf8')).filter(x => x.domain === IES)
  const s26 = survival('v26', 62, 52).ies
  const p = project(b26, () => rate(s26))
  if (Math.abs(p.n - 7) > 1e-9 || Math.abs(p.ext - 2) > 1e-9) { bad++; console.error('v26 IES reproduce FAIL', p) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 5/5')
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
const paths = args.filter(a => !a.startsWith('--'))
if (!paths.length) { console.error('usage: act-math-v27-projection.mjs <batch.json ...>'); process.exit(2) }

const R = rates()
const RIES = rate(R.ies), RNON = rate(R.non), RALL = rate(R.all3), RV26 = rate(R.v26)
console.log(`survival (derived, v24+v25+v26): IES extreme ${R.ies.e1}/${R.ies.e0} = ${pct(RIES[0])} interior ${R.ies.i1}/${R.ies.i0} = ${pct(RIES[1])}; ` +
  `non-IES extreme ${R.non.e1}/${R.non.e0} = ${pct(RNON[0])} interior ${R.non.i1}/${R.non.i0} = ${pct(RNON[1])}; ` +
  `pooled3 ${pct(RALL[0])} / ${pct(RALL[1])}; v26 ${R.v26.e1}/${R.v26.e0} / ${R.v26.i1}/${R.v26.i0}`)

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

const files = paths.map(p => ({ p, items: JSON.parse(readFileSync(p, 'utf8')) }))
for (const f of files) if (!Array.isArray(f.items) || !f.items.length) { console.error(`REFUSING: ${f.p} holds no items`); process.exit(2) }
const merged = files.flatMap(f => f.items)
let failed = false
const line = (label, pr, t) => {
  const zEq = z((t.mid / t.n) * pr.n, pr.n, pMid)
  console.log(`  ${label.padEnd(26)} kept ~${pr.n.toFixed(1)}, extreme ${pct(pr.share)}   equal-rate interior z at that n ${zEq.toFixed(2)}`)
  return zEq
}
const zKept = pr => z(pr.mid, pr.n, pMid)
for (const { p, items } of [...(files.length > 1 ? files : []), { p: 'MERGED', items: merged }]) {
  const t = position(items)
  if (t.n < 1) { console.error(`REFUSING: ${p} scored 0 items`); process.exit(2) }
  const ext = t.min + t.max
  const zA = { min: z(t.min, t.n, pMin), max: z(t.max, t.n, pMax), mid: z(t.mid, t.n, pMid) }
  const iesN = items.filter(i => i.domain === IES).length
  console.log(`\n== ${p.replace(/^.*\//, '')}  items ${items.length} (IES ${iesN}), scorable ${t.n}, non-numeric ${t.skip}`)
  console.log(`  authored     smallest ${t.min} / interior ${t.mid} / largest ${t.max}   extreme ${ext}/${t.n} = ${pct(ext / t.n)}   z: smallest ${zA.min.toFixed(2)} largest ${zA.max.toFixed(2)} interior ${zA.mid.toFixed(2)}`)
  const pr = {
    split: project(items, it => (it.domain === IES ? RIES : RNON)),
    pooled3: project(items, () => RALL),
    v26: project(items, () => RV26),
  }
  const zs = {}
  for (const [k, v] of Object.entries(pr)) zs[k] = line(k + '-rate', v, t)
  if (p !== 'MERGED') continue
  const fails = []
  for (const k of Object.keys(pr)) if (!(pr[k].share >= 0.45 && pr[k].share <= 0.55)) fails.push(`${k}-rate ${pct(pr[k].share)} outside [45.0%, 55.0%]`)
  const worst = Math.min(...Object.values(zs))
  if (worst < -1.96) fails.push(`equal-rate interior z ${worst.toFixed(2)} < -1.96`)
  if (Math.abs(zA.min) > 1.96 || Math.abs(zA.max) > 1.96) fails.push('authored per-side z outside +-1.96')
  if (pr.pooled3.n < 10) fails.push(`pooled3 projected kept n ${pr.pooled3.n.toFixed(1)} < 10`)
  // IES-only subset
  const ies = items.filter(i => i.domain === IES)
  if (ies.length) {
    const ti = position(ies)
    const pi = project(ies, () => RIES), pw = project(ies, () => RNON)
    const pe = { n: ti.n * RNON[1], share: (ti.min + ti.max) / ti.n }
    pe.mid = pe.n * (1 - pe.share)
    console.log(`  IES subset   authored ${ti.min}/${ti.mid}/${ti.max} (extreme ${pct((ti.min + ti.max) / ti.n)})`)
    console.log(`    ies-rate (GATED)          kept ~${pi.n.toFixed(1)}, extreme ${pct(pi.share)}, interior z ${zKept(pi).toFixed(2)}`)
    console.log(`    nonies-rate (reported)    kept ~${pw.n.toFixed(1)}, extreme ${pct(pw.share)}, interior z ${zKept(pw).toFixed(2)}   (the IES brief works)`)
    console.log(`    equal-rate (reported)     kept ~${pe.n.toFixed(1)}, extreme ${pct(pe.share)}, interior z ${zKept(pe).toFixed(2)}   (overshoot)`)
    if (!(pi.share >= 0.45 && pi.share <= 0.55)) fails.push(`IES ies-rate ${pct(pi.share)} outside [45.0%, 55.0%]`)
    if (pi.n < 10) fails.push(`IES projected kept n ${pi.n.toFixed(1)} < 10`)
  }
  console.log(`  V27 PROJECTION ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
  if (fails.length) failed = true
}
process.exit(failed ? 1 : 0)
