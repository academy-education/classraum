#!/usr/bin/env node
/**
 * wic18-freeze.mjs — merge the four sat-cs-wic-v18 author folders into
 * sat-cs-wic-v18.batch.json: author-only fields stripped, stored choice order
 * dealt from a seeded balanced deck (10 keys per letter for 40 items), sha256
 * printed. Refuses (exit 2) unless every author has exactly 10 files and the
 * self-check passes with --final. Run once; nothing is repaired after freeze.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank', W = `${D}/sat-cs-wic-v18-work`, OUT = `${D}/sat-cs-wic-v18.batch.json`
if (existsSync(OUT) && !process.argv.includes('--force-rewrite-before-commit')) { console.error(`REFUSING: ${OUT} exists (frozen)`); process.exit(2) }
try { execFileSync('node', [`${D}/wic18-selfcheck.mjs`, '--final'], { stdio: 'inherit' }) } catch { console.error('REFUSING: self-check --final not green'); process.exit(2) }
const KEEP = ['id', 'domain', 'subskill', 'difficulty', 'topic_tag', 'passage', 'prompt', 'choices', 'correct_answer', 'explanation']
const items = []
for (const a of ['A', 'B', 'C', 'D']) {
  const fs = readdirSync(`${W}/${a}`).filter(f => /^WIC18[A-D]-\d\d\.json$/.test(f)).sort()
  if (fs.length !== 10) { console.error(`REFUSING: author ${a} has ${fs.length} files, not 10`); process.exit(2) }
  for (const f of fs) { const it = JSON.parse(readFileSync(`${W}/${a}/${f}`, 'utf8')); items.push(Object.fromEntries(KEEP.map(k => [k, it[k]]))) }
}
const rand = rng(20261190)
const L = ['A', 'B', 'C', 'D']
const deck = shuffleWith(items.map((_, i) => L[i % 4]), rand)
for (const [i, it] of items.entries()) {
  const want = L.indexOf(deck[i])
  const rest = shuffleWith(it.choices.filter(c => c !== it.correct_answer), rand)
  const ch = []; let q = 0
  for (let j = 0; j < 4; j++) ch.push(j === want ? it.correct_answer : rest[q++])
  it.choices = ch
}
writeFileSync(OUT, JSON.stringify(items, null, 2) + '\n')
const d = {}; for (const it of items) { const l = L[it.choices.indexOf(it.correct_answer)]; d[l] = (d[l] ?? 0) + 1 }
console.log(`frozen ${items.length} items -> ${OUT}  keys ${JSON.stringify(d)}  sha256 ${createHash('sha256').update(readFileSync(OUT)).digest('hex')}`)
