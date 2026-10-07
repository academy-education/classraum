#!/usr/bin/env node
/**
 * map-adapt-score.mjs oo          stage 1: bars A, V, P (options-only, adapted vs control vs SOURCE)
 * map-adapt-score.mjs ws          stage 2: bars C, S1-b, S1-c, S1-d (two with-source graders)
 * map-adapt-score.mjs nat         stage 3: bar E (relative naturalness; map-wv.mjs scoreNat, imported)
 * map-adapt-score.mjs --selftest  break-test every bar at its margin
 *
 * Bars: MAP-ADAPT-PILOT-2026-10-07.prereg.md. Denominators print first.
 * Refuses (exit 2) on a missing file, a missing pick or a short population.
 * The per-item with-source function is batch 3's wsItem, imported unchanged.
 */
import { readFileSync, existsSync } from 'node:fs'
import { wsItem } from './map-pilot-3-score.mjs'
import { scoreNat } from './map-wv.mjs'

const O = 'scripts/study-bank/map-adapt/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }
const N = 24

export function barA(mean, unanK, n, ctlR) {
  if (ctlR < 10 || ctlR > 45) return 'INVALID'
  return mean <= 50 && unanK <= Math.floor(0.3 * n) ? 'PASS' : 'FAIL'
}
export function barV(mean, ctlV) {
  if (ctlV < 30 || ctlV >= 80) return 'INVALID'           // >= 80: ctlV + 20 >= 100, the bar could not fail
  return mean <= ctlV + 20 ? 'PASS' : 'FAIL'
}
export function barP(adHit, adChance, srcHit, srcChance, ctlAd, ctlSrc) {
  const srcM = srcHit - srcChance, adM = adHit - adChance, delta = adM - srcM
  if (Math.abs(ctlAd - ctlSrc) > 25) return { verdict: 'INVALID (control populations differ by > 25 points)', delta, srcM, adM }
  if (srcM + 10 >= 100 - adChance) return { verdict: 'INVALID (source margin leaves no headroom; the bar could not fail)', delta, srcM, adM }
  return { verdict: delta <= 10 ? 'PASS' : 'FAIL', delta, srcM, adM }
}
export function wsBars(s) {
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(s.diffs.a), mb = mean(s.diffs.b)
  return { C: s.excl >= 20, b: s.pass >= 20, c: s.easier <= 8 && s.harder < 12, d: Math.abs(ma) <= 0.5 && Math.abs(mb) <= 0.5, ma, mb }
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  expect(barA(50, 5, 17, 25) === 'PASS', 'A: 50% with 5/17 unanimous passes')
  expect(barA(50.1, 0, 17, 25) === 'FAIL', 'A: 50.1% fails')
  expect(barA(30, 6, 17, 25) === 'FAIL', 'A: 6/17 unanimous fails')
  expect(barA(30, 0, 17, 46) === 'INVALID' && barA(30, 0, 17, 9) === 'INVALID', 'A: control R outside 10-45% is INVALID')
  expect(barV(72.8, 52.8) === 'PASS' && barV(72.9, 52.8) === 'FAIL', 'V: control V + 20 is the margin')
  expect(barV(10, 80) === 'INVALID' && barV(10, 29) === 'INVALID', 'V: control V >= 80 (ceiling) or < 30 is INVALID')
  expect(barP(45, 25, 35, 20, 40, 40).verdict === 'PASS', 'P: +5 over the source margin passes')
  expect(barP(45, 25, 30, 20, 40, 40).verdict === 'PASS' && barP(45.1, 25, 30, 20, 40, 40).verdict === 'FAIL', 'P: delta exactly +10 passes, +10.1 fails')
  expect(barP(90, 25, 90, 20, 40, 40).verdict.startsWith('INVALID'), 'P: source margin 70 (no headroom) is INVALID')
  expect(barP(40, 25, 40, 20, 20, 50).verdict.startsWith('INVALID'), 'P: controls 30 points apart is INVALID')
  const z = (n, v) => Array(n).fill(v)
  const s0 = { excl: 20, pass: 20, easier: 8, harder: 11, diffs: { a: z(24, 0), b: z(24, 0) } }
  const B = wsBars(s0); expect(B.C && B.b && B.c && B.d, 'ws: every bar passes exactly at its margin')
  expect(!wsBars({ ...s0, excl: 19 }).C, 'C: 19/24 fails')
  expect(!wsBars({ ...s0, pass: 19 }).b, 'S1-b: 19/24 fails')
  expect(!wsBars({ ...s0, easier: 9 }).c && !wsBars({ ...s0, harder: 12 }).c, 'S1-c: easier 9 or harder 12 fails')
  expect(!wsBars({ ...s0, diffs: { a: [...z(13, -1), ...z(11, 0)], b: z(24, 0) } }).d, 'S1-d: mean -0.54 fails')
  expect(!wsBars({ ...s0, diffs: { a: z(24, 0), b: [...z(13, 1), ...z(11, 0)] } }).d, 'S1-d: mean +0.54 (grader b) fails')
  const k = { letter: 'B', target_band: 'RIT 200-209' }
  const g = (pick, x = {}) => ({ pick, second_defensible: null, grade_fit: 'fits', band_assigned: 'RIT 200-209', dead_distractors: [], ...x })
  expect(!wsItem([['a', g('B')], ['b', g('B', { second_defensible: 'C' })]], k).excl, 'imported wsItem: a second defensible answer breaks exclusivity')
  expect(!wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['C'] })]], k).c4, 'imported wsItem: dead by both fails condition 4')
  const nkey = { N1: 'P1', N2: 'P2', N3: 'P3', N4: 'ctl:1', N5: 'ctl:2', N6: 'ctl:3', N7: 'ctl:4', N8: 'ctl:5', N9: 'ctl:6' }
  const J = rs => Object.fromEntries(rs.map((r, i) => [`N${i + 1}`, { rating: r, reason: 'x' }]))
  expect(scoreNat(nkey, [J([3, 3, 3, 4, 4, 4, 4, 3, 4]), J([3, 3, 4, 4, 4, 4, 4, 4, 4])]).verdict === 'FAIL', 'E: candidate median 3 vs control 4 fails')
  expect(scoreNat(nkey, [J([4, 4, 3, 4, 4, 4, 4, 3, 4]), J([4, 3, 4, 4, 4, 4, 4, 4, 4])]).verdict === 'PASS', 'E: candidate median 4 vs control 4 passes')
  expect(scoreNat(nkey, [J([4, 4, 4, 1, 1, 1, 1, 1, 2]), J([4, 4, 4, 1, 1, 1, 1, 1, 1])]).verdict === 'INVALID', 'E: control median 1 is INVALID')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every bar can fail at its margin')
  process.exit(fail ? 1 : 0)
}

