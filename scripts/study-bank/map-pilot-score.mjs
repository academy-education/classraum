#!/usr/bin/env node
/**
 * map-pilot-score.mjs oo        score the options-only screen per arm
 * map-pilot-score.mjs ws        score the with-source graders
 *
 * Arms come from the localId prefix: MAPP-RLU, MAPP-MECH, else live control.
 * Every arm's control is its OWN best-fixed-letter rate, derived from the key
 * file. Denominators print before rates. The script refuses (exit 2) if a
 * solver file is missing ids.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank/'
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) } return JSON.parse(readFileSync(p, 'utf8')) }
const arm = id => id.startsWith('MAPP-RLU') ? 'rlu' : id.startsWith('MAPP-MECH') ? 'mech' : 'control'
const mode = process.argv[2]

if (mode === 'oo') {
  const key = rd(D + 'map-pilot-oo.key.json')
  const ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(s => D + `map-pilot-oo.solver-${s}.json`).filter(existsSync).map(p => [p, rd(p)])
  if (sol.length < 3) console.log(`NOTE: ${sol.length} of 3 samples present`)
  for (const [p, s] of sol) { const miss = ids.filter(i => !s[i]?.pick); if (miss.length) { console.error(`REFUSING: ${p} missing ${miss.length} picks`); process.exit(2) } }
  const out = {}
  for (const id of ids) {
    const a = arm(key[id].localId); const o = (out[a] ??= { n: 0, hits: 0, picks: 0, unanS: 0, unanK: 0, deal: {}, items: [] })
    o.n++; o.deal[key[id].letter] = (o.deal[key[id].letter] ?? 0) + 1
    const picks = sol.map(([, s]) => s[id].pick)
    const h = picks.filter(x => x === key[id].letter).length
    o.hits += h; o.picks += picks.length
    if (new Set(picks).size === 1) { o.unanS++; if (h === picks.length) o.unanK++ }
    o.items.push(`${key[id].localId}:${h}/${picks.length}`)
  }
  for (const a of ['rlu', 'mech', 'control']) {
    const o = out[a]; if (!o) continue
    const ctl = 100 * Math.max(...Object.values(o.deal)) / o.n
    const mean = 100 * o.hits / o.picks
    console.log(`${a.padEnd(8)} n=${o.n} items x ${sol.length} samples = ${o.picks} picks | mean ${mean.toFixed(1)}% vs own best-fixed-letter ${ctl.toFixed(1)}% (margin ${(mean - ctl).toFixed(1)}) | unanimous on some letter ${o.unanS}/${o.n}, unanimous on key ${o.unanK}/${o.n}`)
    for (const [p, s] of sol) { let k = 0; for (const id of ids) if (arm(key[id].localId) === a && s[id].pick === key[id].letter) k++; console.log(`         ${p.split('.').at(-2)}: ${k}/${o.n}`) }
    if (a !== 'control') console.log(`         per item ${o.items.join(' ')}`)
  }
} else if (mode === 'ws') {
  const key = rd(D + 'map-pilot.ws.key.json')
  const ids = Object.keys(key)
  const gr = ['a', 'b'].map(s => D + `map-pilot.ws.grader-${s}.json`).filter(existsSync).map(p => [p, rd(p)])
  if (!gr.length) { console.error('REFUSING: no grader files'); process.exit(2) }
  for (const [p, g] of gr) { const miss = ids.filter(i => !g[i]?.pick); if (miss.length) { console.error(`REFUSING: ${p} missing ${miss.length}`); process.exit(2) } }
  let pass = 0; const bands = {}, fits = {}
  for (const id of ids) {
    const k = key[id]; const why = []
    for (const [p, g] of gr) {
      const v = g[id], tag = p.split('.').at(-2)
      if (v.pick !== k.letter) why.push(`${tag} picked ${v.pick}≠${k.letter}`)
      if (v.second_defensible) why.push(`${tag} 2nd defensible ${v.second_defensible}`)
      if (v.grade_fit && v.grade_fit !== 'fits') why.push(`${tag} grade_fit ${v.grade_fit}`)
      bands[`${tag}:${v.band}`] = (bands[`${tag}:${v.band}`] ?? 0) + 1
      fits[`${tag}:${v.grade_fit}`] = (fits[`${tag}:${v.grade_fit}`] ?? 0) + 1
      if (v.free_elimination) why.push(`${tag} free-elim: ${String(v.free_elimination).slice(0, 90)}`)
    }
    const hard = why.filter(w => !w.includes('free-elim'))
    if (!hard.length) pass++
    console.log(`${hard.length ? 'HOLD' : 'PASS'} ${id.padStart(2)} ${k.localId} ${why.join(' | ')}`)
  }
  console.log(`\npilot-pass ${pass}/${ids.length} (bar: >= 20) | graders ${gr.length}`)
  console.log('band', JSON.stringify(bands)); console.log('grade_fit', JSON.stringify(fits))
} else { console.error('usage: map-pilot-score.mjs oo|ws'); process.exit(2) }
