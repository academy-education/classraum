/**
 * What PracticeSession sends to /api/study/explain for one question.
 *
 * Bank practice items fold the passage into `prompt` ("passage\n\nstem"),
 * because the practice UI has no passage pane. Sent as-is, that string hit
 * the explain route's 4000-char prompt clamp, which keeps the FRONT — so on a
 * long passage the model got most of the passage and none of the question,
 * and never saw the passage labelled as the source the prompt builder quotes.
 *
 * When the question carries its `passage` and the prompt really is
 * "passage + stem", split them: the stem goes as `prompt`, the passage as
 * `passage` (the route clamps that separately at 6000). Anything else — an
 * old cached batch without `passage`, or a prompt that does not start with
 * it — is sent unchanged, which is exactly the previous behaviour.
 */
export function practiceExplainContext(q: { prompt: string; passage?: string | null }): {
  prompt: string
  passage?: string
} {
  const passage = (q.passage ?? '').trim()
  if (!passage) return { prompt: q.prompt }
  const full = q.prompt.trim()
  if (!full.startsWith(passage)) return { prompt: q.prompt }
  const stem = full.slice(passage.length).trim()
  // A prompt that is ONLY the passage has no separate question to send.
  if (!stem) return { prompt: q.prompt }
  return { prompt: stem, passage }
}
