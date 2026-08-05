#!/usr/bin/env node
/**
 * Third condition in the geometry repair experiment.
 *
 *   before      original stem, original options        100.0%
 *   stem-only   repaired stem, original options         87.5%
 *   both        repaired stem, REWRITTEN options          ?
 *
 * The key LETTERS are reused verbatim from georepair.key.json rather
 * than re-dealt. That holds the fixed-slot control at exactly 25.0%
 * across all three conditions, so any movement is attributable to the
 * option CONTENT and not to a luckier shuffle. Re-dealing would have
 * introduced a second variable into a two-point comparison.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const base = new URL('./', import.meta.url).pathname
const key = JSON.parse(readFileSync(base + 'georepair.key.json', 'utf8'))
const pilot = JSON.parse(readFileSync(base + 'geo-repair-pilot.json', 'utf8'))
const INPUT = process.argv[2] || 'geo-distractor-pilot.json'
const OUTPUT = process.argv[3] || 'georepair.both.json'
const rewritten = JSON.parse(readFileSync(base + INPUT, 'utf8'))
const byId = Object.fromEntries(rewritten.map(r => [r.id, r]))
const stemById = Object.fromEntries(pilot.map(p => [p.id, p.newStem]))
const L = ['A', 'B', 'C', 'D']

let s = 20260806
const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const sh = a => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

const out = []
for (const id of Object.keys(key)) {
  const itemId = key[id].itemId
  const r = byId[itemId]
  if (!r) throw new Error(`no rewritten options for ${itemId}`)
  if (r.newDistractors.length !== 3) throw new Error(`${itemId}: ${r.newDistractors.length} distractors`)
  const all = [r.key, ...r.newDistractors].map(String)
  if (new Set(all.map(x => x.trim())).size !== 4) throw new Error(`${itemId}: duplicate option`)

  const letter = key[id].letter
  const rest = sh(r.newDistractors)
  const opts = L.map(x => (x === letter ? r.key : rest.pop()))
  if (opts.some(o => o === undefined)) throw new Error(`${itemId}: unfilled slot`)
  if (opts[L.indexOf(letter)] !== r.key) throw new Error(`${itemId}: key misplaced`)

  out.push({ id, question: stemById[itemId], figureWithheld: true,
             options: Object.fromEntries(opts.map((o, n) => [L[n], o])) })
}

const f = base + OUTPUT
if (existsSync(f) && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render.'); process.exit(1)
}
writeFileSync(f, JSON.stringify(out, null, 2))

const counts = L.map(x => Object.values(key).filter(k => k.letter === x).length)
console.log(`items ${out.length}  key letters ${L.map((x, n) => `${x}:${counts[n]}`).join(' ')}`)
console.log(`control ${(100 * Math.max(...counts) / out.length).toFixed(1)}%  (identical to the other two conditions by construction)`)

// The key must not be findable by its rank among the four VALUES —
// that would just replace one tell with another.
const ranks = out.map(o => {
  const id = o.id
  const vals = L.map(x => o.options[x])
  const nums = vals.map(v => parseFloat(String(v).replace(/[^0-9.\-]/g, '')))
  const keyVal = nums[L.indexOf(key[id].letter)]
  return nums.filter(n => Number.isFinite(n) && n < keyVal).length + 1
})
const hist = [1, 2, 3, 4].map(r => ranks.filter(x => x === r).length)
console.log(`key rank among the four values: 1st:${hist[0]} 2nd:${hist[1]} 3rd:${hist[2]} 4th:${hist[3]}`)
if (Math.max(...hist) > out.length / 2) console.log('WARNING: key rank is concentrated — that is a new tell.')
