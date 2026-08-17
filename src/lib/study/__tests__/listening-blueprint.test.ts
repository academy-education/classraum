/**
 * The TOEFL Listening blueprint has to balance, and the comment above it
 * saying so is not evidence that it does.
 *
 * On 2026-08-11 Choose a Response was cut from 14 delivered to 6 —
 * both instruments agreed students answered the then-live cr-v1 cohort
 * without the audio — and the 8 freed slots went to Conversation and
 * Academic Talk. On 2026-08-18 cr-v7 cleared both blind-attack gates,
 * shipped on Andy's explicit approval, and the ETS shape was RESTORED.
 * His standing rule, quoted: the delivered count returns to the real
 * ETS shape and NEVER changes again — so this file pins every number
 * of every row, not just the invariants.
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

  it('pins the restored ETS shape exactly — Andy\'s rule: it NEVER changes again', () => {
    // Restored 2026-08-18 after cr-v7 cleared both blind-attack gates and
    // shipped on Andy's explicit approval (132 items live, cr-v1/cr-v2/
    // harvest-v1 archived — CRV7-RESULT.md). These are the pre-2026-08-11
    // numbers, byte-for-byte. His standing rule is quoted in assemble.ts:
    // the delivered count returns to the real ETS shape and NEVER changes
    // again. A red test here means someone is re-tuning the exam's shape;
    // that needs Andy, not a pin update.
    expect(rows.map(({ task, n, m1, lower, upper, sM1, sLower, sUpper }) =>
      [task, n, m1, lower, upper, sM1, sLower, sUpper].join(','))).toEqual([
      'choose_response,14,11,9,3,8,7,3',
      'conversation,12,6,6,6,4,4,4',
      'announcement,6,6,6,0,4,4,0',
      'academic_talk,16,4,0,12,4,0,8',
    ])
  })
})
