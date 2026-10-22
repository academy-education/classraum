import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { items as ab } from './items-ab.mjs'
import { items as cd } from './items-cd.mjs'
import { items as ef } from './items-ef.mjs'
const all = [...ab, ...cd, ...ef]
if (all.length !== 60) throw new Error('expected 60, got ' + all.length)
let s = createHash('sha256').update('isee-math-s18-2026-10-22').digest().readUInt32BE(0)
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const slots = sh(all.map((_, i) => i % 4))
const out = all.map((x, i) => {
  const ds = sh(Object.keys(x.distractors)); if (ds.length !== 3) throw new Error(x.id + ' needs 3 distractors')
  const choices = [...ds.slice(0, slots[i]), x.key, ...ds.slice(slots[i])]
  return { id: x.id, family: 'isee', section: 'math', domain: 'Math', subskill: x.subskill, difficulty: x.difficulty, prompt: x.prompt,
    choices, correct_answer: x.key, explanation: x.explanation, solve: x.solve, distractor_solve: x.distractors, forced: x.forced }
})
writeFileSync('isee-math-s18.batch.json', JSON.stringify(out, null, 1) + '\n')
const d = {}; out.forEach(o => d[o.difficulty] = (d[o.difficulty] || 0) + 1)
console.log(out.length, 'items', JSON.stringify(d), 'slots', [0, 1, 2, 3].map(k => slots.filter(x => x === k).length).join('/'))
