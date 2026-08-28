/**
 * check-batch-joins.mjs — deterministic batch-level joins that must run
 * BEFORE any attack fleet is spent.
 *
 * Each check exists because an agent found the defect late on 2026-08-28,
 * after authoring and attack agents had already been paid for:
 *
 *   1. DUPLICATE OPTION SETS (eoi-v5) — two items sharing an option set
 *      means solving one leaks its twin. Found by the pattern hunter.
 *   2. STEM COLLISIONS (ssat/isee verbal s2) — 8 items reused a stem
 *      already live in the bank. Found by an ad-hoc script after gates.
 *   3. OPTION-FAMILY KEY SKEW (dl-fresh-v2) — the bare email option was
 *      the key 0/7 while the room/number-specific option was 12/16.
 *      Found by the hunter + one join, AFTER a passing attack. This is
 *      the precision-asymmetry defect class, and it is arithmetic.
 *
 * Usage:
 *   node check-batch-joins.mjs <items.json> [--live <live-items.json>]
 *   node check-batch-joins.mjs --selftest
 *
 * items.json: [{ id, choices[], correct_answer, prompt? }]
 * Exit 1 on any FAIL. Families are regex-defined below; add families as
 * new option kinds appear — a family whose key rate deviates from chance
 * by more than the bar is a tell regardless of what the attack said.
 */
import { readFileSync } from 'node:fs'

const FAMILIES = [
  ['bare email channel', /\bemail(ing)?\b/i, /Room \d|ext\.|\d{3}-\d{4}/],
  ['phone channel', /\b(call|phone|ring)\b|\bext\.|\d{3}-\d{4}/i, null],
  ['room/number specific', /Room \d|ext\. ?\d|\d{3}-\d{4}/i, null],
  ['in-person channel', /\bin person\b|\bvisit\b|\bstop by\b|\bcounter\b|\bdesk\b/i, null],
]
// A family's key rate may exceed chance by at most this many items before
// it is called a tell (absolute, so tiny batches are not condemned by noise).
const SKEW_BAR = 3.0

const stemOf = p => {
  const m = String(p || '').match(/\[Synonym\]\s+([A-Z][A-Z-]+)/)
  return m ? m[1] : null
}

export function run(items, live = []) {
  const fails = [], warns = []

  // 1. duplicate option sets
  const bySig = {}
  for (const it of items) {
    const sig = [...(it.choices || [])].map(c => String(c).trim().toLowerCase()).sort().join('|')
    ;(bySig[sig] = bySig[sig] || []).push(it.id)
  }
  for (const g of Object.values(bySig)) {
    if (g.length > 1) fails.push(`duplicate option set: ${g.join(' ~ ')} (solving one leaks the other)`)
  }

  // 2. stem collisions (within batch and against live)
  const liveStems = new Set(live.map(i => stemOf(i.prompt)).filter(Boolean))
  const seen = new Map()
  for (const it of items) {
    const s = stemOf(it.prompt)
    if (!s) continue
    if (seen.has(s)) fails.push(`duplicate stem "${s}": ${seen.get(s)} ~ ${it.id}`)
    else seen.set(s, it.id)
    if (liveStems.has(s)) fails.push(`stem "${s}" (${it.id}) already live in the bank`)
  }

  // 3. option-family key skew
  for (const [name, re, exclude] of FAMILIES) {
    const match = c => re.test(String(c)) && !(exclude && exclude.test(String(c)))
    const present = items.filter(it => (it.choices || []).some(match))
    if (present.length < 5) continue
    const keyIs = present.filter(it => match(it.correct_answer)).length
    const chance = present.reduce((a, it) => a + it.choices.filter(match).length / it.choices.length, 0)
    const delta = keyIs - chance
    const line = `${name}: present ${present.length}, key ${keyIs}, chance ${chance.toFixed(1)} (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
    if (Math.abs(delta) > SKEW_BAR) fails.push(`option-family key skew — ${line}`)
    else warns.push(line)
  }

  return { fails, warns }
}

function selftest() {
  // dl-fresh-v2's measured shape: email never keyed, specific always keyed.
  const bad = Array.from({ length: 8 }, (_, i) => ({
    id: 'BAD' + i,
    choices: [`Email the office`, `Call Room ${i}01 on 555-01${i}0`, `Visit the desk in Room ${i}02`, `Write to the team`],
    correct_answer: `Call Room ${i}01 on 555-01${i}0`,
  }))
  const good = Array.from({ length: 8 }, (_, i) => ({
    id: 'GOOD' + i,
    choices: [`Email Ana at Room ${i}01`, `Call Ben at Room ${i}02`, `Visit Cal in Room ${i}03`, `Write to Dee in Room ${i}04`],
    correct_answer: [`Email Ana at Room ${i}01`, `Call Ben at Room ${i}02`, `Visit Cal in Room ${i}03`, `Write to Dee in Room ${i}04`][i % 4],
  }))
  const dup = [
    { id: 'D1', choices: ['a','b','c','d'], correct_answer: 'a' },
    { id: 'D2', choices: ['d','c','b','a'], correct_answer: 'b' },
  ]
  const r1 = run(bad), r2 = run(good), r3 = run(dup)
  if (!r1.fails.some(f => f.includes('key skew'))) { console.error('SELFTEST FAIL: family skew not caught'); process.exit(1) }
  if (r2.fails.length) { console.error('SELFTEST FAIL: balanced batch flagged —', r2.fails); process.exit(1) }
  if (!r3.fails.some(f => f.includes('duplicate option set'))) { console.error('SELFTEST FAIL: dup option set missed'); process.exit(1) }
  console.log('selftest OK — catches family skew and duplicate option sets, passes a balanced batch')
}

const arg = process.argv[2]
if (arg === '--selftest') { selftest(); process.exit(0) }
if (!arg) { console.error('usage: check-batch-joins.mjs <items.json> [--live <live.json>] | --selftest'); process.exit(1) }
const items = JSON.parse(readFileSync(arg, 'utf8'))
const li = process.argv.indexOf('--live')
const live = li > -1 ? JSON.parse(readFileSync(process.argv[li + 1], 'utf8')) : []
const { fails, warns } = run(items, live)
for (const w of warns) console.log(`  ok  ${w}`)
if (fails.length) { console.error('\nFAIL:'); for (const f of fails) console.error('  - ' + f); process.exit(1) }
console.log(`\nbatch joins clean over ${items.length} items`)
