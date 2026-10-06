#!/usr/bin/env node
/**
 * map-pilot-3-score.mjs oo         options-only screen per arm; strand-2 bar A + exact null
 * map-pilot-3-score.mjs ws         with-source graders; strand-1 bars S1-b/c/d, strand-2 C/F/G
 * map-pilot-3-score.mjs --selftest break-test the bar functions at their margins
 *
 * Bars: MAP-PILOT-3-2026-10-06.prereg.md. Denominators print first. Refuses
 * (exit 2) on a missing file, missing picks or a short population.
 */
import { readFileSync, existsSync } from 'node:fs'
const O = 'scripts/study-bank/map-pilot-3/'
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) } return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }

export function barA(mean, unanK, ctlR) {
  if (ctlR < 10 || ctlR > 45) return 'INVALID'
  if (mean <= 50 && unanK <= 3) return 'SUPPORTS'
  if (mean >= 75 || unanK >= 7) return 'FAILS'
  return 'BETWEEN (not passing)'
}
// exact null: picks fixed, the drawn version k of each passage uniform over 0..3
export function exactNull(items) {
  // items: [{group, choiceIdx:{A..D:idx}, picks:[letters]}]
  const groups = [...new Set(items.map(x => x.group))]
  const per = groups.map(g => [0, 1, 2, 3].map(v => items.filter(x => x.group === g).reduce((a, x) => a + x.picks.filter(p => x.choiceIdx[p] === v).length, 0)))
  let dist = { 0: 1 }
  for (const pv of per) { const nd = {}; for (const [h, c] of Object.entries(dist)) for (const x of pv) nd[+h + x] = (nd[+h + x] ?? 0) + c / 4; dist = nd }
  return { dist, mean: Object.entries(dist).reduce((a, [h, p]) => a + h * p, 0), draws: 4 ** groups.length }
}
export function wsItem(gr, k) {
  const why = []
  for (const [t, g] of gr) {
    const v = g
    if (v.pick !== k.letter) why.push(`${t} picked ${v.pick}!=${k.letter}`)
    if (v.second_defensible && v.second_defensible !== 'none') why.push(`${t} 2nd ${v.second_defensible}`)
    if (v.grade_fit && v.grade_fit !== 'fits') why.push(`${t} ${v.grade_fit}`)
  }
  const excl = gr.every(([, v]) => v.pick === k.letter && !(v.second_defensible && v.second_defensible !== 'none'))
  const dd = gr.map(([, v]) => new Set([].concat(v.dead_distractors ?? []).map(String).filter(x => /^[A-D]$/.test(x))))
  const deadBoth = [...dd[0]].filter(x => dd[1].has(x))
  const tooEasy = gr.some(([, v]) => v.grade_fit === 'too_easy')
  const bothBelow = gr.every(([, v]) => bandLo(v.band_assigned) < bandLo(k.target_band))
  return { why, c3: why.length === 0, c4: deadBoth.length === 0, deadBoth, excl, easy: tooEasy || bothBelow, tooEasy, bothBelow }
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  expect(barA(50, 3, 25) === 'SUPPORTS', 'A: 50% with 3/10 unanimous SUPPORTS')
  expect(barA(53.3, 3, 25).startsWith('BETWEEN'), 'A: 53.3% is BETWEEN')
  expect(barA(40, 4, 25).startsWith('BETWEEN'), 'A: 4/10 unanimous is BETWEEN')
  expect(barA(76.7, 0, 25) === 'FAILS' && barA(30, 7, 25) === 'FAILS', 'A: >= 75% or 7/10 unanimous FAILS')
  expect(barA(30, 0, 50) === 'INVALID' && barA(30, 0, 8) === 'INVALID', 'A: control R outside 10-45% is INVALID')
  // null: a solver that always picks choice 0 hits all 5 items of a passage in exactly 1 of 4 draws
  const it = g => ({ group: g, choiceIdx: { A: 0, B: 1, C: 2, D: 3 }, picks: ['A', 'A', 'A'] })
  const n = exactNull([it('P1'), it('P1'), it('P2')])
  expect(Math.abs(n.mean - 9 * 0.25) < 1e-9 && Math.abs(n.dist[9] - 1 / 16) < 1e-9 && n.draws === 16, `exact null: mean 2.25 of 9, P(all 9) = 1/16 (got mean ${n.mean}, P ${n.dist[9]})`)
  const k = { letter: 'B', target_band: 'RIT 200-209' }
  const g = (pick, extra = {}) => ({ pick, second_defensible: null, grade_fit: 'fits', band_assigned: 'RIT 200-209', dead_distractors: [], ...extra })
  expect(wsItem([['a', g('B')], ['b', g('B')]], k).c3 && !wsItem([['a', g('B')], ['b', g('B')]], k).easy, 'ws: clean item passes, not easy')
  expect(wsItem([['a', g('B', { band_assigned: 'RIT 190-199' })], ['b', g('B', { band_assigned: 'RIT 180-189' })]], k).easy, 'F: both graders assign a lower band -> easy')
  expect(!wsItem([['a', g('B', { band_assigned: 'RIT 190-199' })], ['b', g('B')]], k).easy, 'F: one grader lower is not easy')
  expect(wsItem([['a', g('B', { grade_fit: 'too_easy' })], ['b', g('B')]], k).easy, 'F: one too_easy -> easy')
  expect(!wsItem([['a', g('B', { second_defensible: 'C' })], ['b', g('B')]], k).excl, 'C: a second defensible answer breaks exclusivity')
  expect(!wsItem([['a', g('B', { dead_distractors: ['D'] })], ['b', g('B', { dead_distractors: ['D'] })]], k).c4, 'G: dead named by both fails condition 4')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every strand bar can fail')
  process.exit(fail ? 1 : 0)
}

