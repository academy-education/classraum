import { WRITING_USAGE_CARDS, type UsageCard } from '@/lib/study/writing-usage-cards'
import { awlSublist, isAwlHeadword, AWL_SUBLISTS } from '@/lib/study/awl'

/**
 * Does a word in the example belong to the headword's family?
 *
 * Prefix match on the headword minus a trailing 'e', NOT a suffix
 * stemmer. The first attempt used the listen-repeat stemmer and failed
 * nine cards that were perfectly correct: its alternation strips "es"
 * before "s", so "contributes" became "contribut" while "contribute"
 * stayed whole. It also had no notion of derivational forms, so a card
 * whose headword is the adjective `consequent` and whose example
 * legitimately uses the adverb `consequently` looked broken.
 *
 * AWL entries ARE word families — the list gives one headword and
 * counts its inflections and derivations. Prefix matching is what that
 * actually means.
 */
// Trailing e AND y both change under inflection: contribute →
// contributes, imply → implies, vary → varies.
const family = (headword: string) => headword.toLowerCase().replace(/[ey]$/, '')

const usesHeadword = (c: UsageCard) => {
  const f = family(c.headword)
  if (f.length < 3) return false
  return c.example.toLowerCase().split(/[^\p{L}]+/u).some(w => w.startsWith(f))
}

describe('every card is TOEFL-level by construction', () => {
  it('draws only from AWL sublists 1-3', () => {
    // THE point of the deck. Without this, "TOEFL vocabulary" is a claim
    // about words I chose, checkable by nobody.
    const offList = WRITING_USAGE_CARDS
      .filter(c => !isAwlHeadword(c.headword))
      .map(c => c.headword)
    expect(offList).toEqual([])
  })

  it('spreads across all three sublists rather than clustering', () => {
    // A deck entirely from sublist 1 is a deck of words students
    // already have; entirely from 3 is too rare to be worth drilling.
    const bySublist = new Map<number, number>()
    for (const c of WRITING_USAGE_CARDS) {
      const s = awlSublist(c.headword)!
      bySublist.set(s, (bySublist.get(s) ?? 0) + 1)
    }
    for (const n of Object.keys(AWL_SUBLISTS).map(Number)) {
      expect(bySublist.get(n) ?? 0).toBeGreaterThan(4)
    }
  })

  it('has no duplicate headwords', () => {
    const seen = WRITING_USAGE_CARDS.map(c => c.headword)
    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe('every card teaches production, not recognition', () => {
  it('actually USES its headword in the model sentence', () => {
    // The most useless card possible is one whose example never uses the
    // word, and it is easy to write by accident when authoring in bulk.
    const missing = WRITING_USAGE_CARDS.filter(c => !usesHeadword(c)).map(c => c.headword)
    expect(missing).toEqual([])
  })

  it('would CATCH a card whose example omits the word', () => {
    // Negative control. Without it, a matcher loose enough to accept
    // anything would make the test above pass vacuously — and this
    // matcher has already been wrong twice.
    const bad: UsageCard = {
      headword: 'contribute', pos: 'v', pattern: 'contribute TO x',
      avoid: 'Do not write "contribute in the discussion".',
      sense: 'to add to something',
      example: 'This point adds to the discussion in a meaningful way.',
    }
    expect(usesHeadword(bad)).toBe(false)
    // ...and still accept a real inflection.
    expect(usesHeadword({ ...bad, example: 'This contributes to the discussion.' })).toBe(true)
  })

  it('names a grammatical pattern on every card', () => {
    for (const c of WRITING_USAGE_CARDS) {
      expect(c.pattern.length).toBeGreaterThan(8)
      // A pattern that is only the word is not a pattern.
      expect(c.pattern.toLowerCase().trim()).not.toBe(c.headword)
    }
  })

  it('names a specific error to avoid on every card', () => {
    for (const c of WRITING_USAGE_CARDS) {
      expect(c.avoid.length).toBeGreaterThan(15)
      // "Be careful" is not guidance.
      expect(c.avoid.toLowerCase()).not.toMatch(/^(be careful|take care)\b/)
    }
  })

  it('writes examples in an academic / email register, not conversation', () => {
    // A model sentence a student is meant to imitate cannot be chatty —
    // the rubric scores register.
    for (const c of WRITING_USAGE_CARDS) {
      expect(c.example).not.toMatch(/\b(gonna|wanna|kinda|stuff|a lot of things)\b/i)
      expect(c.example.trim().length).toBeGreaterThan(35)
      expect(c.example.trim()).toMatch(/[.?]$/)
    }
  })

  it('keeps the sense line short enough to read on a card', () => {
    for (const c of WRITING_USAGE_CARDS) {
      // No lower bound worth enforcing: "to help" is a better gloss
      // than any longer one, and the first version of this test failed
      // three correct cards for being concise. Only the ceiling matters
      // — the card has to fit on a phone.
      expect(c.sense.trim().length).toBeGreaterThan(0)
      expect(c.sense.length).toBeLessThan(90)
    }
  })
})

describe('deck size', () => {
  it('is big enough to be a deck and not a sample', () => {
    // Draw serves 12-20 a session; below ~40 a student exhausts it in
    // two sittings and hits the pool_exhausted gate immediately.
    expect(WRITING_USAGE_CARDS.length).toBeGreaterThanOrEqual(40)
  })
})
