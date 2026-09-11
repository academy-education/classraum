#!/usr/bin/env node
/**
 * ONE difficulty-acceptance rule, shared by every inserter.
 *
 * WHY IT EXISTS. On 2026-09-12 the four inserters disagreed, and none of
 * them said so:
 *
 *     accepts.mjs         (SAT R&W)        rejects easy
 *     math-bank-helper    (all 4 families) rejects easy
 *     verbal-bank-helper  (SSAT/ISEE)      NO difficulty gate at all
 *     toefl-bank-helper   (TOEFL)          NO difficulty gate at all
 *
 * So the same grade meant "dropped" or "banked" depending on which script
 * happened to own the section. That is not a policy, it is an accident.
 *
 * WHAT THE RULE ACTUALLY IS. The rationale recorded in the register is
 * "majority-easy items are dropped, not relabelled" — and it was written
 * about a batch COMMISSIONED AS HARD. An item briefed as hard that three
 * graders call easy has failed its brief, and banking it as easy launders
 * a failed commission into a bank row.
 *
 * That is a statement about the BRIEF, not about the bank. A bank with no
 * easy items is not a stricter bank, it is a broken one:
 *
 *   - assemble.ts:1267 routes a student to the SAT LOWER module by asking
 *     for `difficulties: ['easy']`. The lower module IS the easy band. A
 *     SAT bank with no easy items sends every weaker student the
 *     medium/hard module, which is not the adaptive test.
 *   - ACT Math is 45 questions of RISING difficulty that opens easy. SSAT
 *     and ISEE span roughly grades 5-11. Their forms are mixed by design.
 *
 * So the rule is one line, and it keys on the BAND THE BATCH WAS
 * COMMISSIONED FOR, never on the family:
 *
 *     BAND=hard   (default)  easy is rejected — the item missed its brief
 *     BAND=mixed             easy is accepted — the item hit its brief
 *
 * The default is the STRICT one. A gate that loosens when you forget to
 * pass something is not a gate; forgetting must cost you items, not
 * standards.
 */

const BANDS = new Set(['hard', 'mixed'])

/** Resolve the commissioned band, refusing anything it does not recognise. */
export function resolveBand(raw = process.env.BANK_BAND) {
  if (raw === undefined || raw === null || raw === '') return 'hard'
  const b = String(raw).toLowerCase()
  if (!BANDS.has(b)) {
    console.error(`BANK_BAND must be 'hard' or 'mixed', got '${raw}'.`)
    process.exit(2)
  }
  return b
}

/**
 * @returns {{ok: boolean, why?: string}}
 * `graded` is the GRADER's label, never the author's — the author's claim is
 * the thing being tested.
 */
export function acceptsDifficulty(graded, band = resolveBand()) {
  if (!['easy', 'medium', 'hard'].includes(graded)) {
    return { ok: false, why: `difficulty '${graded}' is not easy|medium|hard` }
  }
  if (band === 'mixed') return { ok: true }
  if (graded === 'easy') {
    return { ok: false, why: 'graded easy in a batch commissioned hard — the item missed its brief (BANK_BAND=mixed to accept)' }
  }
  return { ok: true }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('difficulty-policy.mjs')
if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  const cases = [
    ['hard',  'hard',   true,  'hard batch keeps hard'],
    ['hard',  'medium', true,  'hard batch keeps medium'],
    ['hard',  'easy',   false, 'hard batch DROPS easy — the brief was missed'],
    ['mixed', 'easy',   true,  'mixed batch keeps easy — the SAT lower module and ACT form openers need it'],
    ['mixed', 'medium', true,  'mixed batch keeps medium'],
    ['mixed', 'hard',   true,  'mixed batch keeps hard'],
    ['hard',  'HARD',   false, 'grade is case-sensitive; an unrecognised label is refused, not coerced'],
    ['hard',  undefined,false, 'a missing grade is refused rather than defaulted'],
  ]
  let bad = 0
  for (const [band, graded, want, name] of cases) {
    const got = acceptsDifficulty(graded, band).ok
    if (got !== want) { bad++; console.log(`FAIL  ${name}  (band=${band} graded=${graded} -> ${got})`) }
    else console.log(`ok    ${name}`)
  }
  // The default must be the strict one.
  const dflt = resolveBand(undefined)
  if (dflt !== 'hard') { bad++; console.log(`FAIL  default band is '${dflt}', must be 'hard'`) }
  else console.log('ok    default band is hard (forgetting the flag costs items, not standards)')
  console.log(bad ? '\nSELF-TEST FAILED' : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}
