#!/usr/bin/env node
/**
 * map-pilot-4-score.mjs oo         options-only screen per arm (reported, not deciding)
 * map-pilot-4-score.mjs ws         two with-source graders: bars S1-b, S1-c, S1-d
 * map-pilot-4-score.mjs teacher    the pre-gate teacher-voice distractor ratings (reported)
 * map-pilot-4-score.mjs --selftest break-test the bar functions at their margins
 *
 * Bars: MAP-PILOT-4-2026-10-06.prereg.md, the same as batch 3 strand 1
 * (map-pilot-3-score.mjs) so the two are comparable; the per-item pilot-pass
 * function is imported from batch 3 unchanged. Denominators print first.
 * Refuses (exit 2) on a missing file, missing picks or a short population.
 */
import { readFileSync, existsSync } from 'node:fs'
import { wsItem } from './map-pilot-3-score.mjs'
const O = 'scripts/study-bank/map-pilot-4/'
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) } return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }

export function bars(s1) {
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(s1.diffs.a), mb = mean(s1.diffs.b)
  return {
    b: s1.pass >= 20,
    c: s1.easier <= 8 && s1.harder < 12,
    d: Math.abs(ma) <= 0.5 && Math.abs(mb) <= 0.5,
    ma, mb,
  }
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  expect(bars({ pass: 20, easier: 8, harder: 11, diffs: { a: z(24, 0), b: z(24, 0) } }).b, 'S1-b: 20/24 passes')
  expect(!bars({ pass: 19, easier: 0, harder: 0, diffs: { a: z(24, 0), b: z(24, 0) } }).b, 'S1-b: 19/24 fails')
  expect(bars({ pass: 24, easier: 8, harder: 11, diffs: { a: z(24, 0), b: z(24, 0) } }).c, 'S1-c: easier 8, harder 11 passes')
  expect(!bars({ pass: 24, easier: 9, harder: 0, diffs: { a: z(24, 0), b: z(24, 0) } }).c, 'S1-c: easier 9 fails')
  expect(!bars({ pass: 24, easier: 0, harder: 12, diffs: { a: z(24, 0), b: z(24, 0) } }).c, 'S1-c: harder 12 fails')
  expect(bars({ pass: 24, easier: 0, harder: 0, diffs: { a: [...z(12, -1), ...z(12, 0)], b: z(24, 0) } }).d, 'S1-d: mean -0.5 passes')
  expect(!bars({ pass: 24, easier: 0, harder: 0, diffs: { a: [...z(13, -1), ...z(11, 0)], b: z(24, 0) } }).d, 'S1-d: mean -0.54 fails')
  expect(!bars({ pass: 24, easier: 0, harder: 0, diffs: { a: z(24, 0), b: [...z(13, 1), ...z(11, 0)] } }).d, 'S1-d: mean +0.54 (grader b) fails')
  const k = { letter: 'B', target_band: 'RIT 180-189' }
  const g = (pick, extra = {}) => ({ pick, second_defensible: null, grade_fit: 'fits', band_assigned: 'RIT 180-189', dead_distractors: [], ...extra })
  expect(!wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['C'] })]], k).c4, 'imported wsItem: dead by both fails condition 4')
  expect(wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['D'] })]], k).c4, 'imported wsItem: dead named by one each passes condition 4')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every bar can fail at its margin')
  process.exit(fail ? 1 : 0)
}

