#!/usr/bin/env node
/**
 * check-tolerance-pass.mjs [batch.json ...]
 *
 * Which items pass the sandbox ONLY because of the comparison tolerance?
 *
 * WHY. math-bank-helper's `answersMatch` compares numerically with
 * `Math.abs(a - b) < 1e-6`. That is correct and necessary for values like 1/3.
 * But it also means a `solve` field that computes a NUMERICAL APPROXIMATION
 * passes without ever verifying the item. Found 2026-09-24 on SM14A-19, whose
 * solve is a finite-difference limit:
 *
 *     var h=1e-7; ... return String(num(3+h)/((3+h)-3));   ->  15.000000199840144
 *
 * The key is 15 and the key is CORRECT -- but the sandbox confirmed a
 * difference quotient, not the removable discontinuity the item is about. A
 * check that passes for a reason unrelated to what it tests is the thing this
 * directory exists to catch, so it is worth knowing how often it happens.
 *
 * This reports the EXACT-vs-TOLERANCE split. A tolerance pass is not
 * automatically a defect -- a genuine 1/3 lands there too -- so the output
 * separates "exact", "clean rational" and "approximation", and only the last
 * is a finding.
 */
import { readFileSync } from 'node:fs'
/* The value parser is IMPORTED, not rewritten. Two earlier hand-rolled copies
 * in this directory each mis-read fractions -- one turned 11/6 into 116, the
 * other into 1 1/6 -- and the first draft of THIS file repeated the mistake,
 * reporting "2/3 vs 0.667" as a mismatch on a dozen sound items. */
import { val as asNum } from './check-key-magnitude.mjs'

/* Float noise from exact arithmetic (1e-14) is not an approximation. A
 * deliberate numerical method leaves a far larger residue -- a finite
 * difference at h=1e-7 lands around 2e-7. */
const NOISE = 1e-9

export function classify(item) {
  if (typeof item.solve !== 'string') return null
  let out
  try { out = Function('"use strict";' + item.solve)() } catch { return { kind: 'threw' } }
  const a = asNum(out), b = asNum(item.correct_answer)
  if (a === null || b === null) return { kind: String(out) === String(item.correct_answer) ? 'exact' : 'nonnumeric' }
  const diff = Math.abs(a - b)
  if (diff === 0) return { kind: 'exact', out }
  if (diff >= 1e-6) return { kind: 'MISMATCH', out, diff }
  if (diff < NOISE) return { kind: 'float-noise', out, diff }
  return { kind: 'APPROXIMATION', out, diff }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-tolerance-pass.mjs')
if (RUN_AS_CLI) {
  /* Self-test: the three classes must separate before this is pointed at data. */
  const T = [
    [{ solve: 'return String(15)', correct_answer: '15' }, 'exact'],
    [{ solve: 'var h=1e-7; return String((2*(3+h)*(3+h)+3*(3+h)-27)/h)', correct_answer: '15' }, 'APPROXIMATION'],
    [{ solve: 'return String(7)', correct_answer: '9' }, 'MISMATCH'],
    [{ solve: 'return String(2/3)', correct_answer: '2/3' }, 'exact'],
    [{ solve: 'return String(0.1+0.2)', correct_answer: '0.3' }, 'float-noise'],
  ]
  for (const [it, want] of T) {
    const got = classify(it)
    if (!got || got.kind !== want) { console.error(`SELF-TEST FAILED: got ${got && got.kind}, want ${want}`); process.exit(2) }
  }
  console.log('self-test: exact / approximation / mismatch separate correctly\n')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-tolerance-pass.mjs <batch.json ...>'); process.exit(2) }
  const tally = {}; const flagged = []
  let n = 0
  for (const f of files) {
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(a)) continue
    for (const x of a) {
      const r = classify(x); if (!r) continue
      n++; tally[r.kind] = (tally[r.kind] || 0) + 1
      if (r.kind === 'APPROXIMATION' || r.kind === 'MISMATCH') flagged.push({ f: f.replace(/^.*\//, ''), id: x.id, ...r })
    }
  }
  console.log(`items with a solve field: ${n}`)
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)}${v}`)
  if (flagged.length) {
    console.log('\nFLAGGED — passes the sandbox on tolerance, not on being right:')
    for (const x of flagged) console.log(`  ${x.f.replace('.batch.json','').padEnd(28)}${String(x.id).padEnd(12)}${x.kind}  computed ${x.out}`)
  } else console.log('\nnone flagged')
  process.exitCode = flagged.length ? 1 : 0
}
