#!/usr/bin/env node
/** algf26-order.mjs — the seeded grader order and stripped grader halves for sat-math-v26-algfull
 *  (PREREG-ALGF26-2026-10-08.md: "the frozen file is put in a seeded random order (seed 20261026)
 *  before the grader renders, so rule 11's later item is not decided by which author wrote first").
 *  Reads the frozen file, refuses on a count other than 48, writes:
 *    algf26.order.json                 the seeded order of ids (rule 11 "earlier/later")
 *    algf26.h1.stripped.json / .h2     halves in that order, author fields stripped (input to make-grade-render)
 *  Author fields stripped here: mechanism, quantity_asked, distractor_meta, cheap_bound_check,
 *  interior_parity_check, arith_class_check, bounds, self_audit, assigned. make-grade-render then
 *  withholds key, difficulty, explanation, solve paths and subskill. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank'
const f = `${D}/sat-math-v26-algfull.batch.json`
const b = JSON.parse(readFileSync(f, 'utf8'))
if (b.length !== 48) { console.error(`REFUSING: frozen file holds ${b.length}, expected 48`); process.exit(2) }
const AUTHOR = ['mechanism', 'quantity_asked', 'distractor_meta', 'cheap_bound_check', 'interior_parity_check', 'arith_class_check', 'bounds', 'self_audit', 'assigned']
const order = shuffleWith(b.slice(), rng(20261026))
const strip = it => Object.fromEntries(Object.entries(it).filter(([k]) => !AUTHOR.includes(k)))
writeFileSync(`${D}/algf26.order.json`, JSON.stringify(order.map(i => i.id), null, 1) + '\n')
writeFileSync(`${D}/algf26.h1.stripped.json`, JSON.stringify(order.slice(0, 24).map(strip), null, 1) + '\n')
writeFileSync(`${D}/algf26.h2.stripped.json`, JSON.stringify(order.slice(24).map(strip), null, 1) + '\n')
const left = order.map(strip).flatMap(o => Object.keys(o)).filter(k => AUTHOR.includes(k))
if (left.length) { console.error('REFUSING: author field survived the strip'); process.exit(2) }
console.log(`frozen sha ${createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16)}; order + halves 24/24 written`)