const mode = process.argv[2]
if (import.meta.url !== `file://${process.argv[1]}`) { /* imported */ }
else if (mode === '--selftest') selftest()
else if (mode === 'oo') {
  const key = rd(O + 'oo.key.json'), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(s => O + `oo.solver-${s}.json`).filter(existsSync).map(p => [p, lab(rd(p))])
  if (sol.length < 3) { console.error(`REFUSING: ${sol.length} of 3 samples present; the screen is pre-registered on 3`); process.exit(2) }
  for (const [p, s] of sol) { const miss = ids.filter(i => !/^[A-D]$/.test(s[i]?.pick ?? '')); if (miss.length) { console.error(`REFUSING: ${p} missing ${miss.length} picks`); process.exit(2) } }
  const out = {}
  for (const id of ids) {
    const k = key[id], o = (out[k.arm] ??= { n: 0, hits: 0, picks: 0, unanS: 0, unanK: 0, deal: {}, items: [] })
    o.n++; o.deal[k.letter] = (o.deal[k.letter] ?? 0) + 1
    const picks = sol.map(([, s]) => s[id].pick), h = picks.filter(x => x === k.letter).length
    o.hits += h; o.picks += picks.length
    if (new Set(picks).size === 1) { o.unanS++; if (h === picks.length) o.unanK++ }
    o.items.push(`${k.localId.replace(/^MAPP4-/, '')}:${h}/${picks.length}`)
  }
  const want = { vocab: 6, usage: 8, mechanics: 10, controlR: 8, controlV: 12 }
  for (const [a, n] of Object.entries(want)) if (out[a]?.n !== n) { console.error(`REFUSING: arm ${a} has ${out[a]?.n ?? 0}, expected ${n}`); process.exit(2) }
  const pct = o => 100 * o.hits / o.picks
  for (const a of Object.keys(want)) {
    const o = out[a], ctl = 100 * Math.max(...Object.values(o.deal)) / o.n
    console.log(`${a.padEnd(10)} n=${String(o.n).padStart(2)} x 3 = ${o.picks} picks | mean ${pct(o).toFixed(1)}% vs own best-fixed-letter ${ctl.toFixed(1)}% (margin ${(pct(o) - ctl).toFixed(1)}) | unanimous on some letter ${o.unanS}/${o.n}, on key ${o.unanK}/${o.n}`)
    if (!a.startsWith('control')) console.log(`           per item ${o.items.join(' ')}`)
  }
  const v = out.controlV, r = out.controlR
  console.log(`\ncontrols: R ${pct(r).toFixed(1)}% (batch 2-3: 25.0%), V ${pct(v).toFixed(1)}% (batch 2-3: 58.3%)`)
  console.log(`batch 3 arms for comparison: vocabulary 22.2%, usage 33.3%, mechanics 100% (the construct)`)
  let flag = 0
  for (const a of ['vocab', 'usage']) if (pct(out[a]) - pct(v) > 20) { flag++; console.log(`  SCREEN FLAG (not a verdict): ${a} ${pct(out[a]).toFixed(1)}% is more than 20 points above control V ${pct(v).toFixed(1)}%`) }
  if (!flag) console.log('  no screen flag (vocab and usage each within 20 points of control V)')
} else if (mode === 'ws') {
  const key = rd(O + 'ws.key.json'), ids = Object.keys(key)
  const gr = ['a', 'b'].map(s => O + `ws.grader-${s}.json`).filter(existsSync).map(p => [p.split('.').at(-2).replace('grader-', ''), lab(rd(p))])
  if (gr.length < 2) { console.error(`REFUSING: ${gr.length} of 2 grader files`); process.exit(2) }
  if (ids.length !== 24) { console.error(`REFUSING: ${ids.length} with-source items, expected 24`); process.exit(2) }
  for (const [t, g] of gr) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !['plausible', 'easier', 'harder'].includes(g[i]?.band)); if (miss.length) { console.error(`REFUSING: ${t} missing pick/band_assigned/grade_fit/band on ${miss.join(',')}`); process.exit(2) } }
  console.log(`denominators: ${ids.length} items x ${gr.length} graders = ${ids.length * gr.length} judgements\n`)
  const s1 = { n: 0, pass: 0, pass3: 0, easier: 0, harder: 0, c4holds: 0, diffs: { a: [], b: [] }, by: {}, byBand: {} }
  for (const id of ids) {
    const k = key[id], r = wsItem(gr.map(([t, g]) => [t, g[id]]), k)
    const soft = []
    for (const [t, g] of gr) { if (g[id].free_elimination) soft.push(`${t} free-elim: ${String(g[id].free_elimination).slice(0, 110)}`); if (g[id].dimensions_varied) soft.push(`${t} dims: ${JSON.stringify(g[id].dimensions_varied).slice(0, 110)}`) }
    if (!r.c4) { r.why.push(`dead by both: ${r.deadBoth.join(',')}`); s1.c4holds++ }
    s1.n++; if (r.c3) s1.pass3++; if (r.c3 && r.c4) s1.pass++
    const b = (s1.by[k.stratum] ??= { n: 0, pass: 0 }); b.n++; if (r.c3 && r.c4) b.pass++
    const bb = (s1.byBand[k.target_band] ??= { n: 0, pass: 0, easier: 0 }); bb.n++; if (r.c3 && r.c4) bb.pass++
    for (const [t, g] of gr) {
      if (g[id].band === 'easier') { s1.easier++; bb.easier++ }
      if (g[id].band === 'harder') s1.harder++
      s1.diffs[t].push((bandLo(g[id].band_assigned) - bandLo(k.target_band)) / 10)
    }
    console.log(`${r.c3 && r.c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.stratum} ${k.target_band}] assigned ${gr.map(([t, g]) => `${t}:${g[id].band_assigned}(${g[id].band})`).join(' ')} ${r.why.join(' | ')}${soft.length ? '\n        ~ ' + soft.join('\n        ~ ') : ''}`)
  }
  const B = bars(s1)
  console.log(`\nLANGUAGE USAGE (n=${s1.n})`)
  console.log(`  S1-b pilot-pass (conditions 1-4) ${s1.pass}/24 (bar >= 20) -> ${B.b ? 'PASS' : 'FAIL'}  (batch 3: 18/24)`)
  console.log(`       batch-1-comparable (1-3) ${s1.pass3}/24 (batch 3: 23/24); condition-4 holds ${s1.c4holds} (batch 3: 6 items failed c4, 5 on c4 alone)`)
  console.log(`       by stratum ${JSON.stringify(s1.by)}`)
  console.log(`       by band ${JSON.stringify(s1.byBand)}  (batch 3 survivors: 4/8, 6/8, 8/8)`)
  console.log(`  S1-c calibration: easier ${s1.easier}/48 (bar <= 8), harder ${s1.harder}/48 (bar < 12) -> ${B.c ? 'PASS' : 'FAIL'}  (batch 3: 11 easier, 2 harder)`)
  const cnt = d => ['<', '=', '>'].map(o => d.filter(x => o === '<' ? x < 0 : o === '=' ? x === 0 : x > 0).length).join('/')
  console.log(`  S1-d band: mean band_assigned - target, a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}; below/same/above a ${cnt(s1.diffs.a)}, b ${cnt(s1.diffs.b)}  (batch 3: -0.29 / -0.13)`)
} else if (mode === 'teacher') {
  const t = lab(rd(O + 'teacher.json')), ids = Object.keys(t)
  if (ids.length !== 24) { console.error(`REFUSING: teacher file rates ${ids.length} items, expected 24`); process.exit(2) }
  let n = 0, no = 0; const flagged = []
  for (const id of ids) { const ds = t[id].distractors ?? []; if (ds.length !== 3) { console.error(`REFUSING: ${id} has ${ds.length} distractor ratings, expected 3`); process.exit(2) } for (const d of ds) { n++; if (!/^yes$/i.test(d.would_pick)) { no++; flagged.push(`${id}: "${String(d.option).slice(0, 50)}"`) } } }
  console.log(`teacher ratings: ${n} distractors over ${ids.length} items; rated NO ${no}`)
  for (const f of flagged) console.log(`  NO ${f}`)
} else { console.error('usage: map-pilot-4-score.mjs oo|ws|teacher|--selftest'); process.exit(2) }
