/**
 * Can the key be found by WORD MATCHING instead of comprehension?
 *
 * rotation-v1 passed the blind gate (+2.1 over control) and both
 * with-source readers still called it broken, independently and for the
 * same reason: 12 of 16 keys are recoverable from surface overlap with
 * the stimulus —
 *
 *   "twenty-minute walk"          -> "Twenty minutes is fine"
 *   "battery goes after an hour"  -> "An hour's enough"
 *   "back by five ... flagged"    -> "back before five ... risk the flag"
 *   "questions on the stats"      -> "handle the stats questions"
 *
 * That is keyword matching, not pragmatic inference, and it is exactly
 * what this task type claims to measure. The blind gate cannot see it,
 * because seeing it requires the stimulus the blind gate withholds. So
 * a batch can pass the blind attack and still test nothing.
 *
 * This is the missing third gate, and unlike the other two it costs
 * nothing to run: no solvers, no tokens, no waiting.
 *
 * THE METRIC that matters is the last one printed: how many items fall
 * to the dumbest possible strategy — "pick the option sharing the most
 * content words with the stimulus". If that beats chance, the batch
 * rewards a candidate who does not understand a word of the exchange.
 *
 * Usage: node scripts/study-bank/check-lexical-anchor.mjs [--max-solvable N]
 */
import { readFileSync } from 'node:fs'

// Deliberately small. A big stopword list would launder real overlap
// away and let the batch pass by definition — the same mistake as a
// regex gate that cannot see what it was built to catch.
const STOP = new Set(`a an the and or but so if then than that this these those there here
i you he she it we they me him her us them my your his its our their
is am are was were be been being do does did done have has had having
will would shall should can could may might must
to of in on at for with from by about as into over after before
not no nor only just very too much many more most own same s t don now
what which who whom when where why how all any both each few other some such
ll re ve d m o y ain aren couldn didn doesn hadn hasn haven isn ma mightn mustn
needn shan shouldn wasn weren won wouldn`.split(/\s+/))

const norm = s => s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/)
  .map(w => w.replace(/^'+|'+$/g, '')).filter(w => w.length > 2 && !STOP.has(w))

const overlap = (a, b) => {
  const B = new Set(norm(b))
  const A = norm(a)
  const shared = A.filter(w => B.has(w))
  return { n: shared.length, words: [...new Set(shared)] }
}

const base = new URL('./rotation-v1', import.meta.url).pathname
const path = process.argv.find(a => a.endsWith('.withsource-input.json'))
  ?? `${base}.withsource-input.json`
const keyPath = process.argv.find(a => a.endsWith('-key.json'))
  ?? `${base}.withsource-key.json`

const items = JSON.parse(readFileSync(path, 'utf8'))
const key = JSON.parse(readFileSync(keyPath, 'utf8'))

let keyAnchored = 0
let solvableByOverlap = 0
const detail = []

for (const it of items) {
  const L = key[it.id].letter ?? key[it.id]
  const scores = Object.entries(it.options).map(([letter, text]) => {
    const o = overlap(text, it.stimulus)
    return { letter, n: o.n, words: o.words, isKey: letter === L }
  })
  const best = Math.max(...scores.map(s => s.n))
  const winners = scores.filter(s => s.n === best)
  const keyScore = scores.find(s => s.isKey)

  // Does the naive matcher land on the key? Ties count as a partial hit
  // rather than a free pass — a candidate guessing among 2 tied options
  // still beats chance.
  if (winners.some(w => w.isKey)) {
    solvableByOverlap += 1 / winners.length
  }
  // Does the key share MORE with its own stimulus than the average
  // distractor does? That is the anchor itself.
  const others = scores.filter(s => !s.isKey)
  const avgOther = others.reduce((a, s) => a + s.n, 0) / others.length
  if (keyScore.n > avgOther) keyAnchored++

  detail.push({ id: it.id, key: L, keyN: keyScore.n, avgOther: +avgOther.toFixed(2), words: keyScore.words })
}

const N = items.length
console.log(`items ${N}`)
console.log(`keys sharing MORE content words with their own stimulus than the average distractor: ${keyAnchored}/${N} (${(100 * keyAnchored / N).toFixed(1)}%)`)
console.log('\nworst offenders (key words echoed straight from the stimulus):')
for (const d of detail.filter(d => d.keyN > 0).sort((a, b) => b.keyN - a.keyN).slice(0, 8)) {
  console.log(`  item ${d.id.padStart(2)}  key ${d.key}  shares ${d.keyN} (avg distractor ${d.avgOther})  ${d.words.join(', ')}`)
}

const pct = 100 * solvableByOverlap / N
console.log(`\nSOLVABLE BY PURE WORD OVERLAP: ${solvableByOverlap.toFixed(1)}/${N} = ${pct.toFixed(1)}%   (chance 25.0%)`)

const cap = Number(process.argv[process.argv.indexOf('--max-solvable') + 1]) || 40
if (pct > cap) {
  console.error(`\nFAIL — a candidate who understands nothing scores ${pct.toFixed(1)}%, over the ${cap}% bar.`)
  process.exit(1)
}
console.log(`\nPASS — word matching alone stays at or under the ${cap}% bar.`)
