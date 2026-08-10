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

  it('leaves later chips as authored, so proper nouns keep their capitals', () => {
    expect(assembledChips(['when', 'Maria', 'arrived'])).toEqual(['When', 'Maria', 'arrived'])
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
