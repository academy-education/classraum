/** @jest-environment node */
/**
 * SSAT/ISEE blueprint and scoring.
 *
 * Three things here would produce a wrong number silently rather than an
 * error, which is why each is pinned and each was confirmed to fail with
 * its mechanism reverted:
 *
 *  1. SSAT's guessing penalty. A blank is worth 0 and a wrong answer −1/4,
 *     so `wrong = delivered − correct` is NOT valid arithmetic. Deriving
 *     it that way understates every score by a quarter point per skip.
 *  2. ISEE must NOT get the penalty. ERB scores rights only; importing
 *     SSAT's rule is the same class of bug as the TOEFL Writing rubric
 *     applied to Speaking.
 *  3. The scaled score and stanine are norm-referenced and we have no
 *     norms. They must stay null rather than be synthesised.
 */
import {
  ADMISSION_BLUEPRINT, scoreAdmission, scoredQuestionCount,
  spreadAcrossPassages, ITEMS_PER_PASSAGE, MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING,
} from '../admission-tests'
import { TEST_SPECS } from '@/lib/test-specs'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('blueprint matches the published format', () => {
  // The spec file is the source of truth for the exam's shape. If someone
  // edits one and not the other, the served test stops matching the real
  // one and nothing else would notice.
  it('SSAT sections match TEST_SPECS counts and timings, with math as the SUM of the two quantitative specs', () => {
    // The spec describes the real exam (two 25-question quantitative
    // sections). We serve them as one block, so the block must equal
    // their sum - not either one, and not a number typed by hand.
    const spec = TEST_SPECS.ssat!.sections
    const quant = spec.filter(x => /^Quantitative/.test(x.name_en))
    expect(quant).toHaveLength(2)
    for (const b of ADMISSION_BLUEPRINT.ssat) {
      if (b.key === 'math') {
        expect(b.questions).toBe(quant.reduce((n, x) => n + x.questionsPerSection, 0))
        expect(b.minutes).toBe(quant.reduce((n, x) => n + x.minutesPerSection, 0))
        continue
      }
      const s = spec.find(x => x.name_en === b.name)
      expect(s).toBeDefined()
      expect(b.questions).toBe(s!.questionsPerSection)
      expect(b.minutes).toBe(s!.minutesPerSection)
    }
  })

  it('ISEE sections match TEST_SPECS counts and timings', () => {
    const spec = TEST_SPECS.isee!.sections
    for (const b of ADMISSION_BLUEPRINT.isee) {
      const s = spec.find(x => x.name_en === b.name)
      expect(s).toBeDefined()
      expect(b.questions).toBe(s!.questionsPerSection)
      expect(b.minutes).toBe(s!.minutesPerSection)
    }
  })

  // Scoped to SCORED blocks. The free-response blocks are bank-backed too
  // now that the essay prompts are inserted, and they carry choiceCount 0
  // because they have no options at all — a rule about how many options a
  // multiple-choice item has does not apply to them.
  it('uses the right choice count per multiple-choice block — 5 SSAT, 4 ISEE', () => {
    for (const b of ADMISSION_BLUEPRINT.ssat) if (b.scored) expect(b.choiceCount).toBe(5)
    for (const b of ADMISSION_BLUEPRINT.isee) if (b.scored) expect(b.choiceCount).toBe(4)
  })

  it('gives the free-response blocks no options', () => {
    for (const fam of ['ssat', 'isee'] as const) {
      for (const b of ADMISSION_BLUEPRINT[fam].filter(x => !x.scored)) {
        expect(b.choiceCount).toBe(0)
        expect(b.questions).toBe(1)
      }
    }
  })

  it('counts only scored blocks toward the form total', () => {
    // SSAT 50 (both quantitative sections as one block) + 40 + 60; the Writing Sample is unscored.
    expect(scoredQuestionCount('ssat')).toBe(150)
    // ISEE 40 + 37 + 36 + 47; the Essay is unscored.
    expect(scoredQuestionCount('isee')).toBe(160)
  })

  it('delivers SSAT in the co-founder\'s order: Math, Reading, Verbal, Writing', () => {
    expect(ADMISSION_BLUEPRINT.ssat.map(s => s.key)).toEqual(['math', 'reading', 'verbal', 'writing'])
  })

  it('delivers ISEE in the co-founder\'s order: Quant, Verbal, Reading, Math Achievement, Essay', () => {
    expect(ADMISSION_BLUEPRINT.isee.map(s => s.key)).toEqual(['quant', 'verbal', 'reading', 'mathach', 'essay'])
  })
})

describe('SSAT guessing penalty', () => {
  // Reversion: `raw = t.correct` for both families. This expectation then
  // reads 20 instead of 17, i.e. every SSAT score inflates.
  it('deducts a quarter point per wrong answer', () => {
    const s = scoreAdmission('ssat', { correct: 20, wrong: 12, omitted: 0 })
    expect(s.raw).toBe(17)
  })

  // The reason `omitted` is a separate field. Reversion: treat omitted as
  // wrong, and this drops to 16 — a quarter point lost per skipped item.
  it('scores a blank as zero, not as wrong', () => {
    const s = scoreAdmission('ssat', { correct: 20, wrong: 12, omitted: 8 })
    expect(s.raw).toBe(17)
    expect(s.maxRaw).toBe(40)
  })

  it('can go negative when a student guesses badly throughout', () => {
    expect(scoreAdmission('ssat', { correct: 0, wrong: 20, omitted: 0 }).raw).toBe(-5)
  })

  it('does not print floating-point noise', () => {
    const s = scoreAdmission('ssat', { correct: 7, wrong: 3, omitted: 0 })
    expect(s.raw).toBe(6.25)
    expect(String(s.raw)).toBe('6.25')
  })
})