function ooRead(name) {
  const key = rd(O + `${name}.key.json`), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(s => O + `${name}.solver-${s}.json`)
  for (const p of sol) if (!existsSync(p)) die(`${p} missing; the screen is pre-registered on 3 samples per file`)
  const S = sol.map(p => [p, lab(rd(p))])
  for (const [p, s] of S) { const miss = ids.filter(i => !new RegExp(`^[A-${key[i].width === 5 ? 'E' : 'D'}]$`).test(s[i]?.pick ?? '')); if (miss.length) die(`${p} missing or out-of-range picks on ${miss.length} ids`) }
  const arms = {}, pairs = {}
  for (const id of ids) {
    const k = key[id], picks = S.map(([, s]) => s[id].pick), h = picks.filter(x => x === k.letter).length
    const a = (arms[k.arm] ??= { n: 0, hits: 0, picks: 0, chance: 0, unanS: 0, unanK: 0, items: [] })
    a.n++; a.hits += h; a.picks += picks.length; a.chance += 1 / k.width
    if (new Set(picks).size === 1) { a.unanS++; if (h === picks.length) a.unanK++ }
    a.items.push(`${String(k.localId).replace(/^src:/, '').slice(0, 8)}:${h}/3`)
    if (k.pair) pairs[k.pair] = { h, w: k.width, arm: k.arm }
  }
  return { arms, pairs, n: ids.length }
}
const pct = a => 100 * a.hits / a.picks

