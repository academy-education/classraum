#!/usr/bin/env node
/**
 * check-median-key.mjs — is the key the MEDIAN of its own numeric options?
 *
 * READ ONLY. Refuses rather than returning a number on unreadable input.
 *
 * Proposed 2026-09-21 by a blind solver attacking SSAT maths, as a reason
 * its own picks might be scoring above chance for the wrong reason:
 *
 *   "distractors built by doubling/halving/sign-flipping around a key
 *    naturally bracket the key, which puts the key at the median BY
 *    CONSTRUCTION. If a median-picker beats 20% the distractor generator
 *    is the problem, not any individual item."
 *
 * That is decidable, so it is measured exactly over whole cohorts rather
 * than sampled, against a control derived from the data — with an odd
 * number of distinct values the median is one option, so a set that
 * carries no information returns exactly 1/n.
 *
 *   node check-median-key.mjs <batch.json> [...]
 */
import { readFileSync } from 'node:fs'

const valueOf = o => {
  const s = String(o).replace(/−/g, '-').replace(/[$,%\s]/g, '')
  const frac = s.match(/^(-?\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const nums = s.match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length !== 1) return null
  const n = Number(nums[0])
  return Number.isFinite(n) ? n : null
}

export function scoreItem(choices, key) {
  const vals = choices.map(valueOf)
  if (vals.some(v => v === null)) return null          // not a numeric set
  if (new Set(vals).size !== vals.length) return null  // ties make "median" ambiguous
  const keyIdx = choices.indexOf(key)
  if (keyIdx < 0) return null
  const sorted = [...vals].sort((a, b) => a - b)
  /* Even counts have no single median option; only score odd sets, which
   * is the case the solver's argument is about (five choices). */
  if (vals.length % 2 === 0) return null
  const med = sorted[(vals.length - 1) / 2]
  return { hit: vals[keyIdx] === med, n: vals.length }
}

/* CLI only when RUN DIRECTLY. Without this guard importing the module to
 * self-test it fires the CLI, prints a usage line and exits — which is how
 * this file came to be pointed at the live bank before its own fixtures had
 * ever passed. A detector that cannot reproduce a known answer has no
 * business reporting an unknown one. */
const RUN_AS_CLI = import.meta.url === `file://${process.argv[1]}`

if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  const cases = [
    ['key at the median', ['10', '20', '30', '40', '50'], '30', true],
    ['key at the low end', ['10', '20', '30', '40', '50'], '10', false],
    ['halve/double bracket puts the key at the median', ['12', '24', '48', '6', '3'], '12', true],
    ['non-numeric set is not scorable', ['red', 'blue', 'green', 'pink', 'grey'], 'red', null],
    ['tied values make the median ambiguous', ['10', '10', '30', '40', '50'], '30', null],
    ['even option count has no single median', ['10', '20', '30', '40'], '20', null],
    ['fractions parse', ['1/2', '1/4', '3/4', '1/8', '7/8'], '1/2', true],
    ['negatives order correctly', ['-5', '-12', '-19', '-1', '-30'], '-12', true],
  ]
  let bad = 0
  for (const [name, ch, key, expected] of cases) {
    const r = scoreItem(ch, key)
    const got = r === null ? null : r.hit
    if (got !== expected) bad++
    console.log(`${got === expected ? 'ok  ' : 'FAIL'}  ${name} -> ${got}`)
  }
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

const files = RUN_AS_CLI ? process.argv.slice(2) : []
if (RUN_AS_CLI && !files.length) { console.error('usage: check-median-key.mjs <batch.json> ... | --selftest'); process.exit(2) }
for (const f of files) {
  let b
  try { b = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING ${f}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING ${f}: zero items`); process.exit(2) }
  let scored = 0, hits = 0, control = 0
  for (const it of b) {
    const r = scoreItem(it.choices ?? [], it.correct_answer)
    if (!r) continue
    scored++; if (r.hit) hits++
    control += 1 / r.n           // derived: a median-picker on an uninformative set
  }
  const name = f.replace(/^.*\//, '')
  if (!scored) { console.log(`${name.padEnd(42)} NO MEASUREMENT (no scorable numeric sets)`); continue }
  const rate = 100 * hits / scored, ctl = 100 * control / scored
  console.log(`${name.padEnd(42)} scorable ${String(scored).padStart(4)}  key-is-median ${rate.toFixed(1)}%  vs control ${ctl.toFixed(1)}%  margin ${(rate - ctl >= 0 ? '+' : '') + (rate - ctl).toFixed(1)}pts`)
}
