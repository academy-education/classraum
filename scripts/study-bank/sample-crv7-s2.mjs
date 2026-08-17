/**
 * CR-V7 stage 2 sample attack — draw 24 items ACROSS the six S2 batches
 * (4 per batch, seeded), re-letter flat 6/6/6/6 so the control is 25.0%
 * by construction, and write crv7-s2.blind.json / crv7-s2.key.json.
 *
 * Seed pre-committed with the batch scheme (2026-08-18): 20260818 + 999.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const here = p => new URL(p, import.meta.url)
const SEED = 20260818 + 999
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

const picked = []
for (const b of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']) {
  const f = here(`./crv7-${b}.items.json`)
  if (!existsSync(f)) { console.error(`MISSING crv7-${b}.items.json — render batch ${b} first`); process.exit(1) }
  const items = JSON.parse(readFileSync(f, 'utf8'))
  picked.push(...shuffled(items).slice(0, 4).map(it => ({ ...it, _batch: b })))
}

const targetLetters = shuffled(LETTERS.flatMap(L => Array(picked.length / 4).fill(L)))
const blind = [], key = {}
shuffled(picked).forEach((it, i) => {
  const id = String(i + 1)
  const letter = targetLetters[i]
  const others = shuffled(it.choices.filter(c => c !== it.correct_answer))
  const opts = LETTERS.map(L => (L === letter ? it.correct_answer : others.pop()))
  blind.push({ id, question: 'Which is the most natural reply?', options: Object.fromEntries(opts.map((o, k) => [LETTERS[k], o])) })
  key[id] = { letter, batch: it._batch, localId: it._crv7.localId, kind: it._crv7.kind }
})

const outs = ['crv7-s2.blind.json', 'crv7-s2.key.json'].map(x => here('./' + x).pathname)
if (outs.some(existsSync) && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing s2 render'); process.exit(1)
}
writeFileSync(outs[0], JSON.stringify(blind, null, 2))
writeFileSync(outs[1], JSON.stringify(key, null, 2))
const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
console.log(`sampled ${blind.length} (4 per batch)   seed ${SEED}`)
console.log(`key letters ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}   control ${(100 * Math.max(...counts) / blind.length).toFixed(1)}%`)
const blindText = JSON.stringify(blind)
const leaked = picked.filter(it => {
  const inner = (it.passage.match(/"(.*)"/s)?.[1] ?? '').trim()
  return inner.length > 20 && blindText.includes(inner.slice(0, 20))
})
console.log(`blind file carries no spoken line: ${leaked.length === 0}`)
if (leaked.length) process.exit(1)
