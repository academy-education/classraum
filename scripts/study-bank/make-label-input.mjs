/**
 * Emit a BLIND labelling input for the option-balance check.
 *
 *   node make-label-input.mjs repair-v1
 *
 * The labeller's whole value is that it does not know which option is
 * the key — if it did, "which family is the key" would be circular. So
 * this writes options in a shuffled order with the key letter held
 * separately, exactly like the solver render.
 *
 * crv2 and crv3 already have blind renders from their own scripts and
 * do not need this; repair-v1 is a raw authoring file (key and
 * distractors in named fields) and does.
 *
 * Key letters are dealt FLAT so the balance numbers are not confounded
 * by a letter skew. repair-v1's own recorded control was 31.0%, and a
 * family that happens to cluster on the over-represented letter would
 * otherwise look imbalanced when it is not.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const which = process.argv[2]
if (which !== 'repair-v1') { console.error('usage: make-label-input.mjs repair-v1'); process.exit(2) }

const SEED = 20260806
function rng(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const rand = rng(SEED)
const shuffled = a => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

const LETTERS = ['A', 'B', 'C', 'D']
const here = p => new URL(p, import.meta.url)
const src = JSON.parse(readFileSync(here('./choose-response-repair-v1.json'), 'utf8'))

const usable = src.filter(it => it.choices?.length === 4 && it.choices.includes(it.correct_answer))
if (usable.length !== src.length) {
  console.error(`skipping ${src.length - usable.length} malformed item(s)`)
}

const letters = shuffled(usable.map((_, i) => LETTERS[i % 4]))
const out = [], key = {}
shuffled(usable).forEach((it, i) => {
  const id = String(i + 1)
  const letter = letters[i]
  const rest = shuffled(it.choices.filter(c => c !== it.correct_answer))
  const opts = LETTERS.map(L => (L === letter ? it.correct_answer : rest.pop()))
  if (opts.some(o => o === undefined)) throw new Error(`item ${id}: option slot unfilled`)
  out.push({ id, question: 'Which is the most natural reply?', options: Object.fromEntries(opts.map((o, n) => [LETTERS[n], o])) })
  key[id] = { letter }
})

const base = here('./repair-v1').pathname
const files = [base + '.label-input.json', base + '.key.json']
if (files.some(existsSync) && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render. Use --force.')
  process.exit(1)
}
writeFileSync(files[0], JSON.stringify(out, null, 2))
writeFileSync(files[1], JSON.stringify(key, null, 2))

const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
console.log(`items ${out.length}`)
console.log(`key letters  ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}`)
console.log(`control      ${(100 * Math.max(...counts) / out.length).toFixed(1)}%`)
const leaked = usable.filter(it => JSON.stringify(out).includes(it.passage.slice(12, 40)))
console.log(`label file carries no stimulus: ${leaked.length === 0}`)
