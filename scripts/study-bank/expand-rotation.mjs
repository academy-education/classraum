/**
 * Expand rotation-v1.json into bank-shaped items, and REFUSE to emit
 * anything if the construction's guarantee does not hold.
 *
 * The design's whole claim is arithmetic: within a family the four items
 * share one option set and each option is the key exactly once, so any
 * fixed blind strategy scores exactly 1 of 4. If that invariant is
 * broken — a duplicated keyIndex, a repeated option, a key that is not
 * byte-identical to a choice — the batch silently stops testing the
 * hypothesis and a solver run would measure nothing. Checking it costs
 * milliseconds; a solver run costs real money, so the check goes first.
 *
 * Usage: node scripts/study-bank/expand-rotation.mjs [--write out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'

const src = JSON.parse(readFileSync(new URL('./rotation-v1.json', import.meta.url), 'utf8'))
const problems = []
const items = []
const seenOptionGlobal = new Map()

for (const fam of src.families) {
  const { id, options, items: fitems } = fam

  if (options.length !== 4) problems.push(`${id}: ${options.length} options, expected 4`)
  if (fitems.length !== 4) problems.push(`${id}: ${fitems.length} items, expected 4`)

  // Each option must be the key exactly once — the invariant that pins
  // blind accuracy to chance.
  const keyCounts = new Map()
  for (const it of fitems) keyCounts.set(it.keyIndex, (keyCounts.get(it.keyIndex) ?? 0) + 1)
  for (let i = 0; i < options.length; i++) {
    const n = keyCounts.get(i) ?? 0
    if (n !== 1) problems.push(`${id}: option ${i} is the key ${n} times, expected exactly 1`)
  }

  // Duplicate options inside a family would make two items share a key
  // string; duplicates ACROSS families let a solver link families.
  const local = new Set(options)
  if (local.size !== options.length) problems.push(`${id}: duplicate option text within the family`)
  for (const o of options) {
    const prev = seenOptionGlobal.get(o)
    if (prev && prev !== id) problems.push(`option repeats across families (${prev} and ${id}): "${o.slice(0, 40)}…"`)
    seenOptionGlobal.set(o, id)
  }

  for (const [i, it] of fitems.entries()) {
    const key = options[it.keyIndex]
    if (key == null) { problems.push(`${id}[${i}]: keyIndex ${it.keyIndex} out of range`); continue }
    const words = it.stimulus.trim().split(/\s+/).length
    if (words < 12 || words > 28) problems.push(`${id}[${i}]: stimulus ${words} words, brief says 12-28`)

    items.push({
      // Bank shape — mirrors a live Choose a Response row exactly.
      type: 'multiple_choice',
      prompt: '[Choose a Response] Which is the most natural reply?',
      passage: `Transcript: "${it.stimulus}"`,
      choices: [...options],
      correct_answer: key,
      difficulty: 'hard',
      explanation: `The utterance is ${it.act}; the key answers that act rather than the surface content.`,
      passageGroupId: null,
      listeningTask: 'choose_response',
      blanks: null, graphic: null, correct_answers: null, acceptable_answers: null,
      distractor_rationales: [],
      // Provenance for scoring. Not inserted into the bank.
      _family: id, _keyIndex: it.keyIndex, _act: it.act,
    })
  }
}

// correct_answer must be byte-identical to a choices entry — the bank's
// grader compares strings, so a stray character silently unkeys the item.
for (const [i, it] of items.entries()) {
  if (!it.choices.includes(it.correct_answer)) problems.push(`item ${i}: correct_answer not byte-identical to any choice`)
}

// The by-construction guarantee, asserted rather than assumed: for every
// family, EVERY fixed strategy ("always pick slot k", pre-shuffle) scores
// exactly 1 of 4.
for (const fam of src.families) {
  for (let slot = 0; slot < 4; slot++) {
    const hits = fam.items.filter(it => it.keyIndex === slot).length
    if (hits !== 1) problems.push(`${fam.id}: fixed strategy "always option ${slot}" scores ${hits}/4, expected 1/4`)
  }
}

const acts = new Set(items.map(i => i._act))
console.log(`families ${src.families.length}  items ${items.length}  distinct speech acts ${acts.size}`)
console.log(`options per family 4, each the key exactly once -> blind ceiling by construction = 25.0%`)

if (problems.length) {
  console.error(`\nREFUSING TO EMIT — ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\nconstruction invariants: all hold')

const outArg = process.argv.indexOf('--write')
if (outArg !== -1 && process.argv[outArg + 1]) {
  writeFileSync(process.argv[outArg + 1], JSON.stringify(items, null, 2))
  console.log(`wrote ${items.length} items -> ${process.argv[outArg + 1]}`)
}
