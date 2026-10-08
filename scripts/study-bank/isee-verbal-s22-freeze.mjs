#!/usr/bin/env node
/**
 * isee-verbal-s22-freeze.mjs — merge the s22 author files (s21 freeze, s22 plan) into the two frozen
 * per-type files, strip author-only fields, deal the stored key slot from a
 * seeded BALANCED deck (flat per type, not round-robin, so the sequence check
 * in verify-answer-key-spread sees no period), and print the sha256 of each.
 *
 *   node scripts/study-bank/isee-verbal-s22-freeze.mjs [--dry]
 *
 * Refuses (exit 2) if any author file is missing, short of its commissioned
 * count, or carries an item of the wrong kind. Run once; the outputs are what
 * gets committed as the freeze. No item is edited here beyond choice order.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const DIR = 'scripts/study-bank'
const PLAN = {
  syn: { files: { d: 13, e: 12 }, kind: 'synonym', seed: 20261151 },
  sc: { files: { a: 15, b: 15, c: 15 }, kind: 'sentence completion', seed: 20261152 },
}
const STRIP = ['rarity_order', 'gloss_of', 'polarity', 'antonym_pairs', 'selfcheck']
const dry = process.argv.includes('--dry')

for (const [type, plan] of Object.entries(PLAN)) {
  const merged = []
  for (const [letter, want] of Object.entries(plan.files)) {
    const p = `${DIR}/isee-verbal-s22${letter}.batch.json`
    if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
    const b = JSON.parse(readFileSync(p, 'utf8'))
    if (!Array.isArray(b) || b.length !== want) { console.error(`REFUSING: ${p} holds ${b?.length} items, commissioned ${want}`); process.exit(2) }
    for (const it of b) if (it.kind !== plan.kind) { console.error(`REFUSING: ${it.id} kind ${it.kind} in a ${type} file`); process.exit(2) }
    merged.push(...b)
  }
  const rand = rng(plan.seed)
  const deck = shuffleWith(Array.from({ length: merged.length }, (_, i) => i % 4), rand)
  const out = merged.map((it, i) => {
    const o = { ...it }
    for (const f of STRIP) delete o[f]
    const key = it.correct_answer
    const rest = shuffleWith(it.choices.filter(c => c !== key), rand)
    const ch = []; let r = 0
    for (let s = 0; s < 4; s++) ch.push(s === deck[i] ? key : rest[r++])
    o.choices = ch
    return o
  })
  // break-check the deal: every key still among its choices, slot counts flat
  const slots = [0, 0, 0, 0]
  for (const it of out) { const k = it.choices.indexOf(it.correct_answer); if (k < 0) { console.error(`REFUSING: ${it.id} lost its key`); process.exit(2) } slots[k]++ }
  const path = `${DIR}/isee-verbal-s22-${type}.batch.json`
  const text = JSON.stringify(out, null, 1) + '\n'
  if (!dry) writeFileSync(path, text)
  console.log(`${type}: ${out.length} items, key slots ${slots.join('/')}, sha256 ${createHash('sha256').update(text).digest('hex')}${dry ? ' (dry, not written)' : ` -> ${path}`}`)
}
