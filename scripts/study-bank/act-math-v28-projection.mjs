#!/usr/bin/env node
/**
 * act-math-v28-projection.mjs [--selftest] [--commission] <batch.json ...>
 *
 * PRE-FLIGHT for act-math-v28 (ACT-MATH-V28-PREREGISTERED.md), written 2026-10-09
 * before any v28 item exists. key-extremity-projection.mjs, act-math-v26-projection.mjs
 * and act-math-v27-projection.mjs still RUN beside it (read-only, unedited) and are
 * printed; under v28 their domain-blind rate lines are REPORTED, not gated (see the
 * prereg, "Why the domain-blind rates are reported").
 *
 * WHY. v27 was held at stage 0 by its v26-rate line (55.4% against a 55.0% edge)
 * after ONE post-return drop, on a commission 0.9 points inside the band. That
 * line projects IES extreme-key items at v26's overall 28/36 = 77.8% survival,
 * while IES extreme keys have survived 6 of 17 (35.3%) over v24-v26 and v26's own
 * 2 of 6. The seven rates v27 gated disagree by more than the 5 points two
 * 2.5-point headrooms leave inside a 10-point band: at ANY composition with IES
 * 20-24 and non-IES 24-32, the best minimum headroom over all seven is 1.53
 * points (printed by --selftest from the derived rates, not typed).
 *
 * So v28 gates each band at ONE planning rate, commissions >= 2.5 points inside
 * each, and proves before authoring that losing any single item keeps every gate.
 *
 * Rates DERIVED from the files and asserted (v24 59/39 kept, v25 62/50, v26 62/52):
 *   ies     IES items of v24+v25+v26 by key position      6/17 extreme, 16/17 interior
 *   nonies  every other item of v24+v25+v26                63/83, 56/66
 *   split   IES items at ies, the rest at nonies (the merged planning rate)
 *   reported (domain-blind): v24, v25, pooled45 (v24+v25), pooled3 (v24-v26), v26
 *
 * GATES (exit 1), MERGED set:
 *   G1 split-rate kept extreme share in [45.0%, 55.0%]
 *   G2 equal-rate interior z >= -1.96 at the split-rate projected kept n
 *   G3 authored smallest z and largest z within +-1.96 of live act/math
 *   G4 split-rate projected kept n >= 10
 *   G5 author-kept key-extremity-gate PASS (items marked self_audit.risk at-risk removed)
 * GATES, IES subset of the merged set:
 *   G6 ies-rate kept extreme share in [45.0%, 55.0%]
 *   G7 ies-rate projected kept IES n >= 10
 * --commission adds (the design check, run on the authored round-1 set):
 *   C1 split-rate share and ies-rate share each >= 2.5 points inside its band
 *   C2 leave-one-out: dropping any ONE item (one of each class present: IES
 *      extreme, IES interior, non-IES extreme, non-IES interior) keeps G1-G7
 * Every run PRINTS the headroom and the leave-one-out table.
 * Exit 2 if it cannot read or score its input.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'

const DIR = new URL('.', import.meta.url).pathname
const IES = 'Integrating Essential Skills'
const pct = x => (100 * x).toFixed(1) + '%'
const z = (obs, n, p) => (obs - n * p) / Math.sqrt(n * p * (1 - p))

function pos(it) {
  const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
  return s.skip ? null : s.keyMin ? 'min' : s.keyMax ? 'max' : 'mid'
}
function position(items) {
  const t = { min: 0, mid: 0, max: 0, skip: 0, n: 0 }
  for (const it of items) { const p = pos(it); if (!p) { t.skip++; continue } t.n++; t[p]++ }
  return t
}
// class counts: ie / ii (IES extreme / interior), ne / ni (non-IES)
function classes(items) {
  const c = { ie: 0, ii: 0, ne: 0, ni: 0, min: 0, max: 0, mid: 0, n: 0 }
  for (const it of items) {
    const p = pos(it); if (!p) continue
    const k = (it.domain === IES ? 'i' : 'n') + (p === 'mid' ? 'i' : 'e')
    c[k === 'ie' ? 'ie' : k === 'ii' ? 'ii' : k === 'ne' ? 'ne' : 'ni']++
    c[p]++; c.n++
  }
  return c
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
  return {
    ies, non,
    blind: {
      v24: add(s24.ies, s24.nonies), v25: add(s25.ies, s25.nonies), pooled45: add(s24.ies, s24.nonies, s25.ies, s25.nonies),
      pooled3: add(ies, non), v26: add(s26.ies, s26.nonies),
    },
  }
}
const R = rates()
const RIES = rate(R.ies), RNON = rate(R.non)

// projections from class counts (pure; the selftest and the leave-one-out use them)
function proj(c) {
  const se = c.ie * RIES[0] + c.ne * RNON[0], si = c.ii * RIES[1] + c.ni * RNON[1]
  const ie = c.ie * RIES[0], ii = c.ii * RIES[1]
  const blind = {}
  for (const [k, r] of Object.entries(R.blind)) { const [a, b] = rate(r); const e = (c.ie + c.ne) * a, i = (c.ii + c.ni) * b; blind[k] = { n: e + i, share: e / (e + i) } }
  return { split: { n: se + si, share: se / (se + si) }, ies: { n: ie + ii, share: ie + ii ? ie / (ie + ii) : NaN }, blind }
}
function gates(c, live, keg) {
  const p = proj(c), T = c.n, fails = []
  if (!(p.split.share >= 0.45 && p.split.share <= 0.55)) fails.push(`G1 split-rate ${pct(p.split.share)} outside [45.0%, 55.0%]`)
  const I = c.ii + c.ni
  const zEq = z((I / T) * p.split.n, p.split.n, live.pMid)
  if (zEq < -1.96) fails.push(`G2 equal-rate interior z ${zEq.toFixed(2)} < -1.96`)
  const zMin = z(c.min, T, live.pMin), zMax = z(c.max, T, live.pMax)
  if (Math.abs(zMin) > 1.96 || Math.abs(zMax) > 1.96) fails.push(`G3 authored per-side z ${zMin.toFixed(2)} / ${zMax.toFixed(2)} outside +-1.96`)
  if (p.split.n < 10) fails.push(`G4 split-rate kept n ${p.split.n.toFixed(1)} < 10`)
  if (keg && keg !== 'pass') fails.push(`G5 author-kept key-extremity-gate ${keg}`)
  if (c.ie + c.ii) {
    if (!(p.ies.share >= 0.45 && p.ies.share <= 0.55)) fails.push(`G6 IES ies-rate ${pct(p.ies.share)} outside [45.0%, 55.0%]`)
    if (p.ies.n < 10) fails.push(`G7 IES kept n ${p.ies.n.toFixed(2)} < 10`)
  }
  return { p, zEq, zMin, zMax, fails }
}
const head = s => Math.min(s - 0.45, 0.55 - s)
function commission(c, live) {
  const g = gates(c, live), fails = [...g.fails]
  if (head(g.p.split.share) < 0.025 - 1e-12) fails.push(`C1 split-rate headroom ${(100 * head(g.p.split.share)).toFixed(2)} < 2.5 points`)
  if (c.ie + c.ii && head(g.p.ies.share) < 0.025 - 1e-12) fails.push(`C1 ies-rate headroom ${(100 * head(g.p.ies.share)).toFixed(2)} < 2.5 points`)
  const loo = []
  for (const k of ['ie', 'ii', 'ne', 'ni']) {
    if (!c[k]) continue
    // an extreme drop removes one from the larger of min/max (worst case for G3 is printed either way)
    const d = { ...c, [k]: c[k] - 1, n: c.n - 1 }
    if (k === 'ie' || k === 'ne') { if (c.min >= c.max) d.min--; else d.max-- } else d.mid--
    const r = gates(d, live)
    loo.push({ k, r })
    if (r.fails.length) fails.push(`C2 drop one ${k}: ${r.fails.join('; ')}`)
  }
  return { g, loo, fails }
}
const LABEL = { ie: 'IES extreme', ii: 'IES interior', ne: 'non-IES extreme', ni: 'non-IES interior' }
function printLoo(loo) {
  for (const { k, r } of loo) console.log(`    drop one ${LABEL[k].padEnd(17)} split ${pct(r.p.split.share)} (n ${r.p.split.n.toFixed(1)})  ies ${pct(r.p.ies.share)} (n ${r.p.ies.n.toFixed(2)})  zEq ${r.zEq.toFixed(2)}  ${r.fails.length ? 'FAIL ' + r.fails.join('; ') : 'all gates hold'}`)
}

function selftest(live) {
  let bad = 0
  if (R.ies.e1 !== 6 || R.ies.e0 !== 17 || R.ies.i1 !== 16 || R.ies.i0 !== 17) { bad++; console.error('ies derive FAIL', R.ies) }
  if (R.non.e1 !== 63 || R.non.e0 !== 83 || R.non.i1 !== 56 || R.non.i0 !== 66) { bad++; console.error('nonies derive FAIL', R.non) }
  if (R.blind.v26.e1 !== 28 || R.blind.v26.e0 !== 36 || R.blind.v26.i1 !== 24 || R.blind.v26.i0 !== 26) { bad++; console.error('v26 derive FAIL', R.blind.v26) }
  if (R.blind.v24.e1 !== 15 || R.blind.v24.e0 !== 28 || R.blind.v24.i1 !== 24 || R.blind.v24.i0 !== 31) { bad++; console.error('v24 derive FAIL', R.blind.v24) }
  // reproduce v27's held merged 47 exactly: split 48.3%, v26 55.4%, IES 46.7% at n 10.6
  const v27 = classes(JSON.parse(readFileSync(DIR + 'act-math-v27.batch.json', 'utf8')))
  const p27 = proj(v27)
  if (v27.n !== 47 || pct(p27.split.share) !== '48.3%' || pct(p27.blind.v26.share) !== '55.4%' || pct(p27.ies.share) !== '46.7%') { bad++; console.error('v27 reproduce FAIL', v27, p27) }
  const mk = (ie, ii, ne, ni) => ({ ie, ii, ne, ni, n: ie + ii + ne + ni, mid: ii + ni, min: Math.floor((ie + ne) / 2), max: Math.ceil((ie + ne) / 2) })
  // v28 target (IES 16/6, non-IES 14/14) passes --commission
  const tgt = commission(mk(16, 6, 14, 14), live)
  if (tgt.fails.length) { bad++; console.error('target FAIL', tgt.fails) }
  // v27's commission (IES 7/6/7 = 14/6, non-IES 14/14) fails C1 on IES headroom (46.7%)
  const c27 = commission(mk(14, 6, 14, 14), live)
  if (!c27.fails.some(f => f.startsWith('C1 ies'))) { bad++; console.error('v27 commission should fail C1', c27.fails) }
  // ... and C2: losing one IES extreme takes it to 44.8%, one IES interior to kept n 9.65 (v27 survived neither)
  if (!c27.fails.some(f => f.startsWith('C2 drop one ie: G6')) || !c27.fails.some(f => f.startsWith('C2 drop one ii: G7'))) { bad++; console.error('v27 commission should fail C2', c27.fails) }
  // IES 20 at 15 extreme fails C1 too (52.9%): no IES-20 composition has 2.5 points
  const i20 = commission(mk(15, 5, 14, 14), live)
  if (!i20.fails.some(f => f.startsWith('C1 ies'))) { bad++; console.error('IES 15/5 should fail C1', i20.fails) }
  // a 75%-extreme overshoot fails G2
  const over = gates(mk(17, 5, 22, 6), live)
  if (!over.fails.some(f => f.startsWith('G2'))) { bad++; console.error('overshoot should fail G2', over.fails) }
  // the all-seven-rate headroom maximum, derived (quoted in the header and the prereg)
  let best = -1
  for (let NI = 20; NI <= 24; NI++) for (let NN = 24; NN <= 32; NN++) for (let ie = 0; ie <= NI; ie++) for (let ne = 0; ne <= NN; ne++) {
    const p = proj(mk(ie, NI - ie, ne, NN - ne))
    const h = Math.min(head(p.split.share), head(p.ies.share), ...Object.values(p.blind).map(b => head(b.share)))
    if (h > best) best = h
  }
  if ((100 * best).toFixed(2) !== '1.53') { bad++; console.error('all-seven headroom max FAIL', best) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log(`selftest 10/10 (all-seven-rate best minimum headroom over IES 20-24 x non-IES 24-32: ${(100 * best).toFixed(2)} points)`)
}

async function liveRates() {
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
  console.log(`live act/math ${L.n} scorable of ${count}: smallest ${pct(L.min / L.n)} / interior ${pct(L.mid / L.n)} / largest ${pct(L.max / L.n)}`)
  return { pMin: L.min / L.n, pMid: L.mid / L.n, pMax: L.max / L.n }
}

const args = process.argv.slice(2)
const live = await liveRates()
selftest(live)
if (args.includes('--selftest')) process.exit(0)
const COMM = args.includes('--commission')
const paths = args.filter(a => !a.startsWith('--'))
if (!paths.length) { console.error('usage: act-math-v28-projection.mjs [--commission] <batch.json ...>'); process.exit(2) }
console.log(`survival (derived, v24+v25+v26): IES extreme ${R.ies.e1}/${R.ies.e0} = ${pct(RIES[0])} interior ${R.ies.i1}/${R.ies.i0} = ${pct(RIES[1])}; non-IES extreme ${R.non.e1}/${R.non.e0} = ${pct(RNON[0])} interior ${R.non.i1}/${R.non.i0} = ${pct(RNON[1])}`)
const files = paths.map(p => ({ p, items: JSON.parse(readFileSync(p, 'utf8')) }))
for (const f of files) if (!Array.isArray(f.items) || !f.items.length) { console.error(`REFUSING: ${f.p} holds no items`); process.exit(2) }
const merged = files.flatMap(f => f.items)
let failed = false
for (const { p, items } of [...(files.length > 1 ? files : []), { p: 'MERGED', items: merged }]) {
  const c = classes(items), t = position(items)
  if (c.n < 1) { console.error(`REFUSING: ${p} scored 0 items`); process.exit(2) }
  const keg = keyExtremityVerdict(items.filter(i => i?.self_audit?.risk !== 'at-risk')).status
  const g = gates(c, live, keg)
  console.log(`\n== ${p.replace(/^.*\//, '')}  items ${items.length}, scorable ${c.n}, non-numeric ${t.skip}  (IES ${c.ie}/${c.ii} extreme/interior, non-IES ${c.ne}/${c.ni})`)
  console.log(`  authored smallest ${c.min} / interior ${c.mid} / largest ${c.max}   z ${g.zMin.toFixed(2)} / ${g.zMax.toFixed(2)}   author-kept key-extremity-gate ${keg.toUpperCase()}`)
  console.log(`  split-rate (PLANNING, GATED)  kept ~${g.p.split.n.toFixed(1)}, extreme ${pct(g.p.split.share)}, headroom ${(100 * head(g.p.split.share)).toFixed(2)} pts; equal-rate interior z at that n ${g.zEq.toFixed(2)}`)
  if (c.ie + c.ii) console.log(`  IES ies-rate (PLANNING, GATED) kept ~${g.p.ies.n.toFixed(2)}, extreme ${pct(g.p.ies.share)}, headroom ${(100 * head(g.p.ies.share)).toFixed(2)} pts`)
  console.log(`  reported, domain-blind: ${Object.entries(g.p.blind).map(([k, v]) => `${k} ${pct(v.share)}`).join(' | ')}`)
  const nonIES = items.filter(i => i.domain !== IES)
  if (nonIES.length && nonIES.length < items.length) { const pn = proj(classes(nonIES)); console.log(`  reported, domain-blind on the non-IES ${nonIES.length} alone: ${Object.entries(pn.blind).map(([k, v]) => `${k} ${pct(v.share)}`).join(' | ')}`) }
  if (p !== 'MERGED') continue
  const cm = commission(c, live)
  console.log('  leave-one-out (one item dropped, no spare promoted):'); printLoo(cm.loo)
  const fails = COMM ? cm.fails.concat(g.fails.filter(f => f.startsWith('G5'))) : g.fails
  console.log(`  V28 PROJECTION${COMM ? ' (--commission)' : ''} ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
  if (fails.length) failed = true
}
process.exit(failed ? 1 : 0)
