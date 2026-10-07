#!/usr/bin/env node
/**
 * map-adapt6-score.mjs screen      stage S: source screen -> map-adapt6/sources.json (first 12 unflagged)
 * map-adapt6-score.mjs oo          stage 1: bars A and P (3 split files a side)
 * map-adapt6-score.mjs ws          stage 2: bars C, S1-b, S1-c, S1-d, G
 * map-adapt6-score.mjs nat         stage 3: bar E
 * map-adapt6-score.mjs --selftest  break-test every bar at its margin
 *
 * MAP-ADAPT6-PILOT-2026-10-07.prereg.md. Pilot 5's bar functions (barA, barP)
 * and batch 3's wsItem and map-wv's scoreNat are imported unchanged; only the
 * counts are scaled from 24 to 12. Denominators print first; refuses (exit 2)
 * on a missing file, a missing pick or a short population.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { barA, barP } from './map-adapt-score.mjs'
import { wsItem } from './map-pilot-3-score.mjs'
import { scoreNat } from './map-wv.mjs'

const _a = process.argv.slice(2), _d = _a.indexOf('--dir')
const O = 'scripts/study-bank/' + (_d >= 0 ? _a[_d + 1] : 'map-adapt6/')   // pilot 7: --dir map-adapt7/
const N = 12
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }

export const screenFlag = hits => hits === 3                 // unanimous on the key, 3 of 3 samples
export const screenTake = (cand, flagged) => { const ok = cand.filter(c => !flagged.has(c.source_id)); return ok.length < 10 ? null : ok.slice(0, N) }
export function wsBars6(s) {
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(s.diffs.a), mb = mean(s.diffs.b)
  return { C: s.excl >= 10, b: s.pass >= 10, c: s.easier <= 4 && s.harder < 6, d: Math.abs(ma) <= 0.5 && Math.abs(mb) <= 0.5, G: s.deadBoth <= 2, ma, mb }
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  expect(screenFlag(3) && !screenFlag(2), 'screen: 3/3 on key flags, 2/3 does not')
  const cand = Array.from({ length: 18 }, (_, i) => ({ source_id: `s${i}` }))
  expect(screenTake(cand, new Set(['s0', 's1'])).map(c => c.source_id)[0] === 's2' && screenTake(cand, new Set()).length === 12, 'screen: first 12 unflagged in rank order')
  expect(screenTake(cand, new Set(cand.slice(0, 9).map(c => c.source_id))) === null, 'screen: 9 unflagged (< 10) stops the pilot')
  expect(barA(50, 3, 12, 25) === 'PASS' && barA(50, 4, 12, 25) === 'FAIL' && barA(50.1, 0, 12, 25) === 'FAIL', 'A (imported): 50% / unanimous 3 of 12 is the margin')
  expect(barP(45, 25, 30, 25, 40, 40).verdict === 'FAIL' && barP(35, 25, 25, 25, 40, 40).verdict === 'PASS', 'P (imported): delta +15 fails, +10 passes')
  const z = (n, v) => Array(n).fill(v)
  const s0 = { excl: 10, pass: 10, easier: 4, harder: 5, deadBoth: 2, diffs: { a: z(12, 0), b: z(12, 0) } }
  const B = wsBars6(s0); expect(B.C && B.b && B.c && B.d && B.G, 'ws: every bar passes exactly at its margin')
  expect(!wsBars6({ ...s0, excl: 9 }).C, 'C: 9/12 fails')
  expect(!wsBars6({ ...s0, pass: 9 }).b, 'S1-b: 9/12 fails')
  expect(!wsBars6({ ...s0, easier: 5 }).c && !wsBars6({ ...s0, harder: 6 }).c, 'S1-c: easier 5 or harder 6 (of 24) fails')
  expect(!wsBars6({ ...s0, diffs: { a: [...z(7, -1), ...z(5, 0)], b: z(12, 0) } }).d, 'S1-d: mean -0.58 fails')
  expect(!wsBars6({ ...s0, deadBoth: 3 }).G, 'G: dead-by-both on 3 of 12 fails')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every bar can fail at its margin')
  process.exit(fail ? 1 : 0)
}

function readFile3(name) {
  const key = rd(O + `${name}.key.json`), ids = Object.keys(key)
  const S = ['a', 'b', 'c'].map(s => O + `${name}.solver-${s}.json`).map(p => [p, lab(rd(p))])
  for (const [p, s] of S) { const miss = ids.filter(i => !/^[A-D]$/.test(s[i]?.pick ?? '')); if (miss.length) die(`${p} missing picks on ${miss.length} ids`) }
  return ids.map(id => { const k = key[id], picks = S.map(([, s]) => s[id].pick); return { ...k, picks, h: picks.filter(x => x === k.letter).length } })
}
const rate = rs => 100 * rs.reduce((a, r) => a + r.h, 0) / (3 * rs.length)

const mode = process.argv[2]
if (import.meta.url !== `file://${process.argv[1]}`) { /* imported */ }
else if (mode === '--selftest') selftest()
else if (mode === 'screen') {
  const cand = rd(O + 'candidates.json'), rows = readFile3('screen')
  const c = rows.filter(r => r.arm === 'candidate'), R = rows.filter(r => r.arm === 'controlR')
  if (c.length !== 18 || R.length !== 8) die(`screen holds ${c.length} candidates / ${R.length} control R`)
  const cR = rate(R)
  console.log(`denominators: 18 candidates x 3 samples, control R 8 x 3; control R ${cR.toFixed(1)}% (valid 10-45)`)
  if (cR < 10 || cR > 45) { console.log('SCREEN INVALID: re-run once with fresh samples'); process.exit(1) }
  const flagged = new Set(c.filter(r => screenFlag(r.h)).map(r => r.localId))
  for (const k of cand) { const r = c.find(x => x.localId === k.source_id); console.log(`${String(k.rank).padStart(2)} ${k.source_id.slice(0, 8)} ${r.h}/3${flagged.has(k.source_id) ? '  FLAGGED (unanimous on key) -> excluded' : ''}`) }
  const take = screenTake(cand, flagged)
  if (!take) { console.log(`STAGE S FAILS: ${18 - flagged.size} unflagged (< 10)`); process.exit(1) }
  const out = take.map((k, i) => ({ adapt_id: `MAPA6-${String(i + 1).padStart(2, '0')}`, source_id: k.source_id, family: k.family, section: k.section, cohort: k.cohort, subskill: k.subskill, difficulty: k.difficulty, human_sat: k.human_sat, set: null, passage_group_id: null, standalone: 'coe', map_area: 'Informational Text', map_strand: 'Analyze Central Idea, Concepts, and Events; Summarize', grade_target: i % 2 ? 8 : 7, target_band: i % 2 ? 'RIT 210-219' : 'RIT 200-209', screen_hits: c.find(x => x.localId === k.source_id).h, item: k.item }))
  writeFileSync(O + 'sources.json', JSON.stringify(out, null, 1) + '\n')
  console.log(`candidate mean ${rate(c).toFixed(1)}%; flagged ${flagged.size}; STAGE S PASSES: wrote ${out.length} sources (human-sat ${out.filter(x => x.human_sat).length})`)
} else if (mode === 'oo') {
  const side = s => [1, 2, 3].flatMap(f => readFile3(`oo-${s}-f${f}`))
  const ad = side('adapted'), sr = side('source'), batch = rd(O + 'batch.json')
  const aC = ad.filter(r => r.arm === 'comprehension'), sC = sr.filter(r => r.arm === 'comprehension')
  const ctl = (rs, a) => rs.filter(r => r.arm === a)
  console.log(`denominators: adapted ${aC.length} items x 3, source ${sC.length} items x 3 (3 split files a side, own samples); controls pooled over 3 files (9 samples per control item); frozen ${batch.length} of ${N}`)
  for (const [nm, rs] of [['ADAPTED', ad], ['SOURCE', sr]]) console.log(`  ${nm}: candidates ${rate(rs.filter(r => r.arm === 'comprehension')).toFixed(1)}% | control R ${rate(ctl(rs, 'controlR')).toFixed(1)}% | control V ${rate(ctl(rs, 'controlV')).toFixed(1)}%\n     per item ${rs.filter(r => r.arm === 'comprehension').map(r => `${String(r.localId).replace(/^src:/, '').slice(0, 8)}:${r.h}/3`).join(' ')}`)
  const unanK = aC.filter(r => r.h === 3).length, cR = rate(ctl(ad, 'controlR'))
  const A = barA(rate(aC), unanK, aC.length, cR)
  console.log(`\nBAR A  (n=${aC.length}): ${rate(aC).toFixed(1)}% (bar <= 50), unanimous on key ${unanK}/${aC.length} (bar <= ${Math.floor(0.3 * aC.length)}); control R ${cR.toFixed(1)}% (valid 10-45) -> ${A}`)
  const pairs = aC.map(r => [r, sC.find(s => s.pair === r.pair)]); if (pairs.some(([, s]) => !s)) die('a pair is missing its source')
  const P = barP(rate(aC), 25, rate(sC), 25, rate([...ctl(ad, 'controlR'), ...ctl(ad, 'controlV')]), rate([...ctl(sr, 'controlR'), ...ctl(sr, 'controlV')]))
  console.log(`BAR P  (n=${pairs.length} pairs x 3 a side): adapted margin ${P.adM.toFixed(1)}, source margin ${P.srcM.toFixed(1)}, delta ${P.delta >= 0 ? '+' : ''}${P.delta.toFixed(1)} (bar <= +10) -> ${P.verdict}`)
  console.log(`BAR V  not applicable (no vocabulary items)\n\nSTAGE 1 ${A === 'PASS' && P.verdict === 'PASS' ? 'PASSES' : 'DOES NOT PASS'}`)
} else if (mode === 'oo-report') {
  // pilot 7: options-only is REPORT-ONLY for CoE (model/human disagreement, pilot 6). No verdict.
  const ad = [1, 2, 3].flatMap(f => readFile3(`oo-adapted-f${f}`)), batch = rd(O + 'batch.json')
  const c = ad.filter(r => r.arm === 'comprehension'), R = ad.filter(r => r.arm === 'controlR'), V = ad.filter(r => r.arm === 'controlV')
  const un = rs => rs.filter(r => new Set(r.picks).size === 1).length, unK = rs => rs.filter(r => r.h === 3).length
  console.log(`denominators: ${c.length} adapted items x 3 (3 split files, own samples; frozen ${batch.length} of ${N}); control R ${R.length / 3} x 9, control V ${V.length / 3} x 9`)
  console.log(`  adapted ${rate(c).toFixed(1)}% | unanimous on some letter ${un(c)}/${c.length} (${(100 * un(c) / c.length).toFixed(1)}%), on key ${unK(c)}/${c.length}`)
  console.log(`  control R ${rate(R).toFixed(1)}% | unanimous ${un(R)}/${R.length} (${(100 * un(R) / R.length).toFixed(1)}%)   control V ${rate(V).toFixed(1)}% | unanimous ${un(V)}/${V.length} (${(100 * un(V) / V.length).toFixed(1)}%)`)
  console.log(`  per item ${c.map(r => `${r.localId}:${r.h}/3`).join(' ')}`)
  console.log('REPORT-ONLY: gates nothing (MAP-ADAPT7 prereg)')
} else if (mode === 'ws') {
  const key = rd(O + 'ws.key.json'), ids = Object.keys(key)
  const gr = ['a', 'b'].map(t => [t, lab(rd(O + `ws.grader-${t}.json`))])
  for (const [t, g] of gr) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !['plausible', 'easier', 'harder'].includes(g[i]?.band)); if (miss.length) die(`grader ${t} missing fields on ${miss.join(',')}`) }
  if (ids.length < 11) die(`${ids.length} items; stage 0 requires >= 11`)
  console.log(`denominators: ${ids.length} rendered x 2 graders; C, S1-b, G count out of ${N} (${N - ids.length} drop(s) count as failures)\n`)
  const s = { excl: 0, pass: 0, easier: 0, harder: 0, deadBoth: N - ids.length, diffs: { a: [], b: [] } }
  for (const id of ids) {
    const k = key[id], r = wsItem(gr.map(([t, g]) => [t, g[id]]), k)
    if (r.excl) s.excl++; if (r.c3 && r.c4) s.pass++; if (!r.c4) { s.deadBoth++; r.why.push(`dead by both: ${r.deadBoth.join(',')}`) }
    for (const [t, g] of gr) { if (g[id].band === 'easier') s.easier++; if (g[id].band === 'harder') s.harder++; s.diffs[t].push((bandLo(g[id].band_assigned) - bandLo(k.target_band)) / 10) }
    console.log(`${r.c3 && r.c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.target_band}] assigned ${gr.map(([t, g]) => `${t}:${g[id].band_assigned}(${g[id].band})`).join(' ')} ${r.why.join(' | ')}`)
  }
  const B = wsBars6(s)
  console.log(`\nBAR C    exclusivity ${s.excl}/${N} (bar >= 10) -> ${B.C ? 'PASS' : 'FAIL'}`)
  console.log(`BAR S1-b pilot-pass ${s.pass}/${N} (bar >= 10) -> ${B.b ? 'PASS' : 'FAIL'}`)
  console.log(`BAR S1-c easier ${s.easier}/${2 * ids.length} (bar <= 4), harder ${s.harder}/${2 * ids.length} (bar < 6) -> ${B.c ? 'PASS' : 'FAIL'}`)
  console.log(`BAR S1-d band offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
  console.log(`BAR G    option dead by both on ${s.deadBoth}/${N} items (bar <= 2; drops count) -> ${B.G ? 'PASS' : 'FAIL'}`)
  console.log(`\nSTAGE 2 ${B.C && B.b && B.c && B.d && B.G ? 'PASSES' : 'DOES NOT PASS'}`)
} else if (mode === 'nat') {
  const r = scoreNat(rd(O + 'naturalness.key.json'), ['nat-1.json', 'nat-2.json'].map(f => lab(rd(O + f))))
  if (r.error) die(r.error)
  r.log.forEach(x => console.log(`  judge: ${x}`)); if (r.per) console.log(`  pooled medians: candidate ${r.cm} (n=${r.cr.length}), control ${r.lm} (n=${r.lr.length})`)
  console.log(`BAR E: ${r.verdict}\n\nSTAGE 3 ${r.verdict === 'PASS' ? 'PASSES' : 'DOES NOT PASS'}`)
} else die('usage: map-adapt6-score.mjs screen|oo|ws|nat|--selftest')
