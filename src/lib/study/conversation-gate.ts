/**
 * Shape checks for TOEFL Listening conversation transcripts.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * Nothing checked the shape of a conversation. The authoring spec named
 * a 140-220 word range and said nothing at all about speaker turns, and
 * no script enforced even the range it did name. 25 of the 62 live
 * conversations sit outside it, one at 432 words, and that drift was
 * invisible until a student complained about the audio.
 *
 * ── Evidence, and how thin it is ─────────────────────────────────────
 * The reference is the official `Listen to a Conversation` script in
 * ETS's TOEFL iBT Listening lesson plans: 10 speaker turns, ~110 words,
 * two questions.
 *
 * That is ONE published conversation. It is enough to say a 432-word
 * transcript is wrong; it is not enough to fit a tight band to. So the
 * bands here are deliberately loose around it, and the question-count
 * rule — where a single sample would drive a rewrite of all 62
 * transcripts — is reported but NOT enforced. See `unconfirmed`.
 *
 * This is the same trap as the Speaking-vs-Writing rubric import: a
 * convention read off one source and applied as if it were the spec.
 */

/**
 * The official figures every band below is set against — COUNTED from
 * the script, not estimated from reading it.
 *
 * The first version of this file said 10 turns / 110 words, which was
 * my eyeball estimate. Running the gate against the real transcript as
 * a control rejected it on the word floor, which is how the estimate
 * was caught. The numbers below are what `shapeOf` actually returns for
 * that script. An "official" constant nobody ran the parser over is a
 * guess wearing a citation.
 */
export const ETS_REFERENCE = {
  source: 'ETS TOEFL iBT Listening lesson plans — "Listen to a Conversation" script',
  turns: 9,
  words: 92,
  questions: 2,
  n: 1,
} as const

export interface ConversationShape {
  words: number
  turns: number
  /** Turns where the same speaker label repeats back-to-back. Each one
   *  becomes two separate mp3s in the SAME voice with a pause between —
   *  an audible break in the middle of one person's sentence. */
  repeatedSpeakerTurns: number
  speakers: number
}

export interface Violation {
  rule: string
  detail: string
  /** True when the rule rests on evidence too thin to act on, so it is
   *  reported and must not fail a build. */
  unconfirmed?: boolean
}

/** Words 80-160. The floor sits BELOW the official 92 on purpose: with
 *  n=1 a floor above the only known-good sample would reject the
 *  reference itself, which is precisely what the first draft did. The
 *  ceiling still rejects our 209 median and 432 max on any reading. */
export const WORD_MIN = 80
export const WORD_MAX = 160
/** Turns: the official script has 9. 12 allows headroom without
 *  licensing the 16-turn transcripts now in the bank. */
export const TURN_MAX = 12
/** Two speakers, always — a "conversation" with one is a monologue and
 *  with three is a format we do not build. */
export const SPEAKERS = 2

/**
 * Split a stored transcript into speaker turns.
 *
 * MUST match ListeningAudioPlayer's `parseTurns`, because that is what
 * decides how many mp3s get synthesised. A gate that counted turns
 * differently from the player would pass transcripts the player then
 * chops into more pieces than the gate allowed.
 */
export function parseTurns(passage: string): Array<{ speaker: string; text: string }> {
  const cleaned = passage.replace(/^\s*transcript:\s*/i, '').trim()
  const re = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns: Array<{ speaker: string; text: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) != null) {
    turns.push({ speaker: m[1], text: m[2].trim().replace(/^"|"$/g, '') })
  }
  return turns
}

export function shapeOf(passage: string): ConversationShape {
  const turns = parseTurns(passage)
  const body = passage.replace(/^\s*transcript:\s*/i, '').trim()
  let repeated = 0
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].speaker === turns[i - 1].speaker) repeated++
  }
  return {
    words: body.split(/\s+/).filter(Boolean).length,
    turns: turns.length,
    repeatedSpeakerTurns: repeated,
    speakers: new Set(turns.map(t => t.speaker)).size,
  }
}

/**
 * Every way this conversation departs from the official shape.
 *
 * Empty means it passes. `questionCount` is optional because it is a
 * property of the item GROUP, not the transcript.
 */
export function checkConversation(passage: string, questionCount?: number): Violation[] {
  const s = shapeOf(passage)
  const out: Violation[] = []

  if (s.turns === 0) {
    return [{ rule: 'speaker-labels', detail: 'No A:/B: turns found — the player will speak this as one voice.' }]
  }
  if (s.speakers !== SPEAKERS) {
    out.push({ rule: 'speakers', detail: `${s.speakers} speaker(s), expected ${SPEAKERS}.` })
  }
  if (s.words < WORD_MIN || s.words > WORD_MAX) {
    out.push({
      rule: 'words',
      detail: `${s.words} words, expected ${WORD_MIN}-${WORD_MAX} (official ≈${ETS_REFERENCE.words}).`,
    })
  }
  if (s.turns > TURN_MAX) {
    out.push({
      rule: 'turns',
      detail: `${s.turns} speaker turns, max ${TURN_MAX} (official ${ETS_REFERENCE.turns}). Each turn is a separate mp3.`,
    })
  }
  if (s.repeatedSpeakerTurns > 0) {
    out.push({
      rule: 'repeated-speaker',
      detail: `${s.repeatedSpeakerTurns} place(s) where one speaker labels twice in a row — the player splits these into two clips of the same voice with a pause between.`,
    })
  }
  if (questionCount != null && questionCount !== ETS_REFERENCE.questions) {
    out.push({
      rule: 'questions',
      detail: `${questionCount} questions, official is ${ETS_REFERENCE.questions}.`,
      // n=1. Reported so the drift is visible; not enforced, because
      // one published sample cannot justify recutting 62 transcripts.
      unconfirmed: true,
    })
  }
  return out
}

/** Violations that should fail a gate — i.e. excluding the ones whose
 *  evidence is too thin to act on. */
export function blocking(violations: Violation[]): Violation[] {
  return violations.filter(v => !v.unconfirmed)
}
