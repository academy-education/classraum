/**
 * The chip pool must not telegraph the first word.
 *
 * Measured on the live cohort 2026-08-09: 46 of 108 Build-a-Sentence items
 * have exactly one capitalised chunk, and in 44 of them (95.7%) it is the
 * correct opener. A student who notices gets position 1 free on 41% of the
 * cohort without reading the grammar.
 *
 * They do not, because the pool lowercases every chip. That was the whole
 * protection, it lived inline in TestSession with no test, and deleting it
 * would have re-exposed the tell silently — the exact shape of defect this
 * bank keeps producing. This file is the guard.
 *
 * BREAK-TEST: drop the `.map(lcFirst)` from poolChips and "the pool never
 * reveals which chip opens the sentence" fails.
 *
 * NOT covered here: the stored rows, which still carry the capitals. They
 * are deliberately unchanged — see chip-display.ts.
 */
import {
  poolChips,
  assembledChips,
  endPunctuation,
  leaksOpenerByCapitalisation,
} from '../chip-display'

/** Shape taken from live item 108-chunk cohort: one capitalised opener. */
const CHOICES = [
  'The solution',        // capitalised, and the opener — the tell
  'proposed by the engineer',
  'was implemented',
  'last quarter',
]
const KEY = 'The solution | proposed by the engineer | was implemented | last quarter'

describe('the chip pool', () => {
  it('never reveals which chip opens the sentence', () => {
    const pool = poolChips(CHOICES, [])
    const capitalised = pool.filter(c => /^[A-Z]/.test(c))
    expect(capitalised).toEqual([])
    expect(pool).toContain('the solution')
  })

  it('lowercases an intrinsically capitalised chunk too', () => {
    // "Maria" reads slightly oddly in the pool. That is the correct trade:
    // otherwise the only capital in the pool is usually the first word.
    expect(poolChips(['Maria', 'went home'], [])).toEqual(['maria', 'went home'])
  })

  it('drops chips the student has already placed', () => {
    expect(poolChips(CHOICES, ['The solution'])).not.toContain('the solution')
    expect(poolChips(CHOICES, ['The solution'])).toHaveLength(3)
  })

  it('leaves everything after the first character alone', () => {
    // Only the leading character is touched — an internal capital is
    // content, not a positional hint.
    expect(poolChips(['The BBC report'], [])).toEqual(['the BBC report'])
  })
})

describe('the assembled sentence', () => {
  it('capitalises slot 0 so it reads as a sentence', () => {
    expect(assembledChips(['the solution', 'was implemented'])[0]).toBe('The solution')
  })

  // REVERSED 2026-09-04. This test pinned the old policy — later chips left
  // as authored — and that policy WAS the leak: the real opener kept its
  // stored capital wherever the student placed it. The proper-noun capital is
  // now given up on purpose, matching what poolChips already does. Kept as a
  // renamed test rather than deleted, so the reversal is visible in history.
  it('lowercases later chips, giving up proper-noun capitals on purpose', () => {
    expect(assembledChips(['when', 'Maria', 'arrived'])).toEqual(['When', 'maria', 'arrived'])
  })

  it('is empty when nothing is placed', () => {
    expect(assembledChips([])).toEqual([])
  })
})

describe('terminal punctuation', () => {
  it('is taken from the key', () => {
    expect(endPunctuation('a | b?')).toBe('?')
    expect(endPunctuation('a | b!')).toBe('!')
  })
  it('defaults to a period when the author emitted none', () => {
    expect(endPunctuation('a | b')).toBe('.')
    expect(endPunctuation(null)).toBe('.')
  })
})

describe('the audit predicate', () => {
  it('flags a lone capital that is the opener', () => {
    expect(leaksOpenerByCapitalisation(CHOICES, KEY)).toBe(true)
  })
  it('does not flag a lone capital that is NOT the opener', () => {
    // Two live items look like this — "I recommended" capitalised while
    // the sentence opens "The book". Under a lowercase-everything pool
    // these were never traps; the capital is intrinsic, not positional.
    expect(leaksOpenerByCapitalisation(
      ['the book', 'I recommended', 'was late'],
      'the book | I recommended | was late',
    )).toBe(false)
  })
  it('does not flag when several chunks are capitalised', () => {
    // No unique signal to follow.
    expect(leaksOpenerByCapitalisation(['The book', 'Maria read'], 'The book | Maria read')).toBe(false)
  })
})

// 2026-09-04, found by a user testing the Writing section. The pool was
// lowercased but the ASSEMBLED row was not, so placing any chunk into slot 0
// left the real opener showing its stored capital in slot 1 — the answer,
// readable without solving. 87 of 165 live items carried that capital.
//
// BREAK-TEST: restore `i === 0 ? ucFirst(chip) : chip` in assembledChips and
// "a later chip never keeps a stored capital" fails.
describe('the assembled row does not leak the opener', () => {
  it('lowercases a later chip that was authored with a capital', () => {
    // student taps the wrong chunk first; the true opener lands in slot 1
    const out = assembledChips(['Thousands of commuters', 'The transit strike'])
    expect(out[0]).toBe('Thousands of commuters')
    expect(out[1]).toBe('the transit strike')
  })

  it('leaves exactly one capitalised chip however the chunks are ordered', () => {
    const chunks = ['The transit strike', 'prevented', 'thousands of commuters']
    for (const order of [[0, 1, 2], [1, 0, 2], [2, 1, 0], [1, 2, 0]]) {
      const out = assembledChips(order.map(i => chunks[i]))
      const caps = out.filter(c => /^[A-Z]/.test(c))
      expect(caps).toHaveLength(1)
      expect(caps[0]).toBe(out[0])
    }
  })

  it('accepts the proper-noun cost, as the pool already does', () => {
    expect(assembledChips(['when', 'Maria', 'arrived'])).toEqual(['When', 'maria', 'arrived'])
  })
})
