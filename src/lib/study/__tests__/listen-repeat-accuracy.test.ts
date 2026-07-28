import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'

/**
 * Cases are written from the official ETS Listen-and-Repeat descriptors,
 * using the examples the guide itself gives (a transposition, a missing
 * function word, a content word swapped for a related one).
 *
 * The prompts are 8-12 word everyday sentences, which is what the spec
 * requires the generator to produce.
 */
const SENTENCE = 'She missed the lecture because her train was late this morning'

describe('scoreListenRepeat', () => {
  it('gives an exact repetition a 5', () => {
    expect(scoreListenRepeat(SENTENCE, SENTENCE).score).toBe(5)
  })

  it('ignores punctuation and casing', () => {
    expect(scoreListenRepeat(SENTENCE, 'she missed the lecture, because her train was late this morning!').score)
      .toBe(5)
  })

  it('gives a single dropped function word a 4', () => {
    // "one or two function words may be missing or changed"
    expect(scoreListenRepeat(SENTENCE, 'She missed lecture because her train was late this morning').score)
      .toBe(4)
  })

  it('gives a single swapped content word a 4', () => {
    // "a content word may be ... replaced with a related word"
    expect(scoreListenRepeat(SENTENCE, 'She missed the class because her train was late this morning').score)
      .toBe(4)
  })

  it('gives a single transposition a 4', () => {
    // The guide's own example: "the small red box" / "the red small box".
    const s = 'He put the small red box on the table'
    expect(scoreListenRepeat(s, 'He put the red small box on the table').score).toBe(4)
  })

  it('treats a wrong tense or plural as a marker change, not a lost word', () => {
    // ETS band 4 lists "markers of tense/aspect/number may be missing or
    // incorrect" as a minor change. A real transcript caught this: the
    // code was counting "afternoons" -> "afternoon" as a missing content
    // word and charging a whole band for it.
    const s = 'She works at the library on Friday afternoons'
    const r = scoreListenRepeat(s, 'She works at the library Friday afternoon')
    expect(r.score).toBe(4)
    expect(r.detail.markerDiffs).toBe(1)
    expect(r.detail.contentMissing).toEqual([])
  })

  it('still charges for a genuinely different word', () => {
    // "class" is not an inflection of "lecture" — that is a real
    // substitution, and must not be excused as a marker change.
    const r = scoreListenRepeat(SENTENCE, 'She missed the class because her train was late this morning')
    expect(r.detail.markerDiffs).toBe(0)
    expect(r.detail.contentMissing).toEqual(['lecture'])
  })

  it('gives a mostly-there but meaning-changed repetition a 3', () => {
    // Band 3 needs a MAJORITY of content words still present while the
    // meaning drifts. Two of five changed (train→bus, morning→evening)
    // leaves 60% — full sentence, wrong details.
    expect(scoreListenRepeat(SENTENCE, 'She missed the lecture because her bus was late this evening').score)
      .toBe(3)
  })

  it('drops below 3 once a majority of content words are gone', () => {
    // Three of five changed is no longer "a majority of content words
    // or ideas in the prompt" — the band-3 threshold — so it is a 2.
    expect(scoreListenRepeat(SENTENCE, 'She missed the meeting because her bus was late this evening').score)
      .toBe(2)
  })

  it('gives a half-remembered sentence a 2', () => {
    expect(scoreListenRepeat(SENTENCE, 'She missed the lecture because of something').score).toBe(2)
  })

  it('gives a few words a 1', () => {
    // "a minimal response of a few words is made; most of the prompt is
    // missing" — even though every word said is correct.
    expect(scoreListenRepeat(SENTENCE, 'She missed the').score).toBe(1)
  })

  it('gives silence a 0', () => {
    expect(scoreListenRepeat(SENTENCE, '').score).toBe(0)
    expect(scoreListenRepeat(SENTENCE, '   ').score).toBe(0)
  })

  it('does not reward a short answer for having good content density', () => {
    // The trap in scoring by recall alone: three correct words out of
    // twelve is a 1, not a 5, however accurate those three are.
    const r = scoreListenRepeat(SENTENCE, 'train was late')
    expect(r.score).toBeLessThanOrEqual(1)
  })

  it('does not let a long ramble pass as a repetition', () => {
    const r = scoreListenRepeat(SENTENCE, 'I think she probably missed something about a train and I am not sure what else happened that day')
    expect(r.score).toBeLessThanOrEqual(3)
  })

  it('is monotonic — closer answers never score lower', () => {
    const ladder = [
      SENTENCE,                                                              // exact
      'She missed lecture because her train was late this morning',           // -1 function
      'She missed the lecture because her bus was late this evening',         // meaning drift
      'She missed the lecture because of something',                          // half
      'She missed the',                                                       // few words
      '',                                                                     // nothing
    ]
    const scores = ladder.map(a => scoreListenRepeat(SENTENCE, a).score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]!)
    }
  })

  it('explains itself in the student’s terms', () => {
    const r = scoreListenRepeat(SENTENCE, 'She missed the class because her train was late this morning')
    expect(r.reason).toContain('lecture')
    expect(r.detail.contentMissing).toEqual(['lecture'])
  })
})