describe('ISEE scores rights only', () => {
  // Reversion: apply the penalty to both families. This reads 17, not 20.
  // That is the Writing-rubric-applied-to-Speaking bug in another costume.
  it('ignores wrong answers entirely', () => {
    const s = scoreAdmission('isee', { correct: 20, wrong: 12, omitted: 0 })
    expect(s.raw).toBe(20)
  })

  it('treats a blank and a wrong answer identically', () => {
    const a = scoreAdmission('isee', { correct: 10, wrong: 10, omitted: 0 })
    const b = scoreAdmission('isee', { correct: 10, wrong: 0, omitted: 10 })
    expect(a.raw).toBe(b.raw)
  })

  it('never goes negative', () => {
    expect(scoreAdmission('isee', { correct: 0, wrong: 40, omitted: 0 }).raw).toBe(0)
  })
})

describe('no fabricated norm-referenced score', () => {
  // Reversion: derive a stanine from percentCorrect. This test then fails,
  // which is the point — a plausible 1-9 band with no norm group behind it
  // is a made-up number on a screen a parent reads.
  it('returns null for both the scaled score and the stanine', () => {
    for (const fam of ['ssat', 'isee'] as const) {
      const s = scoreAdmission(fam, { correct: 30, wrong: 5, omitted: 5 })
      expect(s.scaled).toBeNull()
      expect(s.stanine).toBeNull()
      expect(s.scaleNote).toMatch(/no norm group/)
    }
  })

  it('names the right headline per family so the note is not generic', () => {
    expect(scoreAdmission('ssat', { correct: 1, wrong: 0, omitted: 0 }).scaleNote).toMatch(/500-800/)
    expect(scoreAdmission('isee', { correct: 1, wrong: 0, omitted: 0 }).scaleNote).toMatch(/stanine/i)
  })
})

describe('the live-bank verifier mirrors this blueprint', () => {
  // verify-admission-forms.mjs re-declares the blueprint because it runs
  // as a standalone script against Postgres. If the two drift, the script
  // cheerfully certifies a form we do not actually serve.
  const src = readFileSync(join(process.cwd(), 'scripts/study-bank/verify-admission-forms.mjs'), 'utf8')

  it('declares the same scored sections and counts', () => {
    for (const fam of ['ssat', 'isee'] as const) {
      for (const b of ADMISSION_BLUEPRINT[fam].filter(x => x.scored)) {
        const re = new RegExp(`key: '${b.key}',\\s*bankSection: '${b.bankSection}',\\s*questions: ${b.questions}`)
        expect(src).toMatch(re)
      }
    }
  })

  it('uses the DELIVERY per-passage count, not the QC sampling cap', () => {
    // The form checker must measure what a student is actually served.
    // While it used the sampling cap it reported 2.08 forms for sections
    // that can serve 3.25.
    expect(src).toMatch(new RegExp(`MAX_PER_PASSAGE = ${ITEMS_PER_PASSAGE.isee}\\b`))
  })

  it('sums blocks that share a bank section rather than checking them apart', () => {
    // ISEE quant+mathach both draw from `math` (SSAT's two quant sections are now one block).
    // Checking each alone would pass a bank that cannot serve both.
    expect(src).toMatch(/need\[s\.bankSection\] = \(need\[s\.bankSection\] \?\? 0\) \+ s\.questions/)
  })
})

describe('reading items spread across passages', () => {
  const rows = (groups: number, per: number) =>
    Array.from({ length: groups * per }, (_, i) => ({
      id: `q${i}`, passageGroupId: `p${Math.floor(i / per)}`,
    }))

  // Reversion: return rows.slice(0, count). A 40-item section then comes
  // from 7 passages, and since all six keys in a topic come from one
  // variant it is about as reliable as a 7-item test.
  it('takes at most MAX_ITEMS_PER_PASSAGE before revisiting a passage', () => {
    const out = spreadAcrossPassages(rows(20, 6), 40, MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)
    const per: Record<string, number> = {}
    for (const r of out) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(out).toHaveLength(40)
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)
    expect(Object.keys(per).length).toBeGreaterThanOrEqual(14)
  })

  it('degrades by thinning every passage, not by exhausting a few', () => {
    // 5 passages x 6 items, asking for 12: round-robin gives 3 passages
    // 3 apiece only after every passage has had one.
    const out = spreadAcrossPassages(rows(5, 6), 12, MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)
    const per: Record<string, number> = {}
    for (const r of out) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(Object.keys(per)).toHaveLength(5)
    expect(Math.min(...Object.values(per))).toBeGreaterThanOrEqual(2)
  })

  it('returns everything it can when the bank is short', () => {
    expect(spreadAcrossPassages(rows(3, 2), 40, MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)).toHaveLength(6)
  })

  it('does not group unrelated items that have no passage', () => {
    const solo = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, passageGroupId: null }))
    expect(spreadAcrossPassages(solo, 9, MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)).toHaveLength(9)
  })
})
