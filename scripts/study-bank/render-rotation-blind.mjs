/**
 * Render rotation-v1 for a no-source attack.
 *
 * Writes THREE files, and the split matters:
 *
 *   .solver-input.json  what a solver sees. Stem kept, transcript stripped,
 *                       options shuffled and re-lettered per item, item
 *                       order shuffled. NO family label — telling a solver
 *                       which items share an option set hands it the
 *                       construction, and a solver that knows four items
 *                       rotate one option set can spread its picks and
 *                       guarantee 1/4 rather than risk 0/4. The mirror-pair
 *                       pilot's solver C spotted that structure unaided and
 *                       said so; do not gift it.
 *   .blind.json         the same items PLUS the family, for score-blind's
 *                       per-set analysis only.
 *   .key.json           id -> letter after shuffling.
 *
 * Shuffle is seeded. An unseeded render cannot be reproduced, so a
 * surprising result could never be re-examined on the same paper.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SEED = 20260804

// mulberry32 — small, seeded, good enough for shuffling 16 items.
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(SEED)
const shuffled = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Reuse the validated expander rather than re-deriving items here — one
// definition of the batch, and it has already refused to emit on a broken
// construction.
const tmp = new URL('./.rotation-expanded.json', import.meta.url).pathname
execFileSync('node', [new URL('./expand-rotation.mjs', import.meta.url).pathname, '--write', tmp], { stdio: 'inherit' })
const items = JSON.parse(readFileSync(tmp, 'utf8'))

const LETTERS = ['A', 'B', 'C', 'D']
const solverInput = []
const blind = []
const key = {}

/*
 * Per family: a 4x4 LATIN SQUARE whose KEY CELLS FORM A TRANSVERSAL.
 *
 *   Latin square  each option occupies each letter exactly once across
 *                 the family's four items. Kills both defects the blind
 *                 solvers reported — no option pinned to one letter, no
 *                 two items sharing an ordering.
 *   transversal   the four keys occupy four DIFFERENT letters, so key
 *                 letters are flat within every family and therefore
 *                 4/4/4/4 overall, giving a 25% control.
 *
 * The previous attempt used cyclic shifts and could not do both. With
 * shift s the key lands at (k + s_k) mod 4, and for that to be a
 * permutation you need a complete mapping of Z4 — which does not exist,
 * because a cyclic group of even order has none (Hall-Paige). The
 * symptom was the control drifting to 37.5% while the code looked
 * right. So search for a valid square instead of assuming a formula.
 */
function familySquare(rand) {
  // rows[i] = array of 4 option indices, position = letter slot.
  for (let attempt = 0; attempt < 5000; attempt++) {
    const rows = []
    const usedInSlot = [new Set(), new Set(), new Set(), new Set()]
    let ok = true
    for (let i = 0; i < 4 && ok; i++) {
      const perms = []
      for (let a = 0; a < 24; a++) {
        const p = [0, 1, 2, 3]
        // index -> permutation, then filter by the Latin constraint
        let n = a
        const out = []
        const pool = [...p]
        for (let d = 4; d >= 1; d--) { out.push(pool.splice(n % d, 1)[0]); n = Math.floor(n / d) }
        if (out.every((o, slot) => !usedInSlot[slot].has(o))) perms.push(out)
      }
      if (!perms.length) { ok = false; break }
      const chosen = perms[Math.floor(rand() * perms.length)]
      chosen.forEach((o, slot) => usedInSlot[slot].add(o))
      rows.push(chosen)
    }
    if (!ok) continue
    // Transversal check: item i's key is option i (each option keys once),
    // so the key letters are the slots where row i holds option i.
    const keyLetters = rows.map((r, i) => r.indexOf(i))
    if (new Set(keyLetters).size === 4) return { rows, keyLetters }
  }
  throw new Error('no Latin square with a key transversal found in 5000 attempts')
}

const famSquare = {}
const famOrder = {}
for (const fam of [...new Set(items.map(i => i._family))]) {
  famOrder[fam] = items.filter(i => i._family === fam)[0].choices
  famSquare[fam] = familySquare(rand)
}

for (const [i, it] of shuffled(items).entries()) {
  const id = String(i + 1)
  const order = famOrder[it._family]
  const k = order.indexOf(it.correct_answer)
  if (k === -1) throw new Error(`item ${id}: key not in its family option order`)
  const { rows, keyLetters } = famSquare[it._family]
  const row = rows[k]
  const opts = new Array(4)
  row.forEach((optIdx, slot) => { opts[slot] = order[optIdx] })
  const letter = LETTERS[keyLetters[k]]
  if (opts[LETTERS.indexOf(letter)] !== it.correct_answer) throw new Error(`item ${id}: key not at its computed letter`)

  const question = it.prompt.replace(/^\[Choose a Response\]\s*/, '')
  const options = Object.fromEntries(opts.map((o, n) => [LETTERS[n], o]))

  solverInput.push({ id, question, options })
  blind.push({ id, question, options, set: it._family })
  key[id] = { letter }
}

const base = new URL('./rotation-v1', import.meta.url).pathname

/*
 * WRITE-ONCE unless --force.
 *
 * Re-running this renderer once already overwrote rotation-v1.key.json
 * AFTER the with-source file had been built from it, moving 9 of 16 key
 * letters. Two readers then scored 43.8% against a key that no longer
 * described their paper. That looked like a catastrophic result and was
 * pure file corruption; it was caught only because both readers agreed
 * with each other 16/16, which is impossible if they were really wrong.
 *
 * A render is an experimental artifact. Silently replacing it
 * invalidates every downstream file without touching them.
 */
const outputs = ['.solver-input.json', '.blind.json', '.key.json'].map(x => `${base}${x}`)
const existing = outputs.filter(f => existsSync(f))
if (existing.length && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render:')
  for (const f of existing) console.error(`  ${f.split('/').pop()}`)
  console.error('\nDownstream files (withsource-input, solver-*.json) were built against it.')
  console.error('Re-render only with --force, and re-derive everything downstream afterwards.')
  process.exit(1)
}

writeFileSync(`${base}.solver-input.json`, JSON.stringify(solverInput, null, 2))
writeFileSync(`${base}.blind.json`, JSON.stringify(blind, null, 2))
writeFileSync(`${base}.key.json`, JSON.stringify(key, null, 2))

// The control the result must beat. Key letters are NOT uniform after a
// shuffle of 16, and scoring against a flat 25% would flatter or punish
// the batch for an accident of the draw.
const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
const best = Math.max(...counts)
console.log(`\nitems ${solverInput.length}  seed ${SEED}`)
console.log(`key letters  ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}`)
console.log(`best fixed-letter control = ${(100 * best / solverInput.length).toFixed(1)}%  <-- score against THIS, not 25%`)
