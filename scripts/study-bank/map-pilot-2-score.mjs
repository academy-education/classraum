#!/usr/bin/env node
/**
 * map-pilot-2-score.mjs oo    options-only screen, per arm/stratum
 * map-pilot-2-score.mjs ws    with-source graders, prereg conditions 1-4
 *
 * Bars: MAP-PILOT-2-2026-10-02.prereg.md. Each arm's control is its OWN
 * realised best-fixed-letter rate from the key file. Denominators print first.
 * Refuses (exit 2) on a missing file or missing picks.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank/'
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) } return JSON.parse(readFileSync(p, 'utf8')) }
const mode = process.argv[2]
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }

if (mode === 'oo') {
  const key = rd(D + 'map-pilot-2-oo.key.json'), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(s => D + `map-pilot-2-oo.solver-${s}.json`).filter(existsSync).map(p => [p, rd(p)])
  if (sol.length < 3) console.log(`NOTE: ${sol.length} of 3 samples present`)
  if (!sol.length) process.exit(2)
  for (const [p, s] of sol) { const miss = ids.filter(i => !/^[A-D]$/.test(s[i]?.pick ?? '')); if (miss.length) { console.error(`REFUSING: ${p} missing ${miss.length} picks`); process.exit(2) } }
  const out = {}
  for (const id of ids) {
    const k = key[id], o = (out[k.arm] ??= { n: 0, hits: 0, picks: 0, unanS: 0, unanK: 0, deal: {}, items: [] })
    o.n++; o.deal[k.letter] = (o.deal[k.letter] ?? 0) + 1
    const picks = sol.map(([, s]) => s[id].pick), h = picks.filter(x => x === k.letter).length
    o.hits += h; o.picks += picks.length
    if (new Set(picks).size === 1) { o.unanS++; if (h === picks.length) o.unanK++ }
    o.items.push(`${k.localId.replace('MAPP2-', '')}:${h}/${picks.length}`)
  }
  for (const a of ['comprehension', 'vocab', 'usage', 'mechanics', 'controlR', 'controlV']) {
    const o = out[a]; if (!o) { console.log(`${a}: ABSENT`); continue }
    const ctl = 100 * Math.max(...Object.values(o.deal)) / o.n, mean = 100 * o.hits / o.picks
    console.log(`${a.padEnd(13)} n=${String(o.n).padStart(2)} x ${sol.length} = ${o.picks} picks | mean ${mean.toFixed(1)}% vs own best-fixed-letter ${ctl.toFixed(1)}% (margin ${(mean - ctl).toFixed(1)}) | unanimous on some letter ${o.unanS}/${o.n}, on key ${o.unanK}/${o.n}`)
    if (!a.startsWith('control')) console.log(`              per item ${o.items.join(' ')}`)
  }
  const c = out.comprehension
  if (c) {
    const m = 100 * c.hits / c.picks
    const v = m <= 50 && c.unanK <= 2 ? 'FIXED' : m >= 75 || c.unanK >= 4 ? 'NOT FIXED' : 'INCONCLUSIVE'
    console.log(`\ncomprehension prereg call: ${v} (mean ${m.toFixed(1)}%, unanimous on key ${c.unanK}/6; batch 1: 100.0%, 5/5)`)
    const r = out.controlR; if (r) { const rm = 100 * r.hits / r.picks; console.log(`control R ${rm.toFixed(1)}%${rm >= 75 ? ' -> CEILING CLAUSE: instrument saturates on this item type; no leak verdict from the relative comparison' : ''}`) }
  }
} else if (mode === 'ws') {
  const key = rd(D + 'map-pilot-2.ws.key.json'), ids = Object.keys(key)
  const gr = ['a', 'b'].map(s => D + `map-pilot-2.ws.grader-${s}.json`).filter(existsSync).map(p => [p.split('.').at(-2), rd(p)])
  if (gr.length < 2) { console.error(`REFUSING: ${gr.length} of 2 grader files`); process.exit(2) }
  for (const [t, g] of gr) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null); if (miss.length) { console.error(`REFUSING: ${t} missing pick/band_assigned on ${miss.join(',')}`); process.exit(2) } }
  let pass = 0, pass3 = 0
  const easier = {}, harder = {}, diffs = {}, fe = { both: 0, any: 0 }, byStr = {}
  for (const id of ids) {
    const k = key[id], why = [], soft = []
    const target = bandLo(k.target_band)
    for (const [t, g] of gr) {
      const v = g[id]
      if (v.pick !== k.letter) why.push(`${t} picked ${v.pick}!=${k.letter}`)
      if (v.second_defensible) why.push(`${t} 2nd ${v.second_defensible}`)
      if (v.grade_fit && v.grade_fit !== 'fits') why.push(`${t} ${v.grade_fit}`)
      const d = (bandLo(v.band_assigned) - target) / 10
      ;(diffs[t] ??= []).push(d)
      if (v.band === 'easier') easier[t] = (easier[t] ?? 0) + 1
      if (v.band === 'harder') harder[t] = (harder[t] ?? 0) + 1
      if (v.free_elimination) soft.push(`${t} free-elim: ${String(v.free_elimination).slice(0, 80)}`)
      if (v.dimensions_varied) soft.push(`${t} dims: ${String(v.dimensions_varied).slice(0, 60)}`)
    }
    const dd = gr.map(([, g]) => new Set([].concat(g[id].dead_distractors ?? []).map(String).filter(x => /^[A-D]$/.test(x))))
    const deadBoth = [...dd[0]].filter(x => dd[1].has(x))
    const c3 = why.length === 0
    const c4 = deadBoth.length === 0
    if (c3) pass3++
    if (c3 && c4) pass++
    if (!c4) why.push(`dead distractor named by both: ${deadBoth.join(',')}`)
    const feBoth = gr.every(([, g]) => g[id].free_elimination)
    if (k.stratum === 'comprehension') { if (feBoth) fe.both++; if (gr.some(([, g]) => g[id].free_elimination)) fe.any++ }
    const s = (byStr[k.stratum] ??= { n: 0, pass: 0 }); s.n++; if (c3 && c4) s.pass++
    console.log(`${c3 && c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.stratum} ${k.target_band}] assigned ${gr.map(([t, g]) => `${t}:${g[id].band_assigned}`).join(' ')} ${why.join(' | ')}${soft.length ? '\n        ~ ' + soft.join('\n        ~ ') : ''}`)
  }
  console.log(`\npilot-pass (conditions 1-4) ${pass}/${ids.length} (bar >= 20) | batch-1-comparable (conditions 1-3) ${pass3}/${ids.length} (batch 1: 18/24)`)
  console.log('by stratum', JSON.stringify(byStr))
  const tot = (o) => Object.values(o).reduce((a, b) => a + b, 0)
  console.log(`band word: easier ${JSON.stringify(easier)} = ${tot(easier)}/48, harder ${JSON.stringify(harder)} = ${tot(harder)}/48 (batch 1: 17 easier, 0 harder; IMPROVED if easier <= 8, OVERSHOT if harder >= 12)`)
  for (const [t, d] of Object.entries(diffs)) {
    const lo = d.filter(x => x < 0).length, hi = d.filter(x => x > 0).length, eq = d.filter(x => x === 0).length
    console.log(`band_assigned vs target, ${t}: below ${lo}, same ${eq}, above ${hi}; mean ${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2)} bands`)
  }
  console.log(`comprehension free elimination named by both graders: ${fe.both}/6, by either: ${fe.any}/6 (batch 1: both on 5/5; IMPROVED if both <= 2)`)
  const offBand = gr.map(([t]) => (easier[t] ?? 0) + (harder[t] ?? 0))
  console.log(`band targeting unsupported? ${offBand.every(x => x >= 12) ? 'YES' : 'no'} (off-band calls ${offBand.join(', ')} of 24 each; bar both >= 12)`)
} else { console.error('usage: map-pilot-2-score.mjs oo|ws'); process.exit(2) }
