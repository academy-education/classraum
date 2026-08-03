/**
 * Where the Speaking grading mode is decided.
 *
 * There are two graders for a Speaking response:
 *   - 'text'  — Whisper transcript + WPM/pause/clarity signals, scored by
 *     gpt-4o against the ETS rubric. This is what every student gets.
 *   - 'audio' — a model scoring the RECORDING itself
 *     (`/api/study/speaking/grade-audio`, wired through WritingPanels).
 *
 * ── Audio grading is DISABLED, deliberately, since 2026-08-04 ─────────
 * Flip `AUDIO_GRADING_ENABLED` to re-enable it. Nothing else needs to
 * change: the route, the client branch in WritingPanels, and the
 * `speaking_grade_mode` column are all intact and were never removed.
 *
 * This is a switch rather than a deletion because the two graders are
 * not equivalent and the audio one is the more faithful of the pair.
 * TOEFL Speaking rubrics score DELIVERY — pronunciation, intonation,
 * stress — which a transcript cannot carry. Text mode approximates it
 * from three numeric speech signals rather than ignoring it, but that is
 * an approximation, and the gap is the reason to bring audio back later
 * rather than tidy it away.
 *
 * Being explicit also matters for a duller reason: hiding the chooser
 * left `'audio'` with no writer anywhere in the app, so the feature was
 * already off — just silently, by accident, with nothing saying so. A
 * named flag turns "dead code nobody dares delete" into "off, on
 * purpose, here is the switch".
 */

export type SpeakingGradeMode = 'text' | 'audio'

/**
 * Master switch for audio-native Speaking grading.
 *
 * false → the chooser is never offered and every session is graded from
 * the transcript. true → TOEFL Speaking offers the choice again, and a
 * session created with 'audio' takes the native path.
 */
export const AUDIO_GRADING_ENABLED = false

/** True only for the TOEFL Speaking section. Section names arrive Title
 *  Cased from the topic slug parser ("Speaking", "Reading Writing"). */
export function isToeflSpeakingSection(
  family: string | null | undefined,
  section: string | null | undefined,
): boolean {
  return family === 'toefl' && section != null && /speaking/i.test(section)
}

/**
 * What the pre-test customization sheet should do about the grading mode.
 *
 * TOEFL Speaking is the ONLY section that ever offered a choice, and it
 * offers one only while `AUDIO_GRADING_ENABLED` is true. Every other
 * section has never had a chooser and must not grow one — offering a
 * grader toggle on Reading would be meaningless.
 *
 * `mode` is what the session is created with when the student is not
 * asked, and it is always 'text': a student who is not offered the
 * choice must never silently land on the paid audio grader.
 */
export function speakingGradeModeChoice(
  family: string | null | undefined,
  section: string | null | undefined,
): { offerChoice: boolean; mode: SpeakingGradeMode } {
  if (isToeflSpeakingSection(family, section)) {
    return { offerChoice: AUDIO_GRADING_ENABLED, mode: 'text' }
  }
  return { offerChoice: false, mode: 'text' }
}
