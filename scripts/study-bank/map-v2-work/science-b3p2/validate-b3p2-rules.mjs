#!/usr/bin/env node
/**
 * validate-b3p2-rules.mjs: break-tests the pilot-2 checks (sci-check --rules b3p2) on real items whose answers are known,
 * then on synthetic sets built AT and JUST PAST each band edge. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b3p2/validate-b3p2-rules.mjs
 *
 * Known answers (grader-named, COLD pass):
 *   batch-3 PILOT 1 (scratchpad/map-science-b3/packets/<area>-g<N>/cold.json):
 *     TRENDDIR   L7-02, L8-01 (life-g1 AND life-g2: the key is the only option in the data's direction); E6-02 (earth-g2,
 *                one grader: "the only rising option is 'It rose, then increased.'")
 *     TRENDFORM  Life: both trend keys are the compound "X, then Y" (life-g1 AND life-g2)
 *     BARPOS     Physical: both asked bars are mid-height (phys-g1 AND phys-g2; B17's ban turned into a rule)
 *     BAREXT     the top-tick value is offered and never the key (phys-g1 AND phys-g2); the shortest bar is never offered
 *                (phys-g1)
 *     RANKBAL    Earth: claim key shortest in E5-02 and E8-01 (earth-g1 AND earth-g2); Physical: values key smallest in
 *                P5-01 and P7-01 (phys-g1 AND phys-g2, both "weak")
 *     NAMETPL    Earth: Hesk / Marsk / Tesk (earth-g2)
 *   BATCH 2 (scratchpad/map-science-b2/STAGE1-DECISION.json):
 *     BARPOS + BAREXT  Physical: the asked bar is the tallest, on the top tick (P5-07, P6-14, P7-01; both graders)
 *   Batch 2's other named patterns stay with the b3 checks that are KEPT under b3p2 (TRENDPAR, ROLESTATE, ECHO, INTERP,
 *   CLAIMRAT/CLAIMBAL, NAMEREUSE, ORDER; validate-b3-rules.mjs). What the new checks fire on in batch 2 beyond the named
 *   items is printed, so over-reach is visible.
 * Each known hit is also re-run with that one check DISABLED and must then disappear (the hit is the check's, not a
 * neighbour's). Exit 2 if an input cannot be read or holds the wrong count, 1 if any expectation fails, 0 otherwise.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch } from '../science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
function load(slotsRel, dir, cells, want) {
  const S = JSON.parse(readFileSync(join(HERE, slotsRel), 'utf8')), SLOT = {}
  for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) SLOT[r.id] = { ...r, area: v.area, author: c }
  const items = []
  for (const c of cells) { const f = join(ROOT, dir, c, 'items.json'); if (!existsSync(f)) die(`missing ${f}`); items.push(...JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty)) }
  if (items.length !== want) die(`${dir}: read ${items.length} items, expected ${want}`)
  return { SLOT, items }
}
const b2 = load('../science-b2/slots.json', 'scratchpad/map-science-b2', ['L5', 'L6', 'L7', 'L8', 'P5', 'P6', 'P7', 'P8', 'E5', 'E6', 'E7', 'E8'], 224)
const p1 = load('../science-b3/slots.json', 'scratchpad/map-science-b3', ['L', 'P', 'E'], 24)
console.log(`read ${b2.items.length} batch-2 items and ${p1.items.length} batch-3 pilot-1 items`)

let fail = 0
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
const short = id => id.replace(/^MSB\w+-/, '')
const batchHits = (d, check, needle, disabled = []) => checkBatch(d.items, d.SLOT, { rules: 'b3p2', disabled: new Set(disabled) }).p.filter(p => p.includes(`${check} `) && p.includes(needle))
const itemHits = (d, check, disabled = []) => d.items.filter(i => checkItem(i, d.SLOT[i.id], [], { rules: 'b3p2', disabled: new Set(disabled) }).some(p => p.startsWith(check))).map(i => short(i.id))

console.log('\n== known answers, batch-3 pilot 1')
{
  const got = itemHits(p1, 'TRENDDIR'), want = ['L7-02', 'L8-01', 'E6-02']
  ok(want.every(x => got.includes(x)), `TRENDDIR catches ${want.join(', ')}: fired on ${got.join(', ') || 'none'} of ${p1.items.filter(i => i.format === 'trend').length} trend items`)
  ok(!itemHits(p1, 'TRENDDIR', ['TRENDDIR']).length, 'TRENDDIR disabled -> no hit')
}
for (const [check, needle, label] of [
  ['TRENDFORM', 'Life Science', 'Life compound trend keys'],
  ['BARPOS', 'Physical Science', 'Physical asked bars all middle'],
  ['BAREXT', 'top-tick', 'top-tick value never the key'],
  ['BAREXT', 'shortest bar value is offered in none', 'shortest bar never offered'],
  ['NAMETPL', '-sk', 'Earth -sk names'],
]) {
  const h = batchHits(p1, check, needle)
  ok(h.length > 0, `${check} (${label}): ${h[0] ?? 'NOT CAUGHT'}`)
  ok(!batchHits(p1, check, needle, [check]).length, `${check} disabled -> hit disappears`)
}
console.log('\n== known answers, batch 2')
for (const [check, needle, label] of [['BARPOS', 'Physical Science: the asked bar/point is the tallest', 'Physical asked bar tallest'], ['BAREXT', 'Physical Science: the top-tick', 'Physical top tick always the key']]) {
  const h = batchHits(b2, check, needle)
  ok(h.length > 0, `${check} (${label}): ${h[0] ?? 'NOT CAUGHT'}`)
  ok(!batchHits(b2, check, needle, [check]).length, `${check} disabled -> hit disappears`)
}
{
  const B = checkBatch(b2.items, b2.SLOT, { rules: 'b3p2' })
  const by = c => B.p.filter(p => p.includes(`${c} `))
  console.log(`     batch-2 over-reach (recorded, not expectations): BARPOS ${by('BARPOS').length}, BAREXT ${by('BAREXT').length}, TRENDFORM ${by('TRENDFORM').length}, RANKBAL ${by('RANKBAL').length}, NAMETPL ${by('NAMETPL').length} refusals; TRENDDIR items ${itemHits(b2, 'TRENDDIR').join(', ') || 'none'}`)
  for (const l of [...by('BARPOS'), ...by('BAREXT'), ...by('TRENDFORM')]) console.log(`       ${l.replace('BATCH ', '')}`)
}

/* ---------- synthetic band edges (CLAUDE.md: break-test in the band that matters, not with a blowout) ---------- */
console.log('\n== band edges (synthetic)')
const AR = 'Physical Science'
const bar = (vals, keyIdx, opts) => ({ format: 'values', ask: 'read', graphic: { type: 'bar', bars: vals.map((v, i) => ({ label: `B${i}`, value: v })), xLabel: 'x', yLabel: 'y', caption: 'c' }, choices: opts.map(o => `${o} g`), correct_answer: `${vals[keyIdx]} g` })
const trend = (key, others) => ({ format: 'trend', ask: 'x', choices: [key, ...others], correct_answer: key })
const mk = list => { const SLOT = {}, items = list.map((x, n) => { const id = `MSBZ-P5-${String(n + 1).padStart(2, '0')}`; SLOT[id] = { area: AR, format: x.format }; return { id, ...x } }); return { SLOT, items } }
const fires = (d, check) => checkBatch(d.items, d.SLOT, { rules: 'b3p2' }).p.some(p => p.includes(`${check} `))
// BARPOS n=6: 2/2/2 passes; 3/2/1 passes (cap 3); 4/1/1 fails
const V = [10, 40, 25, 30]   // tallest idx1, shortest idx0, middle idx2
const pos = { t: 1, s: 0, m: 2 }
const set = seq => mk(seq.split('').map(c => bar(V, pos[c], [10, 40, V[pos[c]] === 10 || V[pos[c]] === 40 ? 25 : V[pos[c]], 20])))
ok(!fires(set('ttssmm'), 'BARPOS'), 'BARPOS n=6 tallest/shortest/middle 2/2/2 passes')
ok(!fires(set('tttssm'), 'BARPOS'), 'BARPOS n=6 3/2/1 passes (cap 3)')
ok(fires(set('ttttsm'), 'BARPOS'), 'BARPOS n=6 4/1/1 fires')
// BAREXT: max offered in all 6, key 2 -> 33% passes; key 1 -> 17% passes; key 0 -> fires; key 4 of 6 -> 67% fires
ok(!fires(set('ttssmm'), 'BAREXT'), 'BAREXT max offered 6, key 2 (33%) passes')
ok(!fires(set('tssmmm'), 'BAREXT'), 'BAREXT max offered 6, key 1 (17%) passes')
ok(fires(set('ssmmmm'), 'BAREXT'), 'BAREXT max offered 6, key 0 fires')
ok(fires(set('ttttsm'), 'BAREXT'), 'BAREXT max offered 6, key 4 (67%) fires')
// TRENDFORM: 2 compound + 2 simple options per item
const S1 = 'It rose.', S2 = 'It fell.', C1 = 'It rose, then fell.', C2 = 'It fell, then rose.'
const tset = ks => mk(ks.split('').map(k => (k === 'c' ? trend(C1, [C2, S1, S2]) : trend(S1, [S2, C1, C2]))))
ok(!fires(tset('ccss'), 'TRENDFORM'), 'TRENDFORM 4 items, compound keys 2/8 (25%) passes')
ok(fires(tset('cccs'), 'TRENDFORM'), 'TRENDFORM compound keys 3/8 (38%, inside its band) but simple keys 1/8 (13%) fires on the simple side')
ok(fires(tset('cccc'), 'TRENDFORM'), 'TRENDFORM compound keys 4/8 (50%) fires')
// RANKBAL: claims n=3 with distinct length ranks pass; two shortest fail
const claim = r => { const o = ['aaaaaa bb cc dd ee ff', 'aaaaaa bb cc dd ee ffgg', 'aaaaaa bb cc dd ee ffgghh', 'aaaaaa bb cc dd ee ffgghhii']; return { format: 'claim', choices: o, correct_answer: o[r - 1] } }
ok(!fires(mk([claim(1), claim(2), claim(4)]), 'RANKBAL'), 'RANKBAL claims n=3 ranks 1/2/4 pass')
// RECALIBRATED 2026-10-31 (MAP-SCIENCE-B3-FULL.prereg.md; science-b3full/validate-b3full-rules.mjs): a rank needs 3 keys
// and a binomial tail under 0.01 (or every key of the cell). Pilot 1's named 2-of-3 cells now sit below it by design.
ok(!fires(mk([claim(1), claim(1), claim(4)]), 'RANKBAL'), 'RANKBAL claims n=3 ranks 1/1/4 pass (recalibrated: 2 keys are under the 3-item threshold)')
ok(fires(mk([claim(1), claim(1), claim(1)]), 'RANKBAL'), 'RANKBAL claims n=3 ranks 1/1/1 fire (every key of the cell)')
// NAMETPL: two shared endings pass, three fire
const named = ns => mk(ns.map(n => ({ ...claim(1), names_used: [`Site ${n}`] })))
ok(!fires(named(['Hesk', 'Marsk', 'Orla']), 'NAMETPL'), 'NAMETPL 2 items ending -sk pass')
ok(fires(named(['Hesk', 'Marsk', 'Tesk']), 'NAMETPL'), 'NAMETPL 3 items ending -sk fire')
// TRENDDIR per item
const tdirHit = (k, o) => { const S = { id: 'X', area: AR, g: 5, tier: 'low', dci: 'PS2', kind: 'data', stimulus: 'line', format: 'trend', ask: 'increase', key: 'A', rank: 1, invent: true }; return checkItem({ id: 'X', choices: [k, ...o], correct_answer: k }, S, [], { rules: 'b3p2' }).some(p => p.startsWith('TRENDDIR')) }
ok(tdirHit('It rose.', ['It fell.', 'It stayed the same.', 'It fell, then leveled off.']), 'TRENDDIR fires: key the only rising option')
ok(!tdirHit('It rose.', ['It fell.', 'It fell, then rose.', 'It rose, then leveled off.']), 'TRENDDIR passes: two distractors also rise')
ok(tdirHit('It rose.', ['It dropped, then declined.', 'It rose, then fell.', 'It stayed the same.']), 'TRENDDIR fires: a compound naming one direction twice')

console.log(fail ? `\nVALIDATION FAILED: ${fail}` : '\nVALIDATION OK: every pilot-2 check catches its named pilot-1 pattern (and BARPOS/BAREXT batch 2\'s), disappears when disabled, and sits where intended at its band edges')
process.exit(fail ? 1 : 0)
