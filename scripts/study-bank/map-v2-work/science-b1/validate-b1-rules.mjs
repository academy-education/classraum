#!/usr/bin/env node
/**
 * validate-b1-rules.mjs: points the B1 checks at REAL data with a known answer, the 36 pilot items and their graders'
 * findings, before the checks are trusted on batch 1 (CLAUDE.md: "a detector that cannot reproduce a known number on
 * known data has no business being pointed at unknown data").
 *
 *   node scripts/study-bank/map-v2-work/science-b1/validate-b1-rules.mjs
 *
 * The pilot items predate two B1 fields, so: `option_roles` is INFERRED from the wording (RESULT_WORDS), which tests the
 * lexicon itself; and LAW (prior_free) is excluded, because no pilot item could carry it. Everything else runs as is.
 * Prints, per B1 check, the items it fires on beside the items the graders named (dropped.json, g3/g4 keyed notes).
 * Exit 2 if the pilot files cannot be read; it never reports over zero items.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch, B1_CHECKS } from '../science-pilot/sci-check.mjs'
import { RESULT_WORDS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), PILOT = join(HERE, '../science-pilot')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const files = ['L', 'P', 'E'].map(c => join(PILOT, 'items', `${c}.json`))
if (files.some(f => !existsSync(f))) die('pilot item files missing')
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8'))).filter(i => !i.empty)
if (!items.length) die('zero pilot items')
const S = JSON.parse(readFileSync(join(PILOT, 'slots.json'), 'utf8')), SLOT = {}
for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) SLOT[r.id] = { ...r, area: v.area, author: c }

/** What the graders named (g3/g4 keyed notes and dropped.json), per B1 rule. Hand-transcribed 2026-10-27. */
const NAMED = {
  QUAL: ['MSP-L-10', 'MSP-P-04', 'MSP-P-11'],          // "trend keys carry the only extra qualifier"
  ROLE: ['MSP-L-06', 'MSP-P-07', 'MSP-E-12'],          // outcome options recognisable from wording
  LABEL: ['MSP-E-04', 'MSP-L-03'],                      // labels spell out the conditions
  NAMEPROP: ['MSP-E-11'],                               // place names encode height / slope
  ABS: [],                                              // named as a batch pattern, not per item
}
const fired = Object.fromEntries(B1_CHECKS.map(k => [k, []]))
for (const it of items) {
  const x = structuredClone(it)
  if (SLOT[x.id]?.format === 'variable' && !x.option_roles) x.option_roles = x.choices.map(c => (RESULT_WORDS.test(c) ? 'result' : 'setting'))
  const pr = checkItem(x, SLOT[x.id], [], { rules: 'b1', disabled: new Set(['LAW']) })
  for (const k of B1_CHECKS) if (pr.some(m => m.startsWith(k + ' '))) fired[k].push(x.id)
}
const batch = checkBatch(items, SLOT, { rules: 'b1', disabled: new Set(['LAW']) })
console.log(`pilot items read: ${items.length} (denominator); variable items with inferred option_roles: ${items.filter(i => SLOT[i.id]?.format === 'variable').length}`)
for (const k of B1_CHECKS.filter(k => k !== 'LAW' && k !== 'ABSDIS')) {
  const named = NAMED[k] ?? [], f = fired[k]
  const missed = named.filter(id => !f.includes(id)), extra = f.filter(id => !named.includes(id))
  console.log(`${k.padEnd(9)} fires on ${f.length}: ${f.join(', ') || '-'}`)
  console.log(`${''.padEnd(9)} graders named ${named.length}: ${named.join(', ') || '-'}  | missed ${missed.join(', ') || 'none'} | beyond the graders ${extra.join(', ') || 'none'}`)
}
const abs = batch.p.find(m => m.includes('absolutes appear on'))
console.log(`ABSDIS    ${abs ? 'fires: ' + abs : 'does not fire'}  (graders: "absolutes appear only on distractors in model-claim items")`)
console.log(`          ${batch.info.find(l => l.startsWith('claim items')) ?? ''}`)