const mode = process.argv[2]
if (import.meta.url !== `file://${process.argv[1]}`) { /* imported */ }
else if (mode === '--selftest') selftest()
else if (mode === 'oo') {
  const key = rd(O + 'oo.key.json'), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(s => O + `oo.solver-${s}.json`).filter(existsSync).map(p => [p, lab(rd(p))])
  if (sol.length < 3) { console.error(`REFUSING: ${sol.length} of 3 samples present; the bar is pre-registered on 3`); process.exit(2) }
  for (const [p, s] of sol) { const miss = ids.filter(i => !/^[A-D]$/.test(s[i]?.pick ?? '')); if (miss.length) { console.error(`REFUSING: ${p} missing ${miss.length} picks`); process.exit(2) } }
  const out = {}
  for (const id of ids) {
    const k = key[id], o = (out[k.arm] ??= { n: 0, hits: 0, picks: 0, unanS: 0, unanK: 0, deal: {}, items: [] })
    o.n++; o.deal[k.letter] = (o.deal[k.letter] ?? 0) + 1
    const picks = sol.map(([, s]) => s[id].pick), h = picks.filter(x => x === k.letter).length
    o.hits += h; o.picks += picks.length
    if (new Set(picks).size === 1) { o.unanS++; if (h === picks.length) o.unanK++ }
    o.items.push(`${k.localId.replace(/^MAPP3-|^MAPWV-/, '')}:${h}/${picks.length}`)
  }
  const want = { comprehension: 10, vocab: 6, usage: 8, mechanics: 10, controlR: 8, controlV: 12 }
  for (const [a, n] of Object.entries(want)) if (out[a]?.n !== n) { console.error(`REFUSING: arm ${a} has ${out[a]?.n ?? 0}, expected ${n}`); process.exit(2) }
  const pct = o => 100 * o.hits / o.picks
  for (const a of Object.keys(want)) {
    const o = out[a], ctl = 100 * Math.max(...Object.values(o.deal)) / o.n
    console.log(`${a.padEnd(13)} n=${String(o.n).padStart(2)} x 3 = ${o.picks} picks | mean ${pct(o).toFixed(1)}% vs own best-fixed-letter ${ctl.toFixed(1)}% (margin ${(pct(o) - ctl).toFixed(1)}) | unanimous on some letter ${o.unanS}/${o.n}, on key ${o.unanK}/${o.n}`)
    if (!a.startsWith('control')) console.log(`              per item ${o.items.join(' ')}`)
  }
  const c = out.comprehension, r = out.controlR, v = out.controlV
  console.log(`\nSTRAND 2 BAR A: ${barA(pct(c), c.unanK, pct(r))} (comprehension ${pct(c).toFixed(1)}%, unanimous on key ${c.unanK}/10; control R ${pct(r).toFixed(1)}%; batch 2: 83.3%, 5/6)`)
  const items = ids.filter(i => key[i].arm === 'comprehension').map(i => ({ group: key[i].group, choiceIdx: key[i].choiceIdx, picks: sol.map(([, s]) => s[i].pick) }))
  const nl = exactNull(items), obs = c.hits
  const pge = Object.entries(nl.dist).filter(([h]) => +h >= obs).reduce((a, [, p]) => a + p, 0)
  const p50 = Object.entries(nl.dist).filter(([h]) => +h > 0.5 * c.picks).reduce((a, [, p]) => a + p, 0)
  console.log(`  exact null over ${nl.draws} draws (picks held fixed): mean ${nl.mean.toFixed(2)}/${c.picks} (${(100 * nl.mean / c.picks).toFixed(1)}%); P(>= observed ${obs}) = ${pge.toFixed(3)}; P(> 50%) = ${p50.toFixed(3)}`)
  for (const a of ['vocab', 'usage']) if (pct(out[a]) - pct(v) > 20) console.log(`  SCREEN FLAG (not a verdict): ${a} ${pct(out[a]).toFixed(1)}% is more than 20 points above control V ${pct(v).toFixed(1)}%`)
} else if (mode === 'ws') {
  const key = rd(O + 'ws.key.json'), ids = Object.keys(key)
  const gr = ['a', 'b'].map(s => O + `ws.grader-${s}.json`).filter(existsSync).map(p => [p.split('.').at(-2), lab(rd(p))])
  if (gr.length < 2) { console.error(`REFUSING: ${gr.length} of 2 grader files`); process.exit(2) }
  for (const [t, g] of gr) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit)); if (miss.length) { console.error(`REFUSING: ${t} missing pick/band_assigned/grade_fit on ${miss.join(',')}`); process.exit(2) } }
  if (ids.length !== 34) { console.error(`REFUSING: ${ids.length} with-source items, expected 34`); process.exit(2) }
  const s1 = { n: 0, pass: 0, pass3: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, by: {} }, s2 = { n: 0, excl: 0, easy: 0, dead: 0, pass: 0 }
  for (const id of ids) {
    const k = key[id], r = wsItem(gr.map(([t, g]) => [t, g[id]]), k)
    const comp = k.stratum === 'comprehension'
    const soft = []
    for (const [t, g] of gr) { if (g[id].free_elimination) soft.push(`${t} free-elim: ${String(g[id].free_elimination).slice(0, 90)}`); if (g[id].dimensions_varied) soft.push(`${t} dims: ${JSON.stringify(g[id].dimensions_varied).slice(0, 90)}`) }
    if (!r.c4) r.why.push(`dead by both: ${r.deadBoth.join(',')}`)
    if (comp) {
      s2.n++; if (r.excl) s2.excl++; if (r.easy) s2.easy++; if (!r.c4) s2.dead++; if (r.c3 && r.c4) s2.pass++
      if (r.easy) r.why.push(`EASY (${r.tooEasy ? 'too_easy' : ''}${r.bothBelow ? ' both below band' : ''})`)
    } else {
      s1.n++; if (r.c3) s1.pass3++; if (r.c3 && r.c4) s1.pass++
      const b = (s1.by[k.stratum] ??= { n: 0, pass: 0 }); b.n++; if (r.c3 && r.c4) b.pass++
      for (const [t, g] of gr) {
        if (g[id].band === 'easier') s1.easier++
        if (g[id].band === 'harder') s1.harder++
        s1.diffs[t].push((bandLo(g[id].band_assigned) - bandLo(k.target_band)) / 10)
      }
    }
    console.log(`${r.c3 && r.c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.stratum} ${k.target_band}] assigned ${gr.map(([t, g]) => `${t}:${g[id].band_assigned}`).join(' ')} ${r.why.join(' | ')}${soft.length ? '\n        ~ ' + soft.join('\n        ~ ') : ''}`)
  }
  if (s1.n !== 24 || s2.n !== 10) { console.error(`REFUSING: strata ${s1.n}/${s2.n}, expected 24/10`); process.exit(2) }
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(s1.diffs.a), mb = mean(s1.diffs.b)
  console.log(`\nSTRAND 1 (n=24)`)
  console.log(`  S1-b pilot-pass (conditions 1-4) ${s1.pass}/24 (bar >= 20) -> ${s1.pass >= 20 ? 'PASS' : 'FAIL'} | batch-1-comparable (1-3) ${s1.pass3}/24 | by stratum ${JSON.stringify(s1.by)}`)
  console.log(`  S1-c calibration: easier ${s1.easier}/48 (bar <= 8), harder ${s1.harder}/48 (bar < 12) -> ${s1.easier <= 8 && s1.harder < 12 ? 'PASS' : 'FAIL'}  (batch 2: 11 easier, 5 harder)`)
  console.log(`  S1-d band: mean band_assigned - target, a ${ma.toFixed(2)}, b ${mb.toFixed(2)} (bar within +-0.5) -> ${Math.abs(ma) <= 0.5 && Math.abs(mb) <= 0.5 ? 'PASS' : 'FAIL'}; below/same/above a ${['<', '=', '>'].map(o => s1.diffs.a.filter(x => o === '<' ? x < 0 : o === '=' ? x === 0 : x > 0).length).join('/')}, b ${['<', '=', '>'].map(o => s1.diffs.b.filter(x => o === '<' ? x < 0 : o === '=' ? x === 0 : x > 0).length).join('/')}`)
  console.log(`STRAND 2 (n=10)`)
  console.log(`  C exclusivity ${s2.excl}/10 (bar >= 9) -> ${s2.excl >= 9 ? 'PASS' : 'FAIL'}`)
  console.log(`  F difficulty: easy ${s2.easy}/10 (bar <= 2) -> ${s2.easy <= 2 ? 'PASS' : 'FAIL'}`)
  console.log(`  G dead distractor named by both on ${s2.dead}/10 (bar <= 1) -> ${s2.dead <= 1 ? 'PASS' : 'FAIL'}`)
  console.log(`  reported: batch-2 pilot-pass (conditions 1-4) ${s2.pass}/10 (batch 2 comprehension 3/6)`)
} else { console.error('usage: map-pilot-3-score.mjs oo|ws|--selftest'); process.exit(2) }
