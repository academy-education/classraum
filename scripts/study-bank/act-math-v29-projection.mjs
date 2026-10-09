#!/usr/bin/env node
/**
 * act-math-v29-projection.mjs [--selftest] [--commission] <batch.json ...>
 *
 * PRE-FLIGHT for act-math-v29 (ACT-MATH-V29-PREREGISTERED.md), written 2026-10-10
 * before any v29 item exists. Copied from act-math-v28-projection.mjs; the gates
 * are v28's, with the planning rates RE-DERIVED WITH v28 INCLUDED and one gate
 * added on the low side.
 *
 * WHY. v28's both-way IES brief moved IES extreme-key survival from 6/17 = 35.3%
 * (v24-v26) to 9/16 = 56.3%. Planning v29 at 35.3% would commission too many
 * extreme IES keys. The planning rates are now pooled over every graded batch
 * that ran the current machinery's ancestors, v24 + v25 + v26 + v28 (v27 was held
 * at stage 0 and never graded):
 *   ies     IES items by key position                    15/33 extreme, 22/23 interior
 *   nonies  every other item                             74/97, 70/80
 *   split   IES items at ies, the rest at nonies (the merged planning rate)
 *   reported: v28-alone IES (9/16, 6/6), and domain-blind v24 / v28 / pooled4
 *
 * At v29's size (~116 core) G2 (equal-rate interior z) binds: z grows with n, so
 * the authored interior share must sit near live act/math's 54.5%. That is
 * incompatible with key-extremity-projection.mjs's v25 bar (v24-rate share in
 * [45, 55]) held with 2.5 points of headroom (the selftest proves no composition
 * at IES 24 / non-IES 92 meets both with C1). The v24 rate is kept as the
 * steep-differential LOW-SIDE case, gated against the bar that actually decides
 * at stage 4 (key-extremity-gate, >= 40.0% extreme):
 *   G8 v24-rate kept extreme share >= 40.0% (--commission: >= 42.5%)
 * key-extremity-projection.mjs still runs (read-only, sha printed) and is REPORTED.
 *
 * GATES (exit 1), MERGED set:
 *   G1 split-rate kept extreme share in [45.0%, 55.0%]
 *   G2 equal-rate interior z >= -1.96 at the split-rate projected kept n
 *   G3 authored smallest z and largest z within +-1.96 of live act/math
 *   G4 split-rate projected kept n >= 10
 *   G5 author-kept key-extremity-gate PASS (items marked self_audit.risk at-risk removed)
 *   G8 v24-rate kept extreme share >= 40.0%
 * GATES, IES subset of the merged set:
 *   G6 ies-rate kept extreme share in [45.0%, 55.0%]
 *   G7 ies-rate projected kept IES n >= 10
 * --commission adds (the design check, run on the authored round-1 set):
 *   C1 split-rate share and ies-rate share each >= 2.5 points inside its band;
 *      G8 >= 42.5%
 *   C2 leave-one-out: dropping any ONE item (one of each class present) keeps G1-G8
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
  const s24 = survival('v24', 59, 39), s25 = survival('v25', 62, 50), s26 = survival('v26', 62, 52), s28 = survival('v28', 50, 40)
  const ies = add(s24.ies, s25.ies, s26.ies, s28.ies), non = add(s24.nonies, s25.nonies, s26.nonies, s28.nonies)
  return {
    ies, non, ies28: s28.ies, ies3: add(s24.ies, s25.ies, s26.ies),
    blind: { v24: add(s24.ies, s24.nonies), v28: add(s28.ies, s28.nonies), pooled4: add(ies, non) },
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
  if (!(p.blind.v24.share >= 0.40)) fails.push(`G8 v24-rate ${pct(p.blind.v24.share)} < 40.0%`)
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
  if (g.p.blind.v24.share < 0.425 - 1e-12) fails.push(`C1 v24-rate ${pct(g.p.blind.v24.share)} < 42.5%`)
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
  const chk = (r, e1, e0, i1, i0, lab) => { if (r.e1 !== e1 || r.e0 !== e0 || r.i1 !== i1 || r.i0 !== i0) { bad++; console.error(lab + ' derive FAIL', r) } }
  chk(R.ies, 15, 33, 22, 23, 'ies'); chk(R.non, 74, 97, 70, 80, 'nonies'); chk(R.ies28, 9, 16, 6, 6, 'ies v28'); chk(R.ies3, 6, 17, 16, 17, 'ies v24-v26 (the old 35.3%)')
  chk(R.blind.v24, 15, 28, 24, 31, 'v24')
  // v28's frozen 50 classes: IES 16/6, non-IES 14/14
  const c28 = classes(JSON.parse(readFileSync(DIR + 'act-math-v28.batch.json', 'utf8')))
  if (c28.ie !== 16 || c28.ii !== 6 || c28.ne !== 14 || c28.ni !== 14) { bad++; console.error('v28 classes FAIL', c28) }
  const mk = (ie, ii, ne, ni) => ({ ie, ii, ne, ni, n: ie + ii + ne + ni, mid: ii + ni, min: Math.floor((ie + ne) / 2), max: Math.ceil((ie + ne) / 2) })
  // v29 target (IES 16/8, non-IES 47/45) passes --commission
  const tgt = commission(mk(16, 8, 47, 45), live)
  if (tgt.fails.length) { bad++; console.error('target FAIL', tgt.fails) }
  // pinned target numbers (prereg table): split 47.8%, IES 48.7%, v24 45.1%
  if (pct(tgt.g.p.split.share) !== '47.8%' || pct(tgt.g.p.ies.share) !== '48.7%' || pct(tgt.g.p.blind.v24.share) !== '45.1%') { bad++; console.error('target numbers FAIL', pct(tgt.g.p.split.share), pct(tgt.g.p.ies.share), pct(tgt.g.p.blind.v24.share)) }
  // planning at the OLD IES rate (6/17) would have read the same IES 16/8 as 42.9%: outside G6. Re-deriving matters.
  const oldIes = 16 * (6 / 17) / (16 * (6 / 17) + 8 * (16 / 17))
  if (!(oldIes < 0.45) || pct(oldIes) !== '42.9%') { bad++; console.error('old-rate IES', oldIes) }
  // a 56%-extreme overshoot at v29 size (non-IES 52/40) fails G2
  const over = gates(mk(16, 8, 52, 40), live)
  if (!over.fails.some(f => f.startsWith('G2'))) { bad++; console.error('overshoot should fail G2', over.fails) }
  // IES at 3:1 (18/6) fails C1 on the IES high side
  const i3 = commission(mk(18, 6, 47, 45), live)
  if (!i3.fails.some(f => f.startsWith('C1 ies'))) { bad++; console.error('IES 18/6 should fail C1', i3.fails) }
  // an interior-heavy batch (12/12, 30/62) fails G8 (and G1)
  const lo = gates(mk(12, 12, 30, 62), live)
  if (!lo.fails.some(f => f.startsWith('G8'))) { bad++; console.error('interior-heavy should fail G8', lo.fails) }
  // key-extremity-projection's v25 bar with 2.5 points (v24 share >= 47.5%) cannot coexist with G2 and C1 at IES 24 / non-IES 92
  let both = 0, feas = 0
  for (let ie = 0; ie <= 24; ie++) for (let ne = 0; ne <= 92; ne++) {
    const c = mk(ie, 24 - ie, ne, 92 - ne), cm = commission(c, live)
    if (cm.fails.filter(f => !f.startsWith('C2')).length) continue
    feas++; if (proj(c).blind.v24.share >= 0.475) both++
  }
  if (both !== 0 || feas < 1) { bad++; console.error('v25-bar coexistence FAIL', both, feas) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log(`selftest 12/12 (compositions at IES 24 / non-IES 92 meeting G1-G8 + C1: ${feas}; of those with key-extremity-projection's v24 share >= 47.5%: ${both})`)
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
if (!paths.length) { console.error('usage: act-math-v29-projection.mjs [--commission] <batch.json ...>'); process.exit(2) }
console.log(`survival (derived, v24+v25+v26+v28): IES extreme ${R.ies.e1}/${R.ies.e0} = ${pct(RIES[0])} interior ${R.ies.i1}/${R.ies.i0} = ${pct(RIES[1])}; non-IES extreme ${R.non.e1}/${R.non.e0} = ${pct(RNON[0])} interior ${R.non.i1}/${R.non.i0} = ${pct(RNON[1])}; reported v28-alone IES ${R.ies28.e1}/${R.ies28.e0}, ${R.ies28.i1}/${R.ies28.i0}`)
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
  console.log(`  V29 PROJECTION${COMM ? ' (--commission)' : ''} ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
  if (fails.length) failed = true
}
process.exit(failed ? 1 : 0)
