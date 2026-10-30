// build-m1.mjs: M1 method-duplicate packet (prereg: two agents over halves, four s16 plants with opaque ids).
// Writes m1/m1-candidates.json (opaque Q ids, prompt, choices, key), m1/m1.key.json (Q -> id, NOT for agents),
// m1/live-isee-ssat.json. Exits 2 if the batch or the plants are missing.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = new URL('.', import.meta.url).pathname
const B = JSON.parse(readFileSync(D + 'isee-math-s19.batch.json', 'utf8'))
const plants = JSON.parse(readFileSync(D + '../isee-math-s17.m1.json', 'utf8')).plants
if (B.length < 100 || plants.length !== 5) { console.error('REFUSING: batch ' + B.length + ', plants ' + plants.length); process.exit(2) }
const all = [...B.map(b => ({ src: b.id, prompt: b.prompt, choices: b.choices, correct_answer: b.correct_answer })), ...plants.map(p => ({ src: 'PLANT:' + p.id, prompt: p.prompt, choices: p.choices, correct_answer: p.correct_answer }))]
let s = createHash('sha256').update('isee-math-s19-m1-1').digest().readUInt32BE(0)
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
const key = {}, cands = all.map((x, i) => { const q = 'Q' + String(i + 1).padStart(3, '0'); key[q] = x.src; return { id: q, prompt: x.prompt, choices: x.choices, correct_answer: x.correct_answer } })
const half = Math.ceil(cands.length / 2)
const ph = [0, 0]; for (const [q, src] of Object.entries(key)) if (src.startsWith('PLANT')) ph[+q.slice(1) > half ? 1 : 0]++
writeFileSync(D + 'm1/m1-candidates.json', JSON.stringify(cands, null, 1) + '\n')
writeFileSync(D + 'm1/m1.key.json', JSON.stringify(key, null, 1) + '\n')
const live = JSON.parse(readFileSync(D + 'dump/live-maths.json', 'utf8')).filter(r => r.family === 'isee' || r.family === 'ssat').map(r => ({ id: r.id.slice(0, 8), family: r.family, prompt: r.prompt, choices: r.choices, key: r.correct_answer }))
writeFileSync(D + 'm1/live-isee-ssat.json', JSON.stringify(live) + '\n')
console.log(`${cands.length} items (${B.length} candidates + ${plants.length} plant items); half 1 = Q001-Q${String(half).padStart(3, '0')}, half 2 = the rest; plant items per half ${ph.join('/')}; live isee+ssat rows ${live.length}`)
