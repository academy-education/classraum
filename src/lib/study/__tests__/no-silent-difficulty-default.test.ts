/** @jest-environment node */
/**
 * An unset difficulty must not be recorded as 'hard'.
 *
 * toefl-bank-helper.mjs read `it.difficulty || 'hard'` in three insert
 * paths, so any item whose authoring batch omitted a difficulty was
 * banked at the STRONGEST band. Measured 2026-09-01, toefl/reading held
 * 0 easy, 23 medium and 798 hard — and a blind grade of 48 of those
 * "hard" items came back 34 easy, 12 medium, 2 hard. The stored label
 * was right for 4% of them, and three cohorts were 100% hard with no
 * variation at n = 69, 60 and 34.
 *
 * It inverted the adaptivity it feeds. TOEFL Module 2 routes a
 * struggling student to the easier module; the easiest items in the bank
 * were the ones marked hardest, so the bank believed it had nothing
 * easier to give them.
 *
 * A default that asserts the strongest band turns a missing measurement
 * into a confident claim. Absent is now recorded as absent.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const helper = readFileSync(
  join(process.cwd(), 'scripts/study-bank/toefl-bank-helper.mjs'), 'utf8')

describe('the TOEFL inserter records an ungraded item as ungraded', () => {
  it('has no `|| \'hard\'` default in live code', () => {
    /* Comment lines excluded: the note above the fix quotes the old
       expression verbatim, and matching that made this assertion fail on
       its first run. Second time today I have counted a comment as code. */
    const code = helper.split('\n')
      .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
      .join('\n')
    expect(code).not.toMatch(/difficulty\s*\|\|\s*'hard'/)
  })

  it('routes every insert through one difficulty function', () => {
    // Three separate paths each had their own copy of the default, which
    // is why fixing one would not have been enough.
    expect(helper).toMatch(/function difficultyOf\(it\)/)
    expect((helper.match(/difficultyOf\(it\)/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('flags an ungraded item in verify_meta rather than hiding it', () => {
    expect(helper).toMatch(/difficulty_ungraded: true/)
  })

  it('does not silently claim the strongest band', () => {
    // The fallback is the middle band, and it is marked. The point is
    // not that 'medium' is more accurate — it is that the row no longer
    // asserts something nobody measured.
    expect(helper).toMatch(/return it\.difficulty \|\| 'medium'/)
  })
})
