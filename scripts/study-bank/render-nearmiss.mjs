/**
 * Render nearmiss-v1 for BOTH gates in one pass.
 *
 * Independent items this time — no shared option sets, no families, no
 * rotation. Three constructions have been eliminated; this batch is
 * ordinary per-item authoring and the render should be ordinary too.
 *
 * Writes, write-once unless --force (a re-render once overwrote a key
 * file that downstream inputs had already been built against, and two
 * readers then "scored" 43.8% against a paper that no longer existed):
 *
 *   .solver-input.json     blind — stem kept, stimulus stripped
 *   .withsource-input.json stimulus INCLUDED, same ids and letters
 *   .key.json              shared by both, so the two runs compare per item
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SEED = 20260805
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

const src = JSON.parse(readFileSync(new URL('./nearmiss-v1.json', import.meta.url), 'utf8'))
const LETTERS = ['A', 'B', 'C', 'D']

// Refuse to render a malformed batch rather than measure one.
const problems = []
src.items.forEach((it, i) => {
  if (it.distractors.length !== 3) problems.push(`item ${i + 1}: ${it.distractors.length} distractors, expected 3`)
  const all = [it.key, ...it.distractors]
  if (new Set(all).size !== 4) problems.push(`item ${i + 1}: duplicate option text`)
  if (!it.stimulus?.trim()) problems.push(`item ${i + 1}: no stimulus`)
})
// An option repeated ACROSS items would let a solver link them, which is
// how the last batch leaked its own structure.
const seen = new Map()
src.items.forEach((it, i) => {
  for (const o of [it.key, ...it.distractors]) {
    if (seen.has(o)) problems.push(`option shared by items ${seen.get(o)} and ${i + 1}: "${o.slice(0, 40)}…"`)
    seen.set(o, i + 1)
  }
})
if (problems.length) {
  console.error(`REFUSING TO RENDER — ${problems.length} problem(s):`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}

/*
 * Key letters assigned FLAT (each letter keys 4 of 16), not left to the
 * shuffle. A free shuffle of 16 previously produced A:9 B:1 C:4 D:2 — a
 * 56.3% fixed-letter control, at which a solver's score means nothing.
 */
const targetLetters = shuffled(LETTERS.flatMap(L => [L, L, L, L]))

const blindOut = [], wsOut = [], key = {}
shuffled(src.items).forEach((it, i) => {
  const id = String(i + 1)
  const letter = targetLetters[i]
  const rest = shuffled(it.distractors)
  const opts = LETTERS.map(L => (L === letter ? it.key : rest.pop()))
  if (opts.some(o => o === undefined)) throw new Error(`item ${id}: option slot unfilled`)
  if (opts[LETTERS.indexOf(letter)] !== it.key) throw new Error(`item ${id}: key misplaced`)

  const question = 'Which is the most natural reply?'
  const options = Object.fromEntries(opts.map((o, n) => [LETTERS[n], o]))
  blindOut.push({ id, question, options })
  wsOut.push({ id, stimulus: it.stimulus, question, options })
  key[id] = { letter }
})

const base = new URL('./nearmiss-v1', import.meta.url).pathname
const outs = ['.solver-input.json', '.withsource-input.json', '.key.json'].map(x => base + x)
const existing = outs.filter(existsSync)
if (existing.length && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render:')
  for (const f of existing) console.error('  ' + f.split('/').pop())
  console.error('\nDownstream solver files were built against it. Use --force and re-derive.')
  process.exit(1)
}
writeFileSync(outs[0], JSON.stringify(blindOut, null, 2))
writeFileSync(outs[1], JSON.stringify(wsOut, null, 2))
writeFileSync(outs[2], JSON.stringify(key, null, 2))

const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
console.log(`items ${blindOut.length}  seed ${SEED}`)
console.log(`key letters  ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}`)
console.log(`best fixed-letter control = ${(100 * Math.max(...counts) / blindOut.length).toFixed(1)}%`)
console.log(`\nblind file carries no stimulus: ${!JSON.stringify(blindOut).includes(src.items[0].stimulus.slice(0, 30))}`)
