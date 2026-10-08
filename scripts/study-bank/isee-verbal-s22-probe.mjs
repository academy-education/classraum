#!/usr/bin/env node
/**
 * isee-verbal-s22-probe.mjs render <round>     e.g. render r1
 * isee-verbal-s22-probe.mjs score  <round>
 *
 * The pre-freeze BLIND steering probe of isee-verbal-s22.prereg.md: s21's probe
 * plus the named RARITY CEILING, read for both types.
 *
 * render writes two blind files and one key file:
 *   isee-verbal-s22-probe-<round>.sc.blind.json   every SC item of files a, b, c
 *     reduced to its four options, keys dealt flat round-robin, items interleaved
 *     with the shared seeded generator, renumbered P01.., no author tag, no stem
 *   isee-verbal-s22-probe-<round>.syn.blind.json  every synonym item of files d, e
 *     as HEADWORD + four options (order shuffled), renumbered S01..
 *   isee-verbal-s22-probe-<round>.key.json        P/S id -> { letter?, localId }
 * score reads isee-verbal-s22-probe-<round>.probe.json, one entry per id:
 *   P-ids: { antonym_pole, odd_one_out, most_specific, test_word: letter,
 *            opposite_pairs: [[letter, letter], ...], polarity: { A..D: '+'|'-'|'0' },
 *            above_ceiling: [letter, ...] }
 *   S-ids: { above_ceiling: [word, ...] }   (the headword or option words, as printed)
 * and prints per author file: each forced pick's hits on the key / N (bar: FEWER
 * than 35%), items with a probe-named opposite pair, items breaking rule 2 on the
 * probe's polarity labels, and words above the ceiling split key / distractor /
 * headword. Every item named there goes into the ONE revision round.
 * Steering only: it decides nothing at the gate.
 * Refuses (exit 2) on a probe file missing any id or field, or naming an
 * above_ceiling entry that is not on that item.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank'
const [mode, round] = process.argv.slice(2)
if (!['render', 'score'].includes(mode) || !round) { console.error('usage: render|score <round>'); process.exit(2) }
const SC_FILES = ['a', 'b', 'c'].map(l => `${D}/isee-verbal-s22${l}.batch.json`)
const SYN_FILES = ['d', 'e'].map(l => `${D}/isee-verbal-s22${l}.batch.json`)
const SLOT = ['A', 'B', 'C', 'D']
const tag = `${D}/isee-verbal-s22-probe-${round}`
const load = fs => fs.flatMap(f => {
  if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
  const b = JSON.parse(readFileSync(f, 'utf8'))
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
  return b
})
const headword = it => it.prompt.replace(/^\[Synonym\]\s*/, '').trim()
if (mode === 'render') {
  const rand = rng(round === 'r1' ? 20261153 : 20261154)
  const sc = shuffleWith(load(SC_FILES), rand), syn = shuffleWith(load(SYN_FILES), rand)
  const scBlind = {}, synBlind = {}, key = {}
  sc.forEach((it, i) => {
    const want = SLOT[i % 4]
    const rest = shuffleWith(it.choices.filter(c => c !== it.correct_answer), rand)
    let r = 0
    const pid = `P${String(i + 1).padStart(2, '0')}`
    scBlind[pid] = { options: Object.fromEntries(SLOT.map(s => [s, s === want ? it.correct_answer : rest[r++]])) }
    key[pid] = { letter: want, localId: it.id }
  })
  syn.forEach((it, i) => {
    const sid = `S${String(i + 1).padStart(2, '0')}`
    synBlind[sid] = { headword: headword(it), options: shuffleWith(it.choices.slice(), rand) }
    key[sid] = { localId: it.id }
  })
  for (const [f, o] of [[`${tag}.sc.blind.json`, scBlind], [`${tag}.syn.blind.json`, synBlind], [`${tag}.key.json`, key]]) writeFileSync(f, JSON.stringify(o, null, 1) + '\n')
  for (const f of [`${tag}.sc.blind.json`, `${tag}.syn.blind.json`]) console.log(`${f}: ${Object.keys(f.includes('.sc.') ? scBlind : synBlind).length} items, sha ${createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16)}`)
} else {
  const key = JSON.parse(readFileSync(`${tag}.key.json`, 'utf8'))
  const pf = `${tag}.probe.json`
  if (!existsSync(pf)) { console.error(`REFUSING: ${pf} missing`); process.exit(2) }
  const P = JSON.parse(readFileSync(pf, 'utf8'))
  const scBlind = JSON.parse(readFileSync(`${tag}.sc.blind.json`, 'utf8'))
  const synBlind = JSON.parse(readFileSync(`${tag}.syn.blind.json`, 'utf8'))
  const H = ['antonym_pole', 'odd_one_out', 'most_specific', 'test_word']
  const items = Object.fromEntries([...load(SC_FILES), ...load(SYN_FILES)].map(it => [it.id, it]))
  const norm = s => String(s ?? '').trim().toLowerCase()
  for (const id of Object.keys(key)) {
    const p = P[id]
    if (!p || !Array.isArray(p.above_ceiling)) { console.error(`REFUSING: probe entry ${id} missing or above_ceiling not an array`); process.exit(2) }
    if (id.startsWith('P')) {
      if (H.some(h => !SLOT.includes(p[h])) || !Array.isArray(p.opposite_pairs) || !p.polarity || SLOT.some(s => !['+', '-', '0'].includes(p.polarity[s]))) { console.error(`REFUSING: probe entry ${id} incomplete`); process.exit(2) }
      for (const x of p.above_ceiling) if (!SLOT.includes(x)) { console.error(`REFUSING: ${id} above_ceiling '${x}' is not a letter A-D`); process.exit(2) }
    } else {
      const on = [synBlind[id].headword, ...synBlind[id].options].map(norm)
      for (const x of p.above_ceiling) if (typeof x !== 'string' || !on.includes(norm(x))) { console.error(`REFUSING: ${id} above_ceiling '${JSON.stringify(x)}' is not that item's headword or an option`); process.exit(2) }
    }
  }
  const by = {}
  for (const [id, k] of Object.entries(key)) { const a = k.localId.replace(/-\d+$/, ''); (by[a] ??= []).push(id) }
  const named = new Set()
  for (const [a, ids] of Object.entries(by).sort()) {
    const n = ids.length
    if (ids[0].startsWith('P')) {
      const line = H.map(h => { const hit = ids.filter(id => P[id][h] === key[id].letter); const over = hit.length / n >= 0.35; if (over) hit.forEach(id => named.add(key[id].localId)); return `${h} ${hit.length}/${n} = ${(100 * hit.length / n).toFixed(1)}%${over ? ' OVER' : ''}` })
      const opp = ids.filter(id => P[id].opposite_pairs.length)
      const polBreach = ids.filter(id => {
        const pol = P[id].polarity, kv = pol[key[id].letter], c = {}
        for (const s of SLOT) c[pol[s]] = (c[pol[s]] ?? 0) + 1
        return Object.entries(c).some(([v, m]) => v !== kv && m >= 3)
      })
      const above = ids.filter(id => P[id].above_ceiling.length)
      for (const id of [...opp, ...polBreach, ...above]) named.add(key[id].localId)
      const word = (id, x) => scBlind[id].options[x] + (x === key[id].letter ? ' (KEY)' : '')
      console.log(`${a} (n=${n}): ${line.join('; ')}`)
      console.log(`   opposite pair named on ${opp.length}: ${opp.map(id => `${key[id].localId} ${P[id].opposite_pairs.map(([x, y]) => `${scBlind[id].options[x]}/${scBlind[id].options[y]}`).join(',')}`).join('; ') || '-'}`)
      console.log(`   polarity breach (probe labels) on ${polBreach.length}: ${polBreach.map(id => key[id].localId).join(', ') || '-'}`)
      const kAbove = above.filter(id => P[id].above_ceiling.includes(key[id].letter)).length
      console.log(`   above ceiling on ${above.length} items (key on ${kAbove}): ${above.map(id => `${key[id].localId} ${P[id].above_ceiling.map(x => word(id, x)).join(',')}`).join('; ') || '-'}`)
    } else {
      const above = ids.filter(id => P[id].above_ceiling.length)
      for (const id of above) named.add(key[id].localId)
      const role = (id, w) => { const it = items[key[id].localId]; return norm(w) === norm(headword(it)) ? `${w} (HEADWORD)` : norm(w) === norm(it.correct_answer) ? `${w} (KEY)` : w }
      console.log(`${a} (n=${n}, synonyms): above ceiling on ${above.length}: ${above.map(id => `${key[id].localId} ${P[id].above_ceiling.map(w => role(id, w)).join(',')}`).join('; ') || '-'}`)
    }
  }
  const sc = Object.keys(key).filter(id => id.startsWith('P'))
  console.log(`all SC (n=${sc.length}): ${H.map(h => `${h} ${sc.filter(id => P[id][h] === key[id].letter).length}/${sc.length}`).join('; ')}; above-ceiling words ${sc.reduce((s, id) => s + P[id].above_ceiling.length, 0)} of ${sc.length * 4}`)
  console.log(named.size ? `STEERING: ${named.size} items named for the revision round: ${[...named].sort().join(', ')}` : 'STEERING: nothing named')
}
