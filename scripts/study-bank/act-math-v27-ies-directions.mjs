#!/usr/bin/env node
/**
 * act-math-v27-ies-directions.mjs [--selftest] <batch.json>
 *
 * Stage-0 MECHANICAL check for act-math-v27 (ACT-MATH-V27-PREREGISTERED.md).
 *
 * v26 lost 4 of its 5 IES drops to rule 8: conversion chains where each stated
 * rule (1,024 MB per GB, the 90% data share, an inclusive day count, the 3/4
 * measures) moved the answer one way a student can READ off the stem. Errors at
 * different steps were not enough. v27 asks IES authors to build setups whose
 * natural errors push BOTH ways and to DECLARE it per item, in a field this
 * script checks against the item's own numbers:
 *
 *   direction_declaration: {
 *     "<each distractor>": { step, error_type, direction: "over"|"under" },
 *     counter_error: { step, error_type, solve: "<JS body>", direction }   // required when the key is extreme
 *     stated_rules: [ { rule, neglect_direction: "over"|"under"|"none" } ]
 *   }
 *   error_type is one of: sign slip | inverted rate | wrong base | omission | other: <label>
 *
 * Checks (each a stage-0 RETURN when it fails; the declaration is stripped
 * before grading and the graders test the claim independently):
 *   D1  every distractor declared, and its declared direction matches its value
 *       against the key (over = above the key)
 *   D2  >= 2 distinct error_types among the three distractors, at least one of
 *       sign slip / inverted rate / wrong base, and at most ONE omission
 *   D3  BOTH directions among the natural errors: an interior key has
 *       distractors on both sides by value; an extreme key needs a
 *       counter_error whose solve evaluates to a finite number strictly on the
 *       OTHER side of the key, not equal to any option, declared that way
 *   D4  no "every stated rule adds" chain: when >= 2 stated_rules have a neglect
 *       direction, they may not all be the same direction
 *   D5  READING LIST, every item (not only IES): a distractor equal to the KEY
 *       re-read in another display, k = h + f read as h.mm (minutes) or the
 *       reverse, at the option's own decimal places (v26 A-08 9.37 / 9.62, I-09
 *       32.37 / 32.62). Break-test on v24-v26: 7 hits, 2 real (both dropped by
 *       the graders) and 5 numeric coincidences on non-time quantities (a
 *       probability, a cube-root solution). So a D5 line is READ: on an item whose
 *       quantity is in hours/minutes/seconds it is a return; otherwise recorded.
 * Non-IES items get D5 only. Exit 1 if any D1-D4 check fails (D5 never sets the
 * exit code), 2 if it cannot read or score its input.
 */
import { readFileSync } from 'node:fs'

const IES = 'Integrating Essential Skills'
const TYPES = ['sign slip', 'inverted rate', 'wrong base', 'omission']
const num = s => {
  const t = String(s).replace(/[,$%\s]/g, '').replace(/−/g, '-')
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  const f = t.match(/^(-?\d+)\/(\d+)$/); if (f) return Number(f[1]) / Number(f[2])
  return null
}
const dp = s => { const m = String(s).replace(/,/g, '').match(/\.(\d+)$/); return m ? m[1].length : 0 }
const typeOf = t => { const s = String(t || '').toLowerCase().trim(); return TYPES.find(x => s === x) || (s.startsWith('other') ? 'other' : null) }

export function displaySlips(item) {
  const k = num(item.correct_answer); const out = []
  if (k === null) return out
  for (const c of item.choices || []) {
    if (String(c) === String(item.correct_answer)) continue
    const d = num(c); if (d === null) continue
    const p = dp(c); if (p < 1) continue
    const h = Math.trunc(k), f = Math.abs(k - h)
    const asMin = h + Math.sign(k || 1) * f * 0.6          // 9.62 h read as 9 h 37 min -> "9.37"
    const asDec = h + Math.sign(k || 1) * f / 0.6          // 9.37 read as 9 h 37 min -> 9.617
    for (const [lab, v] of [['key as h.mm', asMin], ['key h.mm as decimal', asDec]]) {
      if (Math.abs(v - k) < 1e-9) continue
      if (Number(v.toFixed(p)) === d) out.push(`D5 ${c} = ${lab} of key ${item.correct_answer}`)
    }
  }
  return out
}

