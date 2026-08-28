/**
 * check-consensus-tell.mjs — the element-frequency (majority-consensus)
 * tell in one-corruption-per-distractor MC batches.
 *
 * THE DEFECT (found 2026-08-28 by the eoi-v4 pattern hunter, then
 * confirmed by this exact checker over the whole population): when every
 * distractor is "the key with exactly one element corrupted", every TRUE
 * element appears in 3 of 4 options, and the key is the option agreeing
 * with the majority on all elements while adding nothing. A blind solver
 * who picks the option with the FEWEST tokens unique to it beats the
 * batch without the passage.
 *
 * Measured on known data before being trusted (self-test rule):
 *   eoi-v4 RS (pre-ship)   16/20 decided hits (80%)   -> batch killed
 *   eoi-v3 RS (live, 32)   20/24 decided hits (83%)   -> replace+archive
 *   v2 RS (older brief)     2/13 decided hits (15%)   -> anti-predicts,
 *                           so the checker is brief-specific, not trivial
 *   Transitions            all ties (single-word options) -> immune
 *
 * Verdict guidance: expected blind score = (hits + ties*0.25)/n. Treat
 * >= 40% as a killed batch (chance is 25%), 30-40% as inconclusive.
 *
 *   node scripts/study-bank/check-consensus-tell.mjs <items.json>
 *   node scripts/study-bank/check-consensus-tell.mjs --selftest
 *
 * items.json: [{ id, choices[4], correct_answer, ... }]
 */
import { readFileSync } from 'node:fs'

const STOP = new Set('the a an of in to and for with on that as is are was were by at from its their his her it they this those these than more less most least not no'.split(' '))
const toks = s => s.toLowerCase().replace(/[^a-z0-9 %]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w))

export function consensusPredict(choices) {
  const per = choices.map(toks)
  const uniq = choices.map((_, i) => {
    const others = new Set(per.filter((_, j) => j !== i).flat())
    return per[i].filter(t => !others.has(t)).length
  })
  const min = Math.min(...uniq)
  const cands = choices.filter((_, i) => uniq[i] === min)
  return cands.length === 1 ? cands[0] : null
}

export function run(items) {
  let hits = 0, ties = 0
  const rows = []
  for (const it of items) {
    if (!Array.isArray(it.choices) || it.choices.length < 3) continue
    const pred = consensusPredict(it.choices)
    if (pred === null) { ties++; rows.push([it.id, 'tie']); continue }
    const hit = pred === it.correct_answer
    if (hit) hits++
    rows.push([it.id, hit ? 'HIT' : 'miss'])
  }
  const n = rows.length
  const decided = n - ties
  const expectedBlind = n ? (hits + ties * 0.25) / n : 0
  return { n, decided, hits, ties, expectedBlind, rows }
}

function selftest() {
  // A synthetic corruption-symmetric item: key shares every element,
  // each distractor has one unique corrupted token.
  const bad = {
    id: 'FIXTURE-BAD',
    choices: [
      'the team found a 72 percent gain in the trial',
      'the team found a 92 percent gain in the trial',
      'the crew found a 72 percent gain in the trial',
      'the team found a 72 percent gain in the survey',
    ],
    correct_answer: 'the team found a 72 percent gain in the trial',
  }
  // A paired-corruption item: each wrong value appears twice -> tie.
  const good = {
    id: 'FIXTURE-GOOD',
    choices: [
      'the team found a 72 percent gain in the trial',
      'the crew found a 92 percent gain in the trial',
      'the crew found a 72 percent gain in the survey',
      'the team found a 92 percent gain in the survey',
    ],
    correct_answer: 'the team found a 72 percent gain in the trial',
  }
  const r1 = run([bad]), r2 = run([good])
  if (r1.hits !== 1) { console.error('SELFTEST FAIL: symmetric-corruption fixture not caught'); process.exit(1) }
  if (r2.ties !== 1) { console.error('SELFTEST FAIL: paired-corruption fixture should tie'); process.exit(1) }
  console.log('selftest OK — catches one-corruption symmetry, blind to paired corruption')
}

const arg = process.argv[2]
if (arg === '--selftest') { selftest(); process.exit(0) }
if (!arg) { console.error('usage: check-consensus-tell.mjs <items.json> | --selftest'); process.exit(1) }
const items = JSON.parse(readFileSync(arg, 'utf8'))
const r = run(items)
console.log(`n=${r.n} decided=${r.decided} hits=${r.hits} ties=${r.ties}`)
console.log(`expected blind score ${(r.expectedBlind * 100).toFixed(0)}% (chance 25%) — ${r.expectedBlind >= 0.40 ? 'KILLED (>=40%)' : r.expectedBlind >= 0.30 ? 'INCONCLUSIVE (30-40%)' : 'clean (<30%)'}`)
console.log(r.rows.map(x => x.join(':')).join(' '))
