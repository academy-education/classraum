#!/usr/bin/env node
/**
 * score-oo-by-shape.mjs <tag> — the options-only score with the CONTROL split by
 * option SHAPE, because a subskill-matched WIC control still mixes two renders.
 *
 * Live Words in Context holds single-word items and GLOSS items whose four
 * options are dictionary senses of one headword ("bias the impression of",
 * "sparing use of means"). The gloss family measured +42.9 blind on its own,
 * and two blind solvers on wic7 named it as their strongest mechanism while
 * declaring most single-word sets guesses. Scoring a single-word candidate
 * against a control that contains gloss items inflates the control and
 * flatters the candidate. So the control is reported three ways: all, gloss
 * only, WORD only — and the word-only line is the matched comparison.
 *
 * Shape is read off the options, not off a cohort name: a set is GLOSS when at
 * least three of its four options are multi-word AND their mean length exceeds
 * 12 characters. Candidate phrases like "a matter of course" (one or two per
 * set) stay WORD. The rule is printed with the counts so it can be disputed.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const tag = process.argv[2]
if (!tag) { console.error('usage: score-oo-by-shape.mjs <tag>'); process.exit(2) }
const key = JSON.parse(readFileSync(`${D}/${tag}-oo.key.json`, 'utf8'))
const blind = JSON.parse(readFileSync(`${D}/${tag}-oo.blind.json`, 'utf8'))
const files = ['a','b','c'].map(n => `${D}/${tag}-oo.solver-${n}.json`).filter(existsSync)
if (files.length < 3) { console.error(`REFUSING: ${files.length} of 3 solver files present. A partial run is not a run.`); process.exit(2) }
const sv = files.map(f => JSON.parse(readFileSync(f, 'utf8')))
const shapeOf = opts => { const vs = Object.values(opts).map(String); const multi = vs.filter(v => v.trim().includes(' ')).length
  const mean = vs.reduce((a, v) => a + v.length, 0) / vs.length; return (multi >= 3 && mean > 12) ? 'gloss' : 'word' }
const strata = {}
const add = (name, id) => { const s = strata[name] ??= { n: 0, k: 0, items: new Set() }
  s.items.add(id); for (const g of sv) { const p = g[id]?.pick; if (!p) continue; s.n++; if (String(p).trim().toUpperCase() === key[id].letter) s.k++ } }
for (const [id, k] of Object.entries(key)) {
  const arm = k.kind ?? 'candidate', shape = shapeOf(blind[id].options)
  add(`${arm}`, id); add(`${arm} / ${shape}`, id)
}
const line = (name) => { const s = strata[name]; if (!s) return; console.log(`  ${name.padEnd(26)} items ${String(s.items.size).padStart(3)}   picks ${String(s.n).padStart(3)}   ${String(s.k).padStart(3)}/${s.n} = ${(100*s.k/s.n).toFixed(1)}%`) }
console.log(`${tag}: ${Object.keys(key).length} items, ${sv.length} solvers  (gloss = >=3 of 4 options multi-word AND mean length > 12 chars)`)
for (const name of Object.keys(strata).sort()) line(name)
const c = strata['candidate'], cw = strata['live-control / word'], cg = strata['live-control / gloss'], ca = strata['live-control']
if (c && cw) console.log(`\n  CANDIDATE minus WORD-SHAPED CONTROL: ${(100*c.k/c.n - 100*cw.k/cw.n).toFixed(1)}pts   <- the matched comparison`)
if (c && ca) console.log(`  CANDIDATE minus ALL controls:        ${(100*c.k/c.n - 100*ca.k/ca.n).toFixed(1)}pts   (inflated by gloss items if any)`)
if (cg) console.log(`  gloss controls alone: ${(100*cg.k/cg.n).toFixed(1)}% on ${cg.items.size} items — the family measured +42.9 on its own; not a matched control for single-word candidates`)
if (cw && cw.items.size < 8) console.log(`  NOTE: only ${cw.items.size} word-shaped controls; a rate over that few cannot resolve a small margin.`)