export function check(item) {
  const out = []
  out.push(...displaySlips(item))
  if (item.domain !== IES) return out
  const k = num(item.correct_answer)
  const vals = (item.choices || []).map(num)
  if (k === null || vals.some(v => v === null)) { out.push('UNSCORABLE: non-numeric options'); return out }
  const dd = item.direction_declaration
  if (!dd || typeof dd !== 'object') { out.push('D1 direction_declaration missing'); return out }
  const dis = item.choices.map(String).filter(c => c !== String(item.correct_answer))
  const types = []
  for (const c of dis) {
    const e = dd[c]
    if (!e) { out.push(`D1 distractor ${c} not declared`); continue }
    const want = num(c) > k ? 'over' : 'under'
    if (e.direction !== want) out.push(`D1 ${c} declared ${e.direction}, value is ${want} the key`)
    const t = typeOf(e.error_type); if (!t) out.push(`D2 ${c} error_type "${e.error_type}" not in the list`); else types.push(t)
  }
  if (types.length === 3) {
    if (new Set(types).size < 2) out.push(`D2 one error_type on all three (${types[0]})`)
    if (!types.some(t => ['sign slip', 'inverted rate', 'wrong base'].includes(t))) out.push('D2 no sign slip / inverted rate / wrong base among the distractors')
    if (types.filter(t => t === 'omission').length > 1) out.push(`D2 ${types.filter(t => t === 'omission').length} omissions`)
  }
  const sorted = [...vals].sort((a, b) => a - b)
  const extreme = k === sorted[0] ? 'min' : k === sorted[3] ? 'max' : null
  if (extreme) {
    const ce = dd.counter_error
    if (!ce || !ce.solve) out.push(`D3 key is the ${extreme === 'min' ? 'smallest' : 'largest'} and no counter_error (with solve) is declared`)
    else {
      let v
      try { v = Number(new Function('"use strict";' + ce.solve)()) } catch (e) { out.push(`D3 counter_error solve throws: ${e.message}`) }
      if (v !== undefined) {
        const want = extreme === 'min' ? 'under' : 'over'
        if (!Number.isFinite(v)) out.push('D3 counter_error solve is not finite')
        else if (extreme === 'min' ? !(v < k) : !(v > k)) out.push(`D3 counter_error ${v} is not on the other side of the key ${k}`)
        else if (vals.some(x => Math.abs(x - v) < 1e-9)) out.push(`D3 counter_error ${v} equals an option`)
        if (ce.direction !== want) out.push(`D3 counter_error declared ${ce.direction}, must be ${want}`)
        if (!typeOf(ce.error_type)) out.push(`D3 counter_error error_type "${ce.error_type}" not in the list`)
      }
    }
  }
  const sr = Array.isArray(dd.stated_rules) ? dd.stated_rules : null
  if (!sr) out.push('D4 stated_rules missing (list every stated rule/conversion/condition, [] if none)')
  else {
    const dirs = sr.map(r => r.neglect_direction).filter(d => d === 'over' || d === 'under')
    if (dirs.length >= 2 && new Set(dirs).size === 1) out.push(`D4 every stated rule pushes ${dirs[0]} when neglected (${dirs.length} rules)`)
  }
  return out
}

function selftest() {
  let bad = 0
  const exp = (it, want, label) => { const r = check(it); const ok = want === null ? r.length === 0 : r.some(x => x.startsWith(want)); if (!ok) { bad++; console.error(`FAIL ${label}`, r) } }
  const base = {
    domain: IES, choices: ['10.2', '11.6', '12.4', '13.9'], correct_answer: '11.6',
    direction_declaration: {
      '10.2': { step: 'rate', error_type: 'inverted rate', direction: 'under' },
      '12.4': { step: 'percent', error_type: 'wrong base', direction: 'over' },
      '13.9': { step: 'sum', error_type: 'omission', direction: 'over' },
      stated_rules: [{ rule: 'tax 8%', neglect_direction: 'under' }, { rule: 'discount 10%', neglect_direction: 'over' }],
    },
  }
  exp(base, null, 'clean interior IES item')
  exp({ ...base, direction_declaration: { ...base.direction_declaration, '10.2': { ...base.direction_declaration['10.2'], direction: 'over' } } }, 'D1', 'wrong declared direction')
  exp({ ...base, direction_declaration: { ...base.direction_declaration, '10.2': { step: 'x', error_type: 'omission', direction: 'under' } } }, 'D2', 'two omissions')
  const ext = { ...base, correct_answer: '10.2', direction_declaration: { '11.6': { step: 'a', error_type: 'sign slip', direction: 'over' }, '12.4': { step: 'b', error_type: 'wrong base', direction: 'over' }, '13.9': { step: 'c', error_type: 'omission', direction: 'over' }, stated_rules: [] } }
  exp(ext, 'D3', 'extreme key without a counter error')
  exp({ ...ext, direction_declaration: { ...ext.direction_declaration, counter_error: { step: 'd', error_type: 'inverted rate', solve: 'return 9.1', direction: 'under' } } }, null, 'extreme key with a counter error below')
  exp({ ...ext, direction_declaration: { ...ext.direction_declaration, counter_error: { step: 'd', error_type: 'inverted rate', solve: 'return 10.9', direction: 'under' } } }, 'D3', 'counter error on the same side')
  exp({ ...base, direction_declaration: { ...base.direction_declaration, stated_rules: [{ rule: '1024 MB/GB', neglect_direction: 'under' }, { rule: '90% share', neglect_direction: 'under' }] } }, 'D4', 'v26 I-09: every stated rule shrinks it')
  exp({ domain: 'Algebra', choices: ['9.37', '9.62', '9.57', '9.75'], correct_answer: '9.62' }, 'D5', 'v26 A-08 9.37 = 9.62 h as h.mm')
  exp({ domain: 'Algebra', choices: ['32.29', '31.85', '32.37', '32.62'], correct_answer: '32.62' }, 'D5', 'v26 I-09 32.37')
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 9/9')
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
const p = args.find(a => !a.startsWith('--'))
if (!p) { console.error('usage: act-math-v27-ies-directions.mjs <batch.json>'); process.exit(2) }
let items
try { items = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
let ies = 0, fail = 0, d5 = 0
for (const it of items) {
  if (it.domain === IES) ies++
  const r = check(it)
  if (r.some(x => x.startsWith('D5'))) d5++
  for (const x of r) console.log(`  ${it.id}  ${x}${x.startsWith('D5') ? '   (reading list)' : ''}`)
  if (r.some(x => !x.startsWith('D5'))) fail++
}
console.log(`${p.replace(/^.*\//, '')}: ${items.length} items (IES ${ies}); items failing D1-D4 ${fail}; key display slips to read (D5) ${d5}`)
process.exit(fail ? 1 : 0)
