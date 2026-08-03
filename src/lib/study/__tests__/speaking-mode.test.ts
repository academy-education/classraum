/**
 * The Speaking grading-mode rule.
 *
 * The point of this file is the SECOND assertion in each case: the sheet
 * must not ask, AND the mode it falls back to must be 'text'. A rule that
 * hid the chooser but left the default at 'audio' would silently bill every
 * Speaking session at the audio price — invisible in a screenshot.
 */
import { isToeflSpeakingSection, speakingGradeModeChoice, AUDIO_GRADING_ENABLED } from '@/lib/study/speaking-mode'

describe('isToeflSpeakingSection', () => {
  it('matches TOEFL Speaking however the section is cased', () => {
    expect(isToeflSpeakingSection('toefl', 'Speaking')).toBe(true)
    expect(isToeflSpeakingSection('toefl', 'speaking')).toBe(true)
  })

  it('does not match other sections or families', () => {
    expect(isToeflSpeakingSection('toefl', 'Reading Writing')).toBe(false)
    expect(isToeflSpeakingSection('toefl', 'Listening')).toBe(false)
    expect(isToeflSpeakingSection('toefl', null)).toBe(false)
    expect(isToeflSpeakingSection('sat', 'Speaking')).toBe(false)
    expect(isToeflSpeakingSection(null, 'Speaking')).toBe(false)
  })
})

describe('speakingGradeModeChoice', () => {
  it('never offers the chooser for TOEFL Speaking, and defaults to text', () => {
    const c = speakingGradeModeChoice('toefl', 'Speaking')
    expect(c.offerChoice).toBe(false)
    expect(c.mode).toBe('text')
  })

  it.each([
    ['toefl', 'Reading Writing'],
    ['toefl', 'Listening'],
    ['sat', 'Reading Writing'],
    [null, null],
  ])('offers nothing for %s / %s either', (family, section) => {
    const c = speakingGradeModeChoice(family, section)
    expect(c.offerChoice).toBe(false)
    expect(c.mode).toBe('text')
  })
})

/**
 * The kill switch, pinned.
 *
 * Audio-native Speaking grading is OFF (2026-08-04) but not deleted —
 * it is the more faithful of the two graders, because TOEFL Speaking
 * scores delivery and a transcript cannot carry pronunciation or
 * intonation. So the code stays and a flag decides.
 *
 * A flag nobody tested is not a switch, it is a comment. These tests
 * assert the WIRING rather than the current value, so they keep working
 * whichever way it is set — and fail if someone quietly disconnects it.
 */
describe('AUDIO_GRADING_ENABLED', () => {
  it('is what decides whether TOEFL Speaking offers the choice', () => {
    // Deliberately compares against the flag, not against `false`. If
    // the wiring is cut, flipping the flag would silently do nothing.
    expect(speakingGradeModeChoice('toefl', 'Speaking').offerChoice).toBe(AUDIO_GRADING_ENABLED)
  })

  it('is currently off', () => {
    expect(AUDIO_GRADING_ENABLED).toBe(false)
  })

  it('never puts a student on the audio grader without asking', () => {
    // The default mode stays 'text' whatever the flag says. Turning
    // audio back on must re-offer the CHOICE, never silently switch a
    // student onto the costlier grader.
    expect(speakingGradeModeChoice('toefl', 'Speaking').mode).toBe('text')
    expect(speakingGradeModeChoice('toefl', 'Reading').mode).toBe('text')
  })

  it('does not let the flag leak a chooser onto other sections', () => {
    // Only TOEFL Speaking is ever gated by it. A grader toggle on
    // Reading would be meaningless.
    for (const section of ['Reading', 'Writing', 'Listening', 'Reading Writing']) {
      expect(speakingGradeModeChoice('toefl', section).offerChoice).toBe(false)
      expect(speakingGradeModeChoice('sat', section).offerChoice).toBe(false)
    }
  })
})
