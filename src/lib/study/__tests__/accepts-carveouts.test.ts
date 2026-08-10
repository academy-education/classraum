/**
 * The two carve-outs in the SAT R&W accept rule.
 *
 * Both skip checks the general path enforces, and neither was pinned by a
 * test — accepts() lived in a module importing @supabase/supabase-js, which
 * Jest cannot transform. One of them had drifted past what its own comment
 * claimed and nothing noticed.
 *
 * They have opposite track records, measured:
 *
 *   Standard English Conventions   blind 58.3%   best cohort in the bank
 *   Rhetorical Synthesis           blind 100%    12 of 12 solved blind
 *
 * The Conventions carve-out trades three soft graders for a STRICTER key
 * requirement (unanimous 3/3) and produces the only cohort near the ~25%
 * control. It stays.
 *
 * The Rhetorical Synthesis carve-out argued — reasonably — that the
 * distractor-quality lens misreads its item type. But it returned before
 * the PASSAGE check too, which its comment never claimed. Expression of
 * Ideas is 65/66 Rhetorical Synthesis and reads 100% blind: the guard that
 * was silently disabled is the guard watching the dimension the cohort
 * fails on. Narrowed 2026-08-09 to skip only the distractor lens.
 *
 * BREAK-TEST: restore `return { ok: true }` inside the Rhetorical Synthesis
 * branch and "still requires the passage" fails.
 */
import { accepts } from '../../../../scripts/study-bank/accepts.mjs'

const CLEAN = {
  key_votes: 3,
  difficulty: 'hard',
  distractor_quality: 'strong',
  passage_needed: true,
}

describe('the general path', () => {
  it('accepts a clean item', () => {
    expect(accepts(CLEAN, 'Craft and Structure', null)).toEqual({ ok: true })
  })
  it('rejects a contested key', () => {
    expect(accepts({ ...CLEAN, key_votes: 1 }, 'Craft and Structure', null).ok).toBe(false)
  })
  it('rejects an easy item', () => {
    expect(accepts({ ...CLEAN, difficulty: 'easy' }, 'Craft and Structure', null).ok).toBe(false)
  })
  it('rejects weak distractors', () => {
    expect(accepts({ ...CLEAN, distractor_quality: 'weak' }, 'Craft and Structure', null).ok).toBe(false)
  })
  it('rejects an item that does not need its passage', () => {
    expect(accepts({ ...CLEAN, passage_needed: false }, 'Craft and Structure', null).ok).toBe(false)
  })
})

describe('Standard English Conventions carve-out — kept', () => {
  const SEC = 'Standard English Conventions'
  it('demands a UNANIMOUS key, where the general path takes 2 of 3', () => {
    expect(accepts({ ...CLEAN, key_votes: 2 }, SEC, null).ok).toBe(false)
    expect(accepts({ ...CLEAN, key_votes: 3 }, SEC, null)).toEqual({ ok: true })
  })
  it('ignores the difficulty and distractor graders, which misread punctuation options', () => {
    expect(accepts({ key_votes: 3, difficulty: 'easy', distractor_quality: 'weak', passage_needed: false }, SEC, null))
      .toEqual({ ok: true })
  })
})

describe('Rhetorical Synthesis carve-out — narrowed', () => {
  const EOI = 'Expression of Ideas'
  const RS = 'Rhetorical Synthesis'

  it('still skips the distractor lens, which is what it argues for', () => {
    expect(accepts({ ...CLEAN, distractor_quality: 'weak' }, EOI, RS)).toEqual({ ok: true })
  })

  it('still requires the passage — the check it used to skip silently', () => {
    expect(accepts({ ...CLEAN, passage_needed: false }, EOI, RS).ok).toBe(false)
  })

  it('still requires a non-contested key and a non-easy item', () => {
    expect(accepts({ ...CLEAN, key_votes: 1 }, EOI, RS).ok).toBe(false)
    expect(accepts({ ...CLEAN, difficulty: 'easy' }, EOI, RS).ok).toBe(false)
  })

  it('does not leak to other Expression of Ideas subskills', () => {
    // Transitions is the other subskill in this domain; it gets the
    // general path, distractor lens included.
    expect(accepts({ ...CLEAN, distractor_quality: 'weak' }, EOI, 'Transitions').ok).toBe(false)
  })
})
