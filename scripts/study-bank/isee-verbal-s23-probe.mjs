#!/usr/bin/env node
/**
 * isee-verbal-s23-probe.mjs render <round>     e.g. render r1
 * isee-verbal-s23-probe.mjs score  <round>
 *
 * The pre-freeze OPTIONS-ONLY steering probe of isee-verbal-s23.prereg.md:
 * s22's probe (isee-verbal-s22-probe.mjs) with two changes.
 *
 * 1. Calibration plants are in EVERY round, not added after r1. s22's r1 put
 *    0 of 180 SC words above the ceiling, which cannot be told from a reader
 *    that cannot flag; r2's six plants (real option sets of s20/s21 SC items
 *    whose distractors >= 2 graders marked above band) were then flagged 7 of 7.
 *    The same six are interleaved here from the start. They are scored on their
 *    own line ("PLANT"), never named for revision, never enter any s23 file.
 * 2. A BLIND GUESS per SC item, scored PER AUTHOR FILE. s22's author A drew
 *    62.2% options-only (28/45 over three samples) against B 35.6% and C 48.9%,
 *    with no heuristic any sample could name - so no forced-pick bar could see
 *    it. Each P-item now also carries `pick` (a letter: the probe's best guess
 *    at the withheld answer) and `basis` ('signal' | 'guess'). An author file
 *    whose guess hits the key on >= 50% of its items (15 -> 8) has its key-hit
 *    items named for the one revision round. One probe sample of 15 items is
 *    noisy (an author drawing at s22's live 42.6% trips this ~28% of the time;
 *    one at A's 62.2% ~84%); it steers a revision, it decides nothing.
 *
 * render writes two blind files and one key file:
 *   isee-verbal-s23-probe-<round>.sc.blind.json   every SC item of files a-d plus
 *     the plants, reduced to four options, keys dealt flat round-robin, items
 *     interleaved with the shared seeded generator, renumbered P01.., no stem
 *   isee-verbal-s23-probe-<round>.syn.blind.json  every synonym of files e, f as
 *     HEADWORD + four options (order shuffled), renumbered S01..
 *   isee-verbal-s23-probe-<round>.key.json        P/S id -> { letter?, localId, plant? }
 * score reads isee-verbal-s23-probe-<round>.probe.json, one entry per id:
 *   P-ids: { pick, antonym_pole, odd_one_out, most_specific, test_word: letter,
 *            basis: 'signal'|'guess', opposite_pairs: [[letter, letter], ...],
 *            polarity: { A..D: '+'|'-'|'0' }, above_ceiling: [letter, ...] }
 *   S-ids: { above_ceiling: [word, ...] }
 * Named for the ONE revision round (written to ...-<round>.named.json with the
 * reasons): any item with a word above the ceiling, a probe-named opposite pair,
 * a probe-read polarity breach; the key-hit items of any forced pick at >= 35%
 * of its author file; the key-hit guess items of an author file at >= 50%.
 * Refuses (exit 2) on a probe file missing any id or field, or naming an
 * above_ceiling entry that is not on that item.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank'
const [mode, round] = process.argv.slice(2)
if (!['render', 'score'].includes(mode) || !['r1', 'r2'].includes(round)) { console.error('usage: render|score r1|r2'); process.exit(2) }
const SC_FILES = ['a', 'b', 'c', 'd'].map(l => `${D}/isee-verbal-s23${l}.batch.json`)
const SYN_FILES = ['e', 'f'].map(l => `${D}/isee-verbal-s23${l}.batch.json`)
const PLANTS = ['IS21B-14', 'IS20C-19', 'IS21A-10', 'IS21A-18', 'IS21A-06', 'IS21A-09']
const GUESS_BAR = 0.5, PICK_BAR = 0.35
const SLOT = ['A', 'B', 'C', 'D']
const tag = `${D}/isee-verbal-s23-probe-${round}`
const load = fs => fs.flatMap(f => {
  if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
  const b = JSON.parse(readFileSync(f, 'utf8'))
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
  return b
})
const headword = it => it.prompt.replace(/^\[Synonym\]\s*/, '').trim()
if (mode === 'render') {
  const rand = rng(round === 'r1' ? 20261173 : 20261174)
  const prior = load([`${D}/isee-verbal-s21-sc.batch.json`, `${D}/isee-verbal-s20-sc.batch.json`])
  const plants = PLANTS.map(id => { const it = prior.find(x => x.id === id); if (!it) { console.error(`REFUSING: plant ${id} not in s20/s21 SC`); process.exit(2) } return { ...it, plant: true } })
  // r2 leaves out items the with-sentence readers already dropped in r1 (isee-verbal-s23-reader.mjs)
  const dropF = `${D}/isee-verbal-s23-reader-r1.drops.json`
  const dropped = round === 'r2' ? Object.keys(existsSync(dropF) ? JSON.parse(readFileSync(dropF, 'utf8')) : (console.error(`REFUSING: ${dropF} missing (score the r1 readers first)`), process.exit(2))) : []
  const sc = shuffleWith([...load(SC_FILES).filter(it => !dropped.includes(it.id)), ...plants], rand), syn = shuffleWith(load(SYN_FILES), rand)
  const scBlind = {}, synBlind = {}, key = {}
  sc.forEach((it, i) => {
    const want = SLOT[i % 4]
    const rest = shuffleWith(it.choices.filter(c => c !== it.correct_answer), rand)
    let r = 0
    const pid = `P${String(i + 1).padStart(2, '0')}`
    scBlind[pid] = { options: Object.fromEntries(SLOT.map(s => [s, s === want ? it.correct_answer : rest[r++]])) }
    key[pid] = { letter: want, localId: it.id, ...(it.plant ? { plant: true } : {}) }
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
  // (items dropped before r2 are simply absent from the r2 key; scoring reads the key)
  const items = Object.fromEntries([...load(SC_FILES), ...load(SYN_FILES)].map(it => [it.id, it]))
  const norm = s => String(s ?? '').trim().toLowerCase()
  for (const id of Object.keys(key)) {
    const p = P[id]
    if (!p || !Array.isArray(p.above_ceiling)) { console.error(`REFUSING: probe entry ${id} missing or above_ceiling not an array`); process.exit(2) }
    if (id.startsWith('P')) {
      if ([...H, 'pick'].some(h => !SLOT.includes(p[h])) || !['signal', 'guess'].includes(p.basis) || !Array.isArray(p.opposite_pairs) || !p.polarity || SLOT.some(s => !['+', '-', '0'].includes(p.polarity[s]))) { console.error(`REFUSING: probe entry ${id} incomplete`); process.exit(2) }
      for (const x of p.above_ceiling) if (!SLOT.includes(x)) { console.error(`REFUSING: ${id} above_ceiling '${x}' is not a letter A-D`); process.exit(2) }
    } else {
      const on = [synBlind[id].headword, ...synBlind[id].options].map(norm)
      for (const x of p.above_ceiling) if (typeof x !== 'string' || !on.includes(norm(x))) { console.error(`REFUSING: ${id} above_ceiling '${JSON.stringify(x)}' is not that item's headword or an option`); process.exit(2) }
    }
  }
  const by = {}
  for (const [id, k] of Object.entries(key)) { const a = k.plant ? 'PLANT' : k.localId.replace(/-\d+$/, ''); (by[a] ??= []).push(id) }
  const named = {}
  const name = (id, why) => { (named[key[id].localId] ??= []).push(why) }
  for (const [a, ids] of Object.entries(by).sort()) {
    const n = ids.length
    if (ids[0].startsWith('P')) {
      const above = ids.filter(id => P[id].above_ceiling.length)
      if (a === 'PLANT') {
        const w = id => Object.entries(scBlind[id].options).filter(([x]) => P[id].above_ceiling.includes(x)).map(([, t]) => t)
        console.log(`PLANT (calibration, n=${n}): items with >= 1 word flagged ${above.length}/${n}; flagged: ${ids.map(id => `${key[id].localId} [${w(id).join(',') || '-'}]`).join('; ')}`)
        continue
      }
      const line = H.map(h => { const hit = ids.filter(id => P[id][h] === key[id].letter); const over = hit.length / n >= PICK_BAR; if (over) hit.forEach(id => name(id, `forced pick ${h} = key (file ${hit.length}/${n})`)); return `${h} ${hit.length}/${n} = ${(100 * hit.length / n).toFixed(1)}%${over ? ' OVER' : ''}` })
      const g = ids.filter(id => P[id].pick === key[id].letter), gs = g.filter(id => P[id].basis === 'signal')
      const gOver = g.length / n >= GUESS_BAR
      if (gOver) g.forEach(id => name(id, `blind guess = key (file ${g.length}/${n} >= ${GUESS_BAR * 100}%)`))
      const opp = ids.filter(id => P[id].opposite_pairs.length)
      const polBreach = ids.filter(id => {
        const pol = P[id].polarity, kv = pol[key[id].letter], c = {}
        for (const s of SLOT) c[pol[s]] = (c[pol[s]] ?? 0) + 1
        return Object.entries(c).some(([v, m]) => v !== kv && m >= 3)
      })
      for (const id of opp) name(id, `opposite pair ${P[id].opposite_pairs.map(([x, y]) => `${scBlind[id].options[x]}/${scBlind[id].options[y]}`).join(',')}`)
      for (const id of polBreach) name(id, 'polarity breach (probe labels)')
      const word = (id, x) => scBlind[id].options[x] + (x === key[id].letter ? ' (KEY)' : '')
      for (const id of above) name(id, `above ceiling: ${P[id].above_ceiling.map(x => word(id, x)).join(',')}`)
      console.log(`${a} (n=${n}): ${line.join('; ')}`)
      console.log(`   BLIND GUESS = key ${g.length}/${n} = ${(100 * g.length / n).toFixed(1)}%${gOver ? ' OVER' : ''} (bar >= ${GUESS_BAR * 100}%); of them basis 'signal' ${gs.length}; probe said 'signal' on ${ids.filter(id => P[id].basis === 'signal').length}/${n}`)
      console.log(`   opposite pair named on ${opp.length}: ${opp.map(id => key[id].localId).join(', ') || '-'}`)
      console.log(`   polarity breach (probe labels) on ${polBreach.length}: ${polBreach.map(id => key[id].localId).join(', ') || '-'}`)
      const kAbove = above.filter(id => P[id].above_ceiling.includes(key[id].letter)).length
      console.log(`   above ceiling on ${above.length} items (key on ${kAbove}): ${above.map(id => `${key[id].localId} ${P[id].above_ceiling.map(x => word(id, x)).join(',')}`).join('; ') || '-'}`)
    } else {
      const above = ids.filter(id => P[id].above_ceiling.length)
      const role = (id, w) => { const it = items[key[id].localId]; return norm(w) === norm(headword(it)) ? `${w} (HEADWORD)` : norm(w) === norm(it.correct_answer) ? `${w} (KEY)` : w }
      for (const id of above) name(id, `above ceiling: ${P[id].above_ceiling.map(w => role(id, w)).join(',')}`)
      console.log(`${a} (n=${n}, synonyms): above ceiling on ${above.length}: ${above.map(id => `${key[id].localId} ${P[id].above_ceiling.map(w => role(id, w)).join(',')}`).join('; ') || '-'}`)
    }
  }
  const sc = Object.keys(key).filter(id => id.startsWith('P') && !key[id].plant)
  console.log(`all SC (n=${sc.length}): ${[...H, 'pick'].map(h => `${h} ${sc.filter(id => P[id][h] === key[id].letter).length}/${sc.length}`).join('; ')}; above-ceiling words ${sc.reduce((s, id) => s + P[id].above_ceiling.length, 0)} of ${sc.length * 4}`)
  writeFileSync(`${tag}.named.json`, JSON.stringify(named, null, 1) + '\n')
  const ids = Object.keys(named).sort()
  console.log(ids.length ? `STEERING: ${ids.length} items named for the revision round (${tag}.named.json): ${ids.join(', ')}` : 'STEERING: nothing named')
}
