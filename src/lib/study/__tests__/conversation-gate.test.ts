import {
  checkConversation, blocking, shapeOf, parseTurns, ETS_REFERENCE,
  WORD_MIN, WORD_MAX, TURN_MAX,
} from '../conversation-gate'
import { parseTurns as PLAYER_REGEX_SOURCE } from '../conversation-gate'

/**
 * The conversation shape gate.
 *
 * This exists because nothing checked the shape at all. The spec named
 * 140-220 words and no script enforced it, so 25 of 62 live
 * conversations drifted outside — one to 432 words — and it took a
 * student complaint about the audio to surface it.
 *
 * The gate MUST fail on the current bank. A shape gate that passes the
 * transcripts that provoked the complaint is not measuring anything.
 */

/**
 * The REAL official script, verbatim from the ETS lesson-plan PDF with
 * its (F)/(M) labels rewritten as our A:/B: form. Nothing else changed.
 *
 * This is the control, and it is load-bearing: the first version of the
 * gate set a 100-word floor from an eyeballed "~110 words" and this
 * transcript — the only known-good conversation in existence — failed
 * it at 92. A gate that rejects its own reference is measuring the
 * author's guess, not the format.
 */
const ETS_OFFICIAL =
  "Transcript: A: Need anything from the supermarket? " +
  "B: Huh? Aren't we getting ready to go see that play in a few minutes? " +
  "A: That's tomorrow, silly. " +
  "B: Oh. Wow, I'd forget my head if it wasn't screwed on. Guess I don't need to change my clothes after all. " +
  "A: So you weren't planning to make dinner? " +
  "B: No, but I can. What do you want? " +
  "A: Just something light and healthy. So can you go shopping instead? " +
  "B: Yeah, sure. How about salmon and salad? Want anything else? " +
  "A: No, that's good. Thanks!"

const officialShape =
  'Transcript: A: Need anything from the supermarket? ' +
  'B: Huh? Are we getting ready to go see that play in a few minutes? ' +
  'A: That is tomorrow. ' +
  'B: Oh. I would forget my head if it was not screwed on. So I do not need to change my clothes. ' +
  'A: So you were not planning to make dinner tonight for us? ' +
  'B: No, but I can do that. What do you want me to make for us? ' +
  'A: Just something light and healthy please. So can you go shopping instead of cooking? ' +
  'B: Yeah, sure thing. How about salmon and a salad? Do you want anything else from there? ' +
  'A: No, that is good. Thanks so much for going out to the store for me. ' +
  'B: No problem at all, I will head over there in a few minutes and be back soon.'

describe('conversation gate', () => {
  it('accepts the real ETS script — the control the first draft failed', () => {
    const s = shapeOf(ETS_OFFICIAL)
    // Counted, not estimated. These ARE the reference constants.
    expect(s).toEqual({ words: 92, turns: 9, repeatedSpeakerTurns: 0, speakers: 2 })
    expect(s.words).toBe(ETS_REFERENCE.words)
    expect(s.turns).toBe(ETS_REFERENCE.turns)
    // The only known-good conversation must pass every blocking rule.
    expect(blocking(checkConversation(ETS_OFFICIAL, 2))).toEqual([])
    // And the floor must stay under it — with n=1 there is no room to
    // set a floor above the single sample and still be honest.
    expect(WORD_MIN).toBeLessThan(ETS_REFERENCE.words)
  })

  it('passes a transcript shaped like the official one', () => {
    const s = shapeOf(officialShape)
    expect(s.turns).toBe(10)
    expect(s.speakers).toBe(2)
    expect(s.words).toBeGreaterThanOrEqual(WORD_MIN)
    expect(s.words).toBeLessThanOrEqual(WORD_MAX)
    expect(blocking(checkConversation(officialShape))).toEqual([])
  })

  it('fails the real 432-word outlier', () => {
    const long = 'Transcript: ' + Array.from({ length: 12 }, (_, i) =>
      `${i % 2 === 0 ? 'A' : 'B'}: ${'word '.repeat(36)}`).join('')
    const v = blocking(checkConversation(long))
    expect(v.map(x => x.rule)).toContain('words')
    expect(v.find(x => x.rule === 'words')!.detail).toMatch(
      new RegExp(`expected ${WORD_MIN}-${WORD_MAX}`))
  })

  it('fails a 16-turn transcript — each turn is a separate mp3', () => {
    const many = 'Transcript: ' + Array.from({ length: 16 }, (_, i) =>
      `${i % 2 === 0 ? 'A' : 'B'}: ${'word '.repeat(8)}`).join('')
    const rules = blocking(checkConversation(many)).map(v => v.rule)
    expect(rules).toContain('turns')
    expect(TURN_MAX).toBeGreaterThanOrEqual(ETS_REFERENCE.turns)
  })

  it('catches the same speaker labelling twice in a row', () => {
    // Seen live: "B: Yeah. I'm a biology major... B: But I'm nervous..."
    // The player splits this into two clips in the SAME voice with a
    // pause between — an audible break mid-thought, for nothing.
    const doubled = 'Transcript: A: ' + 'word '.repeat(30) +
      'B: ' + 'word '.repeat(30) + 'B: ' + 'word '.repeat(30) + 'A: ' + 'word '.repeat(30)
    const v = blocking(checkConversation(doubled))
    expect(v.map(x => x.rule)).toContain('repeated-speaker')
    expect(shapeOf(doubled).repeatedSpeakerTurns).toBe(1)
  })

  it('reports the question count but does NOT block on it', () => {
    // n=1 published sample. Visible, not actionable — recutting 62
    // transcripts on one data point is the rubric-import mistake again.
    const all = checkConversation(officialShape, 3)
    expect(all.map(v => v.rule)).toContain('questions')
    expect(all.find(v => v.rule === 'questions')!.unconfirmed).toBe(true)
    expect(blocking(all)).toEqual([])
    expect(ETS_REFERENCE.n).toBe(1)
  })

  it('flags a transcript with no speaker labels', () => {
    const v = checkConversation('Transcript: This is one long monologue with no labels at all.')
    expect(v).toHaveLength(1)
    expect(v[0].rule).toBe('speaker-labels')
  })

  it('parses turns identically to the player', () => {
    // The gate counts turns to bound how many mp3s get synthesised. If
    // it split differently from ListeningAudioPlayer's parseTurns, it
    // would pass transcripts the player then chops into more pieces
    // than the gate allowed. Same regex, asserted on the awkward cases.
    expect(PLAYER_REGEX_SOURCE).toBe(parseTurns)
    const quoted = 'Transcript: A: "Hi there." B: "Hello back."'
    expect(parseTurns(quoted).map(t => t.text)).toEqual(['Hi there.', 'Hello back.'])
    // A colon inside speech must not start a new turn.
    const colon = 'Transcript: A: The rule is this: never guess. B: Understood.'
    expect(parseTurns(colon)).toHaveLength(2)
  })
})
