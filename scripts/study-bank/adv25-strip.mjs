#!/usr/bin/env node
/** adv25-strip.mjs <frozen.batch.json> <out.batch.json> [--from N --to M] — copy of the frozen
 *  items (1-based positions N..M of the seeded order) with every author-only field deleted, for
 *  make-grade-render.mjs. Allow-list, so a new author field can never reach a grader. */
import { readFileSync, writeFileSync } from 'node:fs'
const [inp, out] = process.argv.slice(2)
const g = k => { const i = process.argv.indexOf(k); return i >= 0 ? Number(process.argv[i + 1]) : null }
const items = JSON.parse(readFileSync(inp, 'utf8'))
if (!Array.isArray(items) || !items.length || !out) { console.error('usage: adv25-strip.mjs <in> <out> [--from N --to M]'); process.exit(2) }
const from = g('--from') ?? 1, to = g('--to') ?? items.length
const KEEP = ['id', 'domain', 'subskill', 'difficulty', 'prompt', 'choices', 'correct_answer', 'explanation', 'solve', 'distractor_solve']
const sel = items.slice(from - 1, to).map(x => Object.fromEntries(KEEP.filter(k => k in x).map(k => [k, x[k]])))
writeFileSync(out, JSON.stringify(sel, null, 1) + '\n')
console.log(`${sel.length} items (positions ${from}-${to}) -> ${out}; kept fields ${KEEP.join(',')}`)
