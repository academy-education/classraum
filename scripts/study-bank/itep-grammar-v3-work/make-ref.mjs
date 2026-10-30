#!/usr/bin/env node
/**
 * make-ref.mjs — writes ref-199.json, the dedupe reference for iTEP Grammar v3: every item now in the bank
 * (pilot 23 + v2 176, from the two staged batch files), reshaped to what dedupe.mjs reads
 * ({id, passage, correct_answer, category}). Exits 2 unless exactly --expect rows are read.
 *
 *   node scripts/study-bank/itep-grammar-v3-work/make-ref.mjs --expect 199
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const i = process.argv.indexOf('--expect'), expect = i >= 0 ? Number(process.argv[i + 1]) : NaN
const die = m => { console.error(`make-ref: ${m}`); process.exit(2) }
if (!Number.isInteger(expect)) die('--expect <n> required')
const rows = ['itep-grammar-v1.batch.json', 'itep-grammar-v2.batch.json'].flatMap(f => JSON.parse(readFileSync(join(HERE, '..', f), 'utf8')))
if (rows.length !== expect) die(`read ${rows.length} rows, expected ${expect}`)
const out = rows.map(r => ({ id: r.verify_meta.draft.qid, passage: r.item.passage, correct_answer: r.item.correct_answer, category: r.verify_meta.itep.category, part: r.domain }))
if (out.some(o => !o.id || !o.passage || !o.correct_answer || !o.category)) die('a row is missing id/passage/key/category')
writeFileSync(join(HERE, 'ref-199.json'), JSON.stringify(out, null, 1) + '\n')
console.log(`wrote ref-199.json: ${out.length} items (${out.filter(o => o.part.startsWith('Part 1')).length} Part 1, ${out.filter(o => o.part.startsWith('Part 2')).length} Part 2)`)
