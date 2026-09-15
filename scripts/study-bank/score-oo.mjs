#!/usr/bin/env node
/**
 * score-oo.mjs <tag>-oo.key.json <solver.json...>
 *
 * Scores an OPTIONS-ONLY attack and stratifies by the solver's own
 * confidence label. Generic on purpose: nothing in here is specific to a
 * batch, because a per-batch judgement does not survive a copy.
 *
 * WHAT THE STRATIFICATION IS FOR. A pooled rate hides the thing that
 * matters. The register holds two results that look contradictory and are
 * not: on act-english-v4r solvers undershot their own score by 31 points
 * and their "guess" labels meant nothing, while on act-math-v10-mix the
 * mechanism stratum carried the whole signal. The settled rule is that a
 * solver's SELF-REPORT is not evidence in either direction and only the
 * STRATIFIED SCORE is -- so this prints both strata and their difference,
 * and never clears a batch on solvers saying they guessed.
 *
 * DISCIPLINE (CLAUDE.md):
 *  - control DERIVED from the key file's own letter distribution (the best
 *    fixed letter), never a literal 25
 *  - every denominator printed before any rate
 *  - refuses (exit 2) rather than returning a number on unreadable input,
 *    on a solver whose ids do not match the key file, or on a solver who
 *    skipped items in a forced-choice run
 *  - reads several spellings of the pick/confidence fields, and names a
 *    field-name mismatch as the real cause instead of reporting a skip
 */
import { readFileSync } from 'node:fs'

const [keyPath, ...solverPaths] = process.argv.slice(2)
if (!keyPath || !solverPaths.length) { console.error('usage: score-oo.mjs <tag>-oo.key.json <solver.json...>'); process.exit(2) }
const rd = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) {
  console.error(`REFUSING: cannot read ${p}: ${e.message}`); process.exit(2) } }

const key = rd(keyPath)
const ids = Object.keys(key)
if (!ids.length) { console.error(`REFUSING: ${keyPath} holds zero items`); process.exit(2) }
for (const id of ids) if (!key[id] || !key[id].letter) { console.error(`REFUSING: ${keyPath} entry ${id} has no letter`); process.exit(2) }

const dist = {}
for (const id of ids) dist[key[id].letter] = (dist[key[id].letter] ?? 0) + 1
const control = Math.max(...Object.values(dist)) / ids.length

const PICK = ['pick', 'answer', 'choice', 'letter']
const CONF = ['confidence', 'conf', 'basis']
const solvers = {}
for (const p of solverPaths) {
  const raw = rd(p)
  const map = (raw && raw.items && typeof raw.items === 'object' && !Array.isArray(raw.items)) ? raw.items : raw
  if (!map || typeof map !== 'object' || Array.isArray(map)) { console.error(`REFUSING: ${p} is not an id-keyed object`); process.exit(2) }
  const name = p.split('/').pop()
  const pf = PICK.find(f => Object.values(map).some(v => v && v[f]))
  if (!pf) { console.error(`REFUSING: ${name} has none of ${PICK.join('/')} on any row — the field name is wrong, the solver did not skip`); process.exit(2) }
  const cf = CONF.find(f => Object.values(map).some(v => v && v[f]))
  const matched = ids.filter(i => map[i] && map[i][pf]).length
  if (!matched) { console.error(`REFUSING: ${name} answered none of ${keyPath.split('/').pop()}'s ids — wrong file or wrong id space`); process.exit(2) }
  solvers[name] = { map, pf, cf, matched }
}

console.log(`key ${keyPath.split('/').pop()}: ${ids.length} items`)
console.log(`  key letters ${Object.entries(dist).sort().map(([l, n]) => l + ':' + n).join(' ')}  -> best-fixed-letter CONTROL ${(100 * control).toFixed(1)}%`)
for (const [n, s] of Object.entries(solvers)) {
  console.log(`  ${n.padEnd(20)} pick '${s.pf}'  confidence ${s.cf ? `'${s.cf}'` : 'ABSENT (no stratification possible)'}  answered ${s.matched} of ${ids.length}`)
  if (s.matched < ids.length) console.log(`    ** forced-choice run: ${ids.length - s.matched} item(s) unanswered; they are counted as WRONG, not dropped`)
}

let hit = 0, n = 0
const strat = { mechanism: { h: 0, n: 0 }, guess: { h: 0, n: 0 }, unlabelled: { h: 0, n: 0 } }
const perItem = {}
for (const id of ids) {
  perItem[id] = { hits: 0, n: 0 }
  for (const s of Object.values(solvers)) {
    const row = s.map[id]
    n++
    const pick = row && row[s.pf] ? String(row[s.pf]).trim().toUpperCase()[0] : null
    const ok = pick === key[id].letter
    if (ok) { hit++; perItem[id].hits++ }
    perItem[id].n++
    const c = row && s.cf && row[s.cf] ? String(row[s.cf]).toLowerCase() : ''
    const bucket = c.startsWith('mech') ? 'mechanism' : (c.startsWith('guess') ? 'guess' : 'unlabelled')
    strat[bucket].n++; if (ok) strat[bucket].h++
  }
}
const pct = (h, d) => d ? (100 * h / d).toFixed(1) + '%' : 'NOT MEASURED'
console.log(`\n  POOLED ${hit} of ${n} picks = ${pct(hit, n)}   against control ${(100 * control).toFixed(1)}%   margin ${(100 * hit / n - 100 * control).toFixed(1)}pts`)
for (const [k, v] of Object.entries(strat)) {
  if (!v.n) { console.log(`  ${k.padEnd(11)} NOT MEASURED (0 picks)`); continue }
  console.log(`  ${k.padEnd(11)} ${v.h} of ${v.n} = ${pct(v.h, v.n)}   margin ${(100 * v.h / v.n - 100 * control).toFixed(1)}pts`)
}
if (strat.mechanism.n && strat.guess.n) {
  const d = 100 * strat.mechanism.h / strat.mechanism.n - 100 * strat.guess.h / strat.guess.n
  console.log(`  mechanism minus guess: ${d.toFixed(1)}pts` + (Math.abs(d) < 5 ? '  — the self-report carries no information here' : ''))
}
const unan = ids.filter(i => perItem[i].n && perItem[i].hits === perItem[i].n)
const exp = ids.length * Math.pow(control, Object.keys(solvers).length)
console.log(`\n  unanimous-correct items: ${unan.length} of ${ids.length}   (expected at control: ${exp.toFixed(2)})`)
if (unan.length) console.log(`    ${unan.map(i => i + '(' + key[i].localId + ')').join(', ')}`)
