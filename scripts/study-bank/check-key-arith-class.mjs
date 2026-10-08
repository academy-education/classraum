#!/usr/bin/env node
/**
 * check-key-arith-class.mjs <expectedCount> <items.json>
 *
 * READING LIST, not a gate. For each four-choice numeric item, lists every
 * simple arithmetic class in which exactly ONE option is a member, and says
 * whether that lone member is the key. Written for act-math-v22 (2026-10-08)
 * after act-math-v21 was held on two option shapes:
 *   AM21A-05: 90 the only multiple of 15 when the stem forces the sum to be 15x
 *   AM21A-03: 72/4, 72/3, 72/9, 72/10 — a grid pattern; THIS SCRIPT CANNOT SEE
 *             a grid (it is not class membership); that is a grader field.
 *
 * Classes: integer; multiple of d (d = 2..30, integers only); perfect square;
 * perfect cube; positive; negative. Being the lone member of SOME class happens
 * by chance, so the script prints the rate for keys AND for distractors (a key
 * should be lone-in-class no more often than a distractor), and is meant to be
 * run on a live control too. What is banned is a class THE STEM IMPLIES — only
 * a hand read of the stem can decide that.
 *
 * Input: an array of { id, choices[4], correct_answer } (a batch file works).
 * Refuses (exit 2): unreadable input, count != expected, an item without 4
 * choices or with the key absent, or fewer than 1 parseable numeric item.
 *
 * Break-test (2026-10-08, before v22 authoring): on act-math-v21.batch.json
 * AM21A-05 must list "multiple of 15 -> KEY"; `--selftest` asserts it.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const selftest = args[0] === '--selftest'
const [expected, path] = selftest ? ['5', 'scripts/study-bank/act-math-v21.batch.json'] : args
if (!expected || !path) { console.error('usage: check-key-arith-class.mjs <expectedCount> <items.json> | --selftest'); process.exit(2) }
let items
try { items = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${path}: ${e.message}`); process.exit(2) }
if (!Array.isArray(items) || items.length !== Number(expected)) { console.error(`REFUSING: read ${Array.isArray(items) ? items.length : 'non-array'} items, expected ${expected}`); process.exit(2) }

const num = s => {
  const t = String(s).replace(/[,$%\s]/g, '').replace(/−/g, '-')
  let m = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
  if (m) return Number(m[1]) / Number(m[2])
  m = t.match(/^-?\d+(?:\.\d+)?$/)
  return m ? Number(t) : NaN
}
const isInt = v => Math.abs(v - Math.round(v)) < 1e-9
const classes = []
classes.push(['integer', v => isInt(v)])
for (let d = 2; d <= 30; d++) classes.push([`multiple of ${d}`, v => isInt(v) && Math.round(v) !== 0 && Math.round(v) % d === 0])
classes.push(['perfect square', v => isInt(v) && v > 0 && isInt(Math.sqrt(v))])
classes.push(['perfect cube', v => isInt(v) && v !== 0 && isInt(Math.cbrt(Math.abs(v)))])
classes.push(['positive', v => v > 0])
classes.push(['negative', v => v < 0])

let scored = 0, keyLone = 0, distLone = 0, distN = 0
const lines = []
for (const it of items) {
  if (!Array.isArray(it.choices) || it.choices.length !== 4) { console.error(`REFUSING: ${it.id} does not have 4 choices`); process.exit(2) }
  const key = String(it.correct_answer)
  if (!it.choices.map(String).includes(key)) { console.error(`REFUSING: ${it.id} key absent from choices`); process.exit(2) }
  const vals = it.choices.map(c => [String(c), num(c)])
  if (vals.some(([, v]) => !Number.isFinite(v))) { lines.push(`  ${it.id}  not numeric — skipped (${it.choices.join(' | ')})`); continue }
  scored++
  const lone = new Map(vals.map(([s]) => [s, []]))
  for (const [name, f] of classes) {
    const mem = vals.filter(([, v]) => f(v))
    if (mem.length === 1) lone.get(mem[0][0]).push(name)
  }
  for (const [s, cl] of lone) {
    if (s === key) { if (cl.length) keyLone++ } else { distN++; if (cl.length) distLone++ }
  }
  const kc = lone.get(key)
  lines.push(`  ${it.id}  [${it.choices.join(' | ')}] key ${key}` + (kc.length ? `  KEY lone in: ${kc.join(', ')}` : '  key lone in: none')
    + [...lone].filter(([s, c]) => s !== key && c.length).map(([s, c]) => `\n      distractor ${s} lone in: ${c.join(', ')}`).join(''))
}
if (!scored) { console.error('REFUSING: no numeric item to score'); process.exit(2) }
console.log(`input ${path}: ${items.length} items, scorable ${scored} of ${items.length}`)
console.log(lines.join('\n'))
console.log(`key lone in some class: ${keyLone}/${scored} = ${(100 * keyLone / scored).toFixed(1)}%   distractor: ${distLone}/${distN} = ${(100 * distLone / distN).toFixed(1)}%`)
console.log('READING LIST: each KEY line is checked by hand — does the STEM imply that class?')

if (selftest) {
  const ok = lines.some(l => l.includes('AM21A-05') && /KEY lone in:[^\n]*multiple of 15\b/.test(l))
  console.log(ok ? 'SELFTEST PASS: AM21A-05 key lone in multiple of 15' : 'SELFTEST FAIL')
  process.exit(ok ? 0 : 1)
}
