#!/usr/bin/env node
/**
 * isee-verbal-s21-probe.mjs render <round>     e.g. render r1
 * isee-verbal-s21-probe.mjs score  <round>
 *
 * The pre-freeze BLIND steering probe of isee-verbal-s21.prereg.md (s20 rule 4 plus test_word).
 * render: every item of the two SC author files reduced to its four options,
 *   keys dealt flat round-robin, items interleaved with the shared seeded
 *   generator and renumbered P01.., no author tag, no stem. Writes
 *   isee-verbal-s21-probe-<round>.blind.json / .key.json.
 * score: reads isee-verbal-s21-probe-<round>.probe.json, one entry per P-id:
 *   { antonym_pole, odd_one_out, most_specific, test_word: letter,
 *     opposite_pairs: [[letter, letter], ...], polarity: { A..D: '+'|'-'|'0' } }
 *   and prints per author file: each heuristic's forced-pick hits / N (bar <= 35%),
 *   items with a probe-named opposite pair, items breaking rule 2 on the probe's
 *   polarity labels. Steering only: it decides nothing at the gate.
 * Refuses (exit 2) on a probe file missing any id or field.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank'
const [mode, round] = process.argv.slice(2)
if (!['render', 'score'].includes(mode) || !round) { console.error('usage: render|score <round>'); process.exit(2) }
const FILES = ['a', 'b'].map(l => `${D}/isee-verbal-s21${l}.batch.json`)
const SLOT = ['A', 'B', 'C', 'D']
const tag = `${D}/isee-verbal-s21-probe-${round}`
if (mode === 'render') {
  const items = []
  for (const f of FILES) {
    if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
    items.push(...JSON.parse(readFileSync(f, 'utf8')))
  }
  const rand = rng(round === 'r1' ? 20261053 : 20261054)
  const order = shuffleWith(items.slice(), rand)
  const blind = {}, key = {}
  order.forEach((it, i) => {
    const want = SLOT[i % 4]
    const rest = shuffleWith(it.choices.filter(c => c !== it.correct_answer), rand)
    let r = 0
    const opts = Object.fromEntries(SLOT.map(s => [s, s === want ? it.correct_answer : rest[r++]]))
    const pid = `P${String(i + 1).padStart(2, '0')}`
    blind[pid] = { options: opts }
    key[pid] = { letter: want, localId: it.id }
  })
  writeFileSync(`${tag}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`${tag}.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`${tag}.blind.json: ${order.length} items, sha ${createHash('sha256').update(readFileSync(`${tag}.blind.json`)).digest('hex').slice(0, 16)}`)
} else {
  const key = JSON.parse(readFileSync(`${tag}.key.json`, 'utf8'))
  const pf = `${tag}.probe.json`
  if (!existsSync(pf)) { console.error(`REFUSING: ${pf} missing`); process.exit(2) }
  const P = JSON.parse(readFileSync(pf, 'utf8'))
  const H = ['antonym_pole', 'odd_one_out', 'most_specific', 'test_word']
  for (const id of Object.keys(key)) {
    const p = P[id]
    if (!p || H.some(h => !SLOT.includes(p[h])) || !Array.isArray(p.opposite_pairs) || !p.polarity || SLOT.some(s => !['+', '-', '0'].includes(p.polarity[s]))) {
      console.error(`REFUSING: probe entry ${id} incomplete`); process.exit(2)
    }
  }
  const by = {}
  for (const [id, k] of Object.entries(key)) { const a = k.localId.replace(/-\d+$/, ''); (by[a] ??= []).push(id) }
  let any = false
  for (const [a, ids] of Object.entries(by).sort()) {
    const n = ids.length
    const line = H.map(h => { const x = ids.filter(id => P[id][h] === key[id].letter).length; if (x / n > 0.35) any = true; return `${h} ${x}/${n} = ${(100 * x / n).toFixed(1)}%${x / n > 0.35 ? ' OVER' : ''}` })
    const opp = ids.filter(id => P[id].opposite_pairs.length)
    const polBreach = ids.filter(id => {
      const pol = P[id].polarity, kv = pol[key[id].letter], c = {}
      for (const s of SLOT) c[pol[s]] = (c[pol[s]] ?? 0) + 1
      return Object.entries(c).some(([v, m]) => v !== kv && m >= 3)
    })
    if (opp.length || polBreach.length) any = true
    console.log(`${a} (n=${n}): ${line.join('; ')}`)
    console.log(`   opposite pair named on ${opp.length}: ${opp.map(id => `${key[id].localId} ${P[id].opposite_pairs.map(([x, y]) => `${x}/${y}`).join(',')}`).join('; ') || '-'}`)
    console.log(`   polarity breach (probe labels) on ${polBreach.length}: ${polBreach.map(id => key[id].localId).join(', ') || '-'}`)
  }
  const all = Object.keys(key)
  console.log(`all (n=${all.length}): ${H.map(h => `${h} ${all.filter(id => P[id][h] === key[id].letter).length}/${all.length}`).join('; ')}`)
  console.log(any ? 'STEERING: revision round named above' : 'STEERING: nothing named')
}
