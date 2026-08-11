/**
 * The TOEFL Listening blueprint has to balance, and the comment above it
 * saying so is not evidence that it does.
 *
 * On 2026-08-11 Choose a Response was cut from 14 delivered to 6 —
 * both instruments agree students answer it without the audio — and the
 * 8 freed slots went to Conversation and Academic Talk. That is nine
 * numbers changed across three tasks, each of which must keep the
 * per-path delivered total at 48 and the scored totals at 20/15/15.
 *
 * WHY THIS READS THE SOURCE TEXT rather than importing the table.
 * assemble.ts pulls in the Supabase admin client and the `ai` SDK at
 * module scope; both throw under jest, and the first two attempts at
 * this file died at IMPORT reporting "Tests: 0 total" while every other
 * suite printed its passes — the green-looking failure CLAUDE.md
 * describes, reproduced twice in five minutes. Mocking each link is a
 * rabbit hole, and exporting the constant for the test's benefit made
 * assemble.ts carry a comment about a test that then stopped importing
 * it.
 *
 * Parsing the literal is the honest trade: it reads the REAL numbers
 * from the REAL file, so it cannot drift. The cost is that a
 * restructure of the block would stop matching — which is why the row
 * count is asserted FIRST. Finding nothing must fail, never pass.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')

interface Row {
  task: string
  n: number; m1: number; lower: number; upper: number
  sM1: number; sLower: number; sUpper: number
}

const ROW_RE =
  /\{\s*type:\s*'multiple_choice',\s*task:\s*'(choose_response|conversation|announcement|academic_talk)',\s*n:\s*(\d+),\s*m1:\s*(\d+),\s*lower:\s*(\d+),\s*upper:\s*(\d+),\s*sM1:\s*(\d+),\s*sLower:\s*(\d+),\s*sUpper:\s*(\d+)\s*\}/g

const rows: Row[] = [...SRC.matchAll(ROW_RE)].map(m => ({
  task: m[1]!,
  n: +m[2]!, m1: +m[3]!, lower: +m[4]!, upper: +m[5]!,
  sM1: +m[6]!, sLower: +m[7]!, sUpper: +m[8]!,
}))

const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0)
const by = (t: string) => rows.find(r => r.task === t)!

describe('TOEFL Listening blueprint', () => {
  // FIRST, and deliberately: if the parse found nothing, everything below
  // would vacuously pass on an empty array. This is the guard that makes
  // the rest of the file mean anything.
  it('parses exactly the four ETS task rows from assemble.ts', () => {
    expect(rows).toHaveLength(4)
    expect(rows.map(r => r.task).sort()).toEqual(
      ['academic_talk', 'announcement', 'choose_response', 'conversation'])
  })

  it('delivers 48 questions on BOTH adaptive paths', () => {
    expect(sum(r => r.m1) + sum(r => r.lower)).toBe(48)
    expect(sum(r => r.m1) + sum(r => r.upper)).toBe(48)
  })

  it('scores 20 / 15 / 15 — unchanged by the task-mix deviation', () => {
    expect(sum(r => r.sM1)).toBe(20)
    expect(sum(r => r.sLower)).toBe(15)
    expect(sum(r => r.sUpper)).toBe(15)
  })

  it('never scores more items than it delivers', () => {
    for (const r of rows) {
      expect(r.sM1).toBeLessThanOrEqual(r.m1)
      expect(r.sLower).toBeLessThanOrEqual(r.lower)
      expect(r.sUpper).toBeLessThanOrEqual(r.upper)
    }
  })

  it('keeps n consistent with m1 + upper', () => {
    // TOEFL_META documents `n` as the whole-section draw = m1 + upper. It
    // is a fallback, so a stale value fails silently rather than loudly.
    for (const r of rows) expect(r.n).toBe(r.m1 + r.upper)
  })

  it('keeps conversation and announcement counts EVEN', () => {
    // Those audios exist only in sets of 2 and 4, so an odd quota is not a
    // reachable sum of whole sets and the draw silently comes up short —
    // which a 5 actually did before the live-bank verifier caught it.
    for (const t of ['conversation', 'announcement']) {
      const r = by(t)
      for (const v of [r.m1, r.lower, r.upper]) expect(v % 2).toBe(0)
    }
  })

  it('keeps academic_talk counts EVEN, not merely "a sum of 2s, 3s and 4s"', () => {
    // This assertion was weaker on its first draft — it only rejected 1,
    // on the reasoning that every larger integer is a sum of 2s, 3s and
    // 4s. Arithmetically true, and it PASSED a blueprint that broke the
    // real draw: only three 3-question talks exist, so 9 + 3 wanted two of
    // them in one form and assemble-blueprint.test.ts came up 26 of 27.
    // Even counts need 2s and 4s only, of which there are many.
    const r = by('academic_talk')
    for (const v of [r.m1, r.lower, r.upper]) expect(v % 2).toBe(0)
  })

  it('holds Choose a Response at the reduced count until a rebuild passes', () => {
    // Pinned on purpose. Four rebuild attempts have failed (A3_ATTEMPTS in
    // bank-register.ts). Restoring 14 would put questions answerable
    // without listening back to 29% of the section, and that must be a
    // decision, not the side effect of an unrelated edit.
    const cr = by('choose_response')
    expect(cr.m1 + cr.upper).toBeLessThanOrEqual(6)
    expect(cr.m1 + cr.lower).toBeLessThanOrEqual(6)
  })
})
