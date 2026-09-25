#!/usr/bin/env node
/**
 * check-unique-residue.mjs <batch.json> [--live <family/section/domain>]
 *
 * REFUTED 2026-09-25, THE DAY IT WAS WRITTEN, BY ITS OWN BASE-RATE LINE.
 * On two of three batches the KEY is uniquely separated LESS often than a
 * RANDOM OPTION (78.6% vs 85.7%; 66.7% vs 69.4%). There is no signal here.
 * Read RESIDUE-PROXY-RESULT.md before touching this; it is kept only because
 * the base-rate machinery is reusable and because the negative is the point.
 *
 * PRE-FLIGHT, NOT A GATE. Is the KEY the unique option in some small residue
 * class? If it is, and the stem happens to imply that modulus, a solver strikes
 * all three distractors with one divisibility glance and no arithmetic.
 *
 * WHY IT EXISTS. Two graders on 2026-09-25 found 37 free strikes across two
 * maths batches whose authors had declared three between them, and the most
 * decisive were pure divisibility:
 *
 *   SM16L-10  two plans, 258+13m and 102+25m. All four options are 258+13m --
 *             the author protected that -- and exactly one is 102+25m.
 *             Three of three distractors, one glance.
 *   SM16L-09  L = 3S-8 with L+S=92, so (L+8) % 3 == 0. Kills two of three.
 *
 * Both are ARITHMETIC, and CLAUDE.md's standing exception says an arithmetic
 * defect gets an exact checker over the whole population rather than a
 * sampling attack. Authors have now missed this class five batches running.
 *
 * WHAT IT CANNOT DO, STATED UP FRONT. It does not read the stem, so it cannot
 * know whether the modulus it found is one the stem actually implies. It
 * therefore OVER-FIRES by construction and is useless as a gate: its job is to
 * hand a grader a short list of moduli to check against the prose. A fire is a
 * question, not a verdict, and the output says so on every line.
 *
 * THE FIRST VERSION OF THIS WAS WORTHLESS AND THE BASE RATE PROVED IT.
 * It tested every modulus 2..30 and fired on 14 of 14 Algebra items -- which
 * looked like a catastrophic finding until the base rate was measured: over
 * 20,000 random four-integer sets, SOME modulus <= 12 separates one member
 * 93-98% of the time, and some modulus <= 5 does it 80% of the time. Four
 * arbitrary integers are almost always separable. Firing on everything is not
 * a detector.
 *
 * THE RESTRICTION THAT MAKES IT REAL: only test moduli the STEM ACTUALLY
 * PRINTS. A solver can only apply `mod 25` if 25 is on the page. SM16L-10's
 * stem prints 13 and 25, so those are the two moduli in play, and exactly one
 * option is 102 + 25m. That is a real constraint and the base rate for it is
 * measured below rather than assumed.
 *
 * Scored, not asserted -- see the RECALL/PRECISION block printed at the end
 * when --known is passed, and the BASE RATE line, which is printed always.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const path = args.find(a => !a.startsWith('--'))
if (!path) { console.error('usage: check-unique-residue.mjs <batch.json> [--known id,id,...]'); process.exit(2) }
const ki = args.indexOf('--known')
const known = new Set(ki >= 0 ? String(args[ki + 1]).split(',').filter(Boolean) : [])

const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }

const val = s => {
  const t = String(s).trim().replace(/[$,%]/g, '')
  if (/^-?\d+$/.test(t)) return Number(t)
  return NaN                                   // integers only: a residue class on a non-integer is meaningless
}
/** true remainder, non-negative even for negative values */
const mod = (a, m) => ((a % m) + m) % m

const MAXMOD = 30
/** The integers a solver can actually see on the page. Only these can be used
 *  as a modulus, and only these make a divisibility strike free. */
const stemInts = it => {
  const text = [it.prompt, it.passage].filter(Boolean).join(' ')
  const out = new Set()
  for (const m of text.matchAll(/-?\d+/g)) {
    const n = Math.abs(Number(m[0]))
    if (n >= 2 && n <= MAXMOD) out.add(n)
  }
  return [...out].sort((a, b) => a - b)
}
const rows = []
let scored = 0, skipped = 0
for (const it of batch) {
  const opts = (it.choices ?? []).map(String)
  const nums = opts.map(val)
  if (nums.some(n => !Number.isInteger(n))) { skipped++; continue }
  const keyIdx = opts.findIndex(o => o === String(it.correct_answer))
  if (keyIdx < 0) { console.error(`REFUSING: ${it.id} — correct_answer is not among its choices.`); process.exit(2) }
  scored++
  const moduli = stemInts(it)
  const hits = []
  for (const m of moduli) {
    const r = mod(nums[keyIdx], m)
    const same = nums.filter(n => mod(n, m) === r).length
    if (same === 1) hits.push(m)
  }
  // Report the SMALLEST separating modulus and how many there are. A large m
  // separating four arbitrary integers is near-certain and means nothing; a
  // small one is the kind a stem can plausibly imply.
  if (hits.length) rows.push({ id: it.id, smallest: hits[0], hits, count: hits.length, key: opts[keyIdx], opts, moduli })
}
console.log(`${path.replace(/^.*\//,'')}: ${scored} all-integer option sets scored, ${skipped} skipped (non-integer options)`)
if (!scored) { console.error('REFUSING: nothing scorable — a rate over zero items is not a result.'); process.exit(2) }

console.log(`  key uniquely separated by a modulus PRINTED IN ITS OWN STEM: ${rows.length}/${scored}`)
for (const r of rows.sort((a,b)=>a.smallest-b.smallest)) {
  console.log(`      ${r.id}  mod ${r.hits.join('/')}  key ${String(r.key).padStart(6)}  set {${r.opts.join(', ')}}   stem offers {${r.moduli.join(', ')}}`)
}
// BASE RATE for THIS version, computed on this batch's own stems: shuffle which
// option is treated as the key and see how often a stem modulus separates it.
// If a random option separates as often as the real key, the fire means nothing.
{
  let k = 0, n = 0
  for (const it of batch) {
    const nums = (it.choices ?? []).map(String).map(val)
    if (nums.some(x => !Number.isInteger(x))) continue
    const moduli = stemInts(it)
    for (const cand of nums) { n++
      if (moduli.some(m => nums.filter(x => mod(x, m) === mod(cand, m)).length === 1)) k++ }
  }
  console.log(`\n  BASE RATE on this batch: a RANDOM option is uniquely separated by a stem modulus ${k}/${n} = ${(100*k/n).toFixed(1)}% of the time.`)
  console.log(`  Compare that with the key's ${rows.length}/${scored} = ${(100*rows.length/scored).toFixed(1)}%. If the two are close, this check is reading nothing.`)
}
console.log(`\n  A fire is a QUESTION for the grader — "does the stem imply mod n?" — never a verdict.`)
if (known.size) {
  const fired = new Set(rows.map(r => r.id))
  const hit = [...known].filter(id => fired.has(id))
  const fp = [...fired].filter(id => !known.has(id))
  console.log(`\n  SCORED against ${known.size} item(s) a grader independently found a divisibility strike on:`)
  console.log(`    recall    ${hit.length}/${known.size}  (${hit.join(', ') || 'none'})`)
  console.log(`    also fired on ${fp.length} item(s) the grader did not flag: ${fp.join(', ') || 'none'}`)
  console.log(`    precision ${fired.size ? (100*hit.length/fired.size).toFixed(0) + '%' : 'n/a'} — read this as the over-fire rate, which is expected and by design.`)
}
