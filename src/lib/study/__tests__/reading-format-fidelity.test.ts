/** @jest-environment node */
/**
 * The delivered reading section must match the published format.
 *
 * Until 2026-09-01 it did not, and the mismatch was invisible in every
 * number we were checking: question count and time limit were both
 * right, so ISEE read as "36 questions in 35 minutes" — correct — while
 * being served as TWELVE passages of 3 instead of SIX of 6. Same
 * questions, same clock, double the reading: 2.9 minutes per passage
 * against the real 5.8.
 *
 * That direction of error is the damaging one for a practice test. A
 * mock harder than the exam tells a student they are less ready than
 * they are.
 *
 * The cause was one constant serving two purposes. The 3-item cap is
 * correct for QC SAMPLING — within a reading-worlds topic all six keys
 * come from one passage variant, so they are perfectly correlated and
 * six items are not six observations. It is wrong for DELIVERY, and the
 * premise that would have justified it there has been tested: the RW5
 * attack returned -19.8 with every position below chance, so a student
 * cannot shortcut the passage.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ADMISSION_BLUEPRINT, ITEMS_PER_PASSAGE,
  MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING, drawByPassage,
} from '../admission-tests'

/** The published structure, from the official/test-prep descriptions. */
const PUBLISHED = {
  isee: { questions: 36, minutes: 35, passages: 6, perPassage: 6 },
  ssat: { questions: 40, minutes: 40, passages: 7, perPassage: 6 },
} as const

describe('the reading section a student is served matches the real exam', () => {
  it.each(['isee', 'ssat'] as const)('%s keeps the published count and clock', fam => {
    const block = ADMISSION_BLUEPRINT[fam].find(b => b.bankSection === 'reading')!
    expect(block.questions).toBe(PUBLISHED[fam].questions)
    expect(block.minutes).toBe(PUBLISHED[fam].minutes)
  })

  it.each(['isee', 'ssat'] as const)('%s spreads over the published passage count', fam => {
    const p = PUBLISHED[fam]
    const passagesNeeded = Math.ceil(p.questions / ITEMS_PER_PASSAGE[fam])
    // SSAT publishes 7-8 passages; ISEE publishes exactly 6.
    expect(passagesNeeded).toBeLessThanOrEqual(p.passages + 1)
    expect(passagesNeeded).toBeGreaterThanOrEqual(p.passages - 1)
  })

  it.each(['isee', 'ssat'] as const)('%s gives a real amount of time per passage', fam => {
    const p = PUBLISHED[fam]
    const passages = Math.ceil(p.questions / ITEMS_PER_PASSAGE[fam])
    const minutesPerPassage = p.minutes / passages
    // The cap-3 delivery produced 2.9. The real exams allow ~5-6.
    expect(minutesPerPassage).toBeGreaterThan(4.5)
  })

  it('draws up to the published per-passage count, not the sampling cap', () => {
    const rows = Array.from({ length: 60 }, (_, i) =>
      ({ passageGroupId: `p${Math.floor(i / 6)}` }))
    const picked = drawByPassage(rows, 36, ITEMS_PER_PASSAGE.isee)
    const per: Record<string, number> = {}
    for (const r of picked) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(picked).toHaveLength(36)
    expect(Object.keys(per)).toHaveLength(6)          // six passages, not twelve
    expect(Math.max(...Object.values(per))).toBe(6)
  })

  it('distributes evenly, so no passage falls outside the published range', () => {
    // Filling each passage then truncating gave SSAT 6,6,6,6,6,6,4 — the
    // trailing 4 is outside the published "5 to 6 questions per
    // passage", and a 4-question passage is a visibly different task.
    const rows = Array.from({ length: 120 }, (_, i) =>
      ({ passageGroupId: `p${Math.floor(i / 6)}` }))
    const picked = drawByPassage(rows, 40, ITEMS_PER_PASSAGE.ssat)
    const per: Record<string, number> = {}
    for (const r of picked) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    const sizes = Object.values(per)
    expect(picked).toHaveLength(40)
    expect(sizes).toHaveLength(7)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(5)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(6)
  })

  it('still fills the section when the bank is thin', () => {
    // Degrade, never return a short section silently.
    const rows = Array.from({ length: 40 }, (_, i) =>
      ({ passageGroupId: `p${Math.floor(i / 4)}` }))   // 10 passages of 4
    expect(drawByPassage(rows, 36, 6)).toHaveLength(36)
  })

  it('keeps the sampling cap available and separate', () => {
    // Still 3, still exported, still meaningful — for QC only.
    expect(MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING).toBe(3)
    expect(ITEMS_PER_PASSAGE.isee).not.toBe(MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING)
  })

  it('forces every caller to name which limit it means', () => {
    // The default parameter is what let one number serve both purposes.
    const src = readFileSync(join(process.cwd(), 'src/lib/study/admission-tests.ts'), 'utf8')
    expect(src).toMatch(/rows: T\[\], count: number, maxPer: number,/)
    expect(src).not.toMatch(/maxPer = MAX_ITEMS_PER_PASSAGE/)
  })
})
