/** @jest-environment node */
/**
 * The serve-time choice shuffle is not cosmetic.
 *
 * Measured across the live maths bank on 2026-08-31: every cohort is
 * middle-heavy — the key rarely sits at the smallest or largest option,
 * because good distractor practice brackets the answer with over- and
 * under-applied errors. sat/v2 (n=710) puts 72% of keys in the middle
 * two ranks against 50% expected.
 *
 * That is harmless ONLY while the options are not served in magnitude
 * order. Four SSAT/ISEE cohorts print ascending AND are skewed, so for
 * them the option LETTER is the magnitude RANK, and "never pick the
 * extremes" would be worth roughly +13 points with no question read.
 *
 * The reading bank has the same shape for a different reason: in
 * reading-worlds-s5, variant W1 carries the unqualified endorsement in
 * 7 of 9 topics and W4 the small-consequence stance in 6 of 9. Only the
 * shuffle keeps that out of the served item.
 *
 * So a future change that preserves source order "for fidelity" — real
 * SSAT and ISEE do print numeric options ascending — reinstates a
 * deterministic key position. This test exists to make that change fail
 * loudly rather than silently.
 *
 * scripts/study-bank/check-key-rank-spread.mjs measures the condition
 * under which the shuffle could safely be retired.
 */
// assemble.ts constructs the admin client at import, which throws without
// env vars and makes this suite collect ZERO tests while other suites
// still print their passes — the exact "Tests: N passed next to Suites: 1
// failed" trap CLAUDE.md warns about. Same mock the other assemble test uses.
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

import { shuffleDrawnChoices } from '../assemble'
import type { Question } from '@/lib/test-verify'

const mc = (id: string, choices: string[]): { id: string; item: Question } => ({
  id,
  item: {
    type: 'multiple_choice', prompt: 'q', choices,
    correct_answer: choices[0], difficulty: 'medium',
  } as unknown as Question,
})

describe('multiple-choice options are reordered at serve time', () => {
  // Reversion: return rows untouched from shuffleDrawnChoices. This fails,
  // and so does every assertion below it.
  it('does not serve a numeric option set in its stored order', () => {
    // 40 items whose stored order is ascending, as the SSAT/ISEE maths
    // cohorts store them. If any meaningful fraction comes back in the
    // stored order, the rank/letter identity survives to the student.
    const rows = Array.from({ length: 40 }, (_, i) =>
      mc(`i${i}`, ['10', '20', '30', '40']))
    const out = shuffleDrawnChoices(rows, 'seed-a')
    const unchanged = out.filter(r =>
      r.item.choices.join('|') === '10|20|30|40').length
    // A quarter of 4! orderings is 1 in 24; over 40 items a handful is
    // expected by chance, but not most of them.
    expect(unchanged).toBeLessThan(10)
  })

  it('keeps the key with its text, not its position', () => {
    const rows = [mc('x', ['alpha', 'beta', 'gamma', 'delta'])]
    const out = shuffleDrawnChoices(rows, 'seed-b')
    expect(out[0].item.choices).toHaveLength(4)
    expect([...out[0].item.choices].sort()).toEqual(['alpha', 'beta', 'delta', 'gamma'])
    // correct_answer is TEXT and must survive untouched — a shuffle that
    // moved the key by index would silently re-key every item.
    expect(out[0].item.correct_answer).toBe('alpha')
    expect(out[0].item.choices).toContain('alpha')
  })

  it('is stable for one seed, so a student who reloads sees no movement', () => {
    const rows = [mc('x', ['a', 'b', 'c', 'd', 'e'])]
    const first = shuffleDrawnChoices(rows, 'same-seed')[0].item.choices.join('|')
    const again = shuffleDrawnChoices(rows, 'same-seed')[0].item.choices.join('|')
    expect(again).toBe(first)
  })

  it('differs across seeds, so two students do not share an order', () => {
    const rows = Array.from({ length: 20 }, (_, i) => mc(`i${i}`, ['a', 'b', 'c', 'd']))
    const one = shuffleDrawnChoices(rows, 'seed-1').map(r => r.item.choices.join('|'))
    const two = shuffleDrawnChoices(rows, 'seed-2').map(r => r.item.choices.join('|'))
    expect(one.filter((o, i) => o === two[i]).length).toBeLessThan(rows.length)
  })

  it('leaves genuinely ordered item types alone', () => {
    // fill_in_blanks and arrange_words carry meaning in their order; a
    // shuffle would corrupt them. That exemption is why this file tests
    // the multiple_choice path specifically.
    const ordered = [{
      id: 'o',
      item: {
        type: 'arrange_words', prompt: 'p', choices: ['one', 'two', 'three', 'four'],
        correct_answer: 'one | two | three | four', difficulty: 'medium',
      } as unknown as Question,
    }]
    const out = shuffleDrawnChoices(ordered, 'seed-c')
    expect(out[0].item.choices).toEqual(['one', 'two', 'three', 'four'])
  })
})
