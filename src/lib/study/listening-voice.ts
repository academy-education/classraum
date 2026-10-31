/**
 * listening-voice.ts — how a stored listening transcript becomes TTS segments (text + voice). Pure.
 *
 * ListeningAudioPlayer.tsx uses `voiceForSpeaker` for its dialogue turns; `listeningSegments` is the whole
 * transform (player's parseTurns + voice choice) for checkers that must predict exactly what the player will
 * synthesise (itep-stage-check, verify-itep-draw). prewarm-toefl-audio.mjs and bank-integrity-sweep.mjs carry
 * byte-for-byte replicas; listening-voice.test.ts pins all three to one fixture.
 *
 * Voices were assigned by ORDER OF APPEARANCE only (first speaker nova, second onyx, ...). That is fine for TOEFL's
 * A/B transcripts but wrong for iTEP, whose dialogues are "a woman and a man" and whose questions say "the man":
 * a dialogue the man opens would be read in a woman's voice. So the labels W and M are pinned (W = nova, female;
 * M = onyx, male) whatever the order; any other label keeps the rotation. Mixing W/M with other labels in one
 * transcript can give two speakers one voice; itep-stage-check refuses any iTEP dialogue that is not exactly W and M. No non-archived listening row used W:/M:
 * when this was added (0 of 1,591, 2026-10-31), so no cached TOEFL clip changes.
 */
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer'

export const DIALOGUE_VOICE_ROTATION: TtsVoice[] = ['nova', 'onyx', 'shimmer', 'echo']
export const MONOLOGUE_VOICE: TtsVoice = 'nova'
export const FIXED_SPEAKER_VOICE: Readonly<Record<string, TtsVoice>> = { W: 'nova', M: 'onyx' }
/** The /api/study/listening/tts body cap (zod max): a segment longer than this cannot be synthesised. */
export const TTS_MAX_CHARS = 4000

/** Voice for `speaker`, remembering assignments in `assigned` (the player's per-transcript map). */
export function voiceForSpeaker(speaker: string, assigned: Map<string, TtsVoice>): TtsVoice {
  const known = assigned.get(speaker)
  if (known) return known
  const v = FIXED_SPEAKER_VOICE[speaker] ?? DIALOGUE_VOICE_ROTATION[assigned.size % DIALOGUE_VOICE_ROTATION.length]
  assigned.set(speaker, v)
  return v
}

/** The player's parseTurns: [] unless the text has 2+ turns by 2+ speakers (then it is a monologue). */
export function playerTurns(cleaned: string): Array<{ speaker: string; text: string }> {
  const turnRegex = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns: Array<{ speaker: string; text: string }> = []
  let m: RegExpExecArray | null
  while ((m = turnRegex.exec(cleaned)) != null) turns.push({ speaker: m[1], text: m[2].trim().replace(/^"|"$/g, '') })
  return turns.length >= 2 && new Set(turns.map(t => t.speaker)).size >= 2 ? turns : []
}

/** Exactly the (text, voice) segments ListeningAudioPlayer synthesises for a stored passage. */
export function listeningSegments(passage: string): Array<{ text: string; voice: TtsVoice }> {
  const cleaned = (passage || '').replace(/^\s*transcript:\s*/i, '').trim()
  const turns = playerTurns(cleaned)
  if (turns.length === 0) return [{ text: cleaned.replace(/^"|"$/g, ''), voice: MONOLOGUE_VOICE }]
  const assigned = new Map<string, TtsVoice>()
  return turns.map(({ speaker, text }) => ({ text, voice: voiceForSpeaker(speaker, assigned) }))
}