const mode = process.argv[2]
if (import.meta.url !== `file://${process.argv[1]}`) { /* imported */ }
else if (mode === '--selftest') selftest()
else if (mode === 'oo') {
  const ad = ooRead('oo-adapted'), src = ooRead('oo-source')
  const batch = rd(O + 'batch.json')
  console.log(`denominators: adapted file ${ad.n} items x 3 samples, source file ${src.n} items x 3 samples; frozen adapted items ${batch.length} of ${N}`)
  for (const [nm, f] of [['ADAPTED', ad], ['SOURCE', src]]) {
    console.log(`\n${nm} file`)
    for (const [a, o] of Object.entries(f.arms)) console.log(`  ${a.padEnd(13)} n=${String(o.n).padStart(2)} x3 = ${o.picks} picks | ${pct(o).toFixed(1)}% vs chance ${(100 * o.chance / o.n).toFixed(1)}% | unanimous on some letter ${o.unanS}/${o.n}, on key ${o.unanK}/${o.n}${a.startsWith('control') ? '' : '\n                per item ' + o.items.join(' ')}`)
  }
  const merge = (f, arms) => arms.reduce((m, a) => { const o = f.arms[a]; if (!o) return m; return { n: m.n + o.n, hits: m.hits + o.hits, picks: m.picks + o.picks, chance: m.chance + o.chance, unanK: m.unanK + o.unanK } }, { n: 0, hits: 0, picks: 0, chance: 0, unanK: 0 })
  const cR = pct(ad.arms.controlR), cV = pct(ad.arms.controlV)
  const A = merge(ad, ['comprehension', 'writing']), V = ad.arms.vocab
  const vA = barA(pct(A), A.unanK, A.n, cR), vV = barV(pct(V), cV)
  console.log(`\nBAR A  comprehension + writing (n=${A.n}): ${pct(A).toFixed(1)}% (bar <= 50%), unanimous on key ${A.unanK}/${A.n} (bar <= ${Math.floor(0.3 * A.n)}); control R ${cR.toFixed(1)}% (valid 10-45; batches 2-4: 25.0/25.0/33.3) -> ${vA}`)
  console.log(`BAR V  vocabulary (n=${V.n}): ${pct(V).toFixed(1)}% vs control V ${cV.toFixed(1)}% + 20 = ${(cV + 20).toFixed(1)} (valid 30-<80; batches 2-4: 58.3/58.3/52.8) -> ${vV}`)
  const both = Object.keys(ad.pairs).filter(p => src.pairs[p])
  const sum = (f, ks, fn) => ks.reduce((a, k) => a + fn(f.pairs[k]), 0)
  const adHit = 100 * sum(ad, both, x => x.h) / (3 * both.length), adCh = 100 * sum(ad, both, x => 1 / x.w) / both.length
  const srHit = 100 * sum(src, both, x => x.h) / (3 * both.length), srCh = 100 * sum(src, both, x => 1 / x.w) / both.length
  const ctlAd = merge(ad, ['controlR', 'controlV']), ctlSr = merge(src, ['controlR', 'controlV'])
  const P = barP(adHit, adCh, srHit, srCh, pct(ctlAd), pct(ctlSr))
  console.log(`BAR P  paired source vs adapted (n=${both.length} pairs x 3 samples each): adapted ${adHit.toFixed(1)}% vs chance ${adCh.toFixed(1)} (margin ${P.adM.toFixed(1)}); source ${srHit.toFixed(1)}% vs chance ${srCh.toFixed(1)} (margin ${P.srcM.toFixed(1)}); delta ${P.delta >= 0 ? '+' : ''}${P.delta.toFixed(1)} (bar <= +10); controls R+V adapted file ${pct(ctlAd).toFixed(1)}% vs source file ${pct(ctlSr).toFixed(1)}% -> ${P.verdict}`)
  for (const arm of ['comprehension', 'vocab', 'writing']) {
    const ks = both.filter(p => ad.pairs[p].arm === arm); if (!ks.length) continue
    const a = 100 * sum(ad, ks, x => x.h) / (3 * ks.length) - 100 * sum(ad, ks, x => 1 / x.w) / ks.length
    const s = 100 * sum(src, ks, x => x.h) / (3 * ks.length) - 100 * sum(src, ks, x => 1 / x.w) / ks.length
    console.log(`       reported by arm: ${arm.padEnd(13)} n=${ks.length} adapted margin ${a.toFixed(1)}, source margin ${s.toFixed(1)}, delta ${(a - s).toFixed(1)}`)
  }
  const ok = [vA, vV, P.verdict].every(v => v === 'PASS')
  console.log(`\nSTAGE 1 ${ok ? 'PASSES' : 'DOES NOT PASS'}`)
} else if (mode === 'ws') {
  const key = rd(O + 'ws.key.json'), ids = Object.keys(key)
  const gr = ['a', 'b'].map(t => [t, O + `ws.grader-${t}.json`]).map(([t, p]) => [t, lab(rd(p))])
  for (const [t, g] of gr) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !['plausible', 'easier', 'harder'].includes(g[i]?.band)); if (miss.length) die(`grader ${t} missing fields on ${miss.join(',')}`) }
  if (ids.length < 22) die(`${ids.length} with-source items; stage 0 requires >= 22`)
  console.log(`denominators: ${ids.length} rendered items x 2 graders; bars count out of ${N} (${N - ids.length} stage-0 drop(s) count as failures)\n`)
  const s = { excl: 0, pass: 0, pass3: 0, easier: 0, harder: 0, c4holds: 0, diffs: { a: [], b: [] }, by: {} }
  for (const id of ids) {
    const k = key[id], r = wsItem(gr.map(([t, g]) => [t, g[id]]), k)
    if (r.excl) s.excl++
    if (r.c3) s.pass3++; if (r.c3 && r.c4) s.pass++; if (!r.c4) { s.c4holds++; r.why.push(`dead by both: ${r.deadBoth.join(',')}`) }
    const b = (s.by[k.stratum] ??= { n: 0, pass: 0 }); b.n++; if (r.c3 && r.c4) b.pass++
    for (const [t, g] of gr) { if (g[id].band === 'easier') s.easier++; if (g[id].band === 'harder') s.harder++; s.diffs[t].push((bandLo(g[id].band_assigned) - bandLo(k.target_band)) / 10) }
    const soft = gr.filter(([, g]) => g[id].free_elimination).map(([t, g]) => `${t} free-elim: ${String(g[id].free_elimination).slice(0, 120)}`)
    console.log(`${r.c3 && r.c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.stratum} ${k.target_band}${k.group ? ' ' + k.group : ''}] assigned ${gr.map(([t, g]) => `${t}:${g[id].band_assigned}(${g[id].band})`).join(' ')} ${r.why.join(' | ')}${soft.length ? '\n        ~ ' + soft.join('\n        ~ ') : ''}`)
  }
  const B = wsBars(s)
  console.log(`\nBAR C    exclusivity (both pick the key, neither names a second): ${s.excl}/${N} (bar >= 20) -> ${B.C ? 'PASS' : 'FAIL'}`)
  console.log(`BAR S1-b pilot-pass (conditions 1-4): ${s.pass}/${N} (bar >= 20) -> ${B.b ? 'PASS' : 'FAIL'}; conditions 1-3 ${s.pass3}/${N}; condition-4 holds ${s.c4holds}; by stratum ${JSON.stringify(s.by)}`)
  console.log(`BAR S1-c calibration: easier ${s.easier}/${2 * ids.length} (bar <= 8), harder ${s.harder}/${2 * ids.length} (bar < 12) -> ${B.c ? 'PASS' : 'FAIL'}`)
  console.log(`BAR S1-d band offset: grader a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
  console.log(`\nSTAGE 2 ${B.C && B.b && B.c && B.d ? 'PASSES' : 'DOES NOT PASS'}`)
} else if (mode === 'nat') {
  const nkey = rd(O + 'naturalness.key.json')
  const labs = ['nat-1.json', 'nat-2.json'].map(f => lab(rd(O + f)))
  const r = scoreNat(nkey, labs)
  if (r.error) die(r.error)
  r.log.forEach(x => console.log(`  judge: ${x}`))
  if (r.per) { r.per.forEach(x => console.log(`  candidate ${x}`)); console.log(`  pooled medians: candidate ${r.cm} (n=${r.cr.length}), control ${r.lm} (n=${r.lr.length})`) }
  console.log(`BAR E: ${r.verdict}\n\nSTAGE 3 ${r.verdict === 'PASS' ? 'PASSES' : 'DOES NOT PASS'}`)
} else die('usage: map-adapt-score.mjs oo|ws|nat|--selftest')
