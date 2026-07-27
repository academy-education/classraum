/**
 * Academic Discussion speaker parsing — deliberately a PURE module with no
 * React or i18n imports, so it can be unit-tested directly. Importing it
 * through WritingPanels pulls in useTranslation -> LanguageContext ->
 * lib/supabase, which throws on missing env in a node test environment.
 */

export interface DiscussionBlock {
  role: 'professor' | 'student'
  name: string
  body: string
}

/**
 * Split an Academic Discussion passage into speaker blocks.
 *
 * Exported and pure so the speaker detection can be tested directly —
 * it is the part that breaks, and it breaks invisibly: an undetected
 * speaker does not error, their post is silently absorbed into the
 * previous speaker's card. A student then reads two classmates' opinions
 * as one person's, which is what was reported.
 *
 * Name matching uses Unicode letter classes, NOT [A-Za-zÀ-ÿ]. That range
 * is Latin-1 only (U+00C0–U+00FF): it covers Zoë and Renée but NOT
 * Turkish ş/ğ/ı, Polish ł, Czech ř — so "Ayşe:" was not a speaker and her
 * paragraph rendered inside Pablo's bubble. The generator picks names
 * from a deliberately international pool, so this fires often.
 */
export function parseDiscussionSpeakers(normalized: string): DiscussionBlock[] {
  // Optional role prefix + capitalized name (up to two words) + colon.
  // The lookbehind keeps us from cutting prose mid-sentence ("the goal: X"),
  // and \p{Lu}\p{Ll}+ keeps the "Capitalized word" shape while accepting
  // every alphabet.
  const speakerRegex =
    /(?:^|(?<=[\s\n]))((?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+\p{Lu}[\p{L}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}'’.-]{1,30})?|\p{Lu}[\p{Ll}'’.-]{1,20}(?:\s+\p{Lu}[\p{Ll}'’.-]{1,20})?)\s*:\s*/gu

  type Block = DiscussionBlock
  interface Match { start: number; end: number; header: string }

  const matches: Match[] = []
  let m: RegExpExecArray | null
  while ((m = speakerRegex.exec(normalized)) != null) {
    matches.push({
      start: m.index + (m[0].length - m[0].trimStart().length),
      end: m.index + m[0].length,
      header: m[1]!.trim(),
    })
  }

  // Drop false positives — a "match" whose body is only a few chars
  // is almost certainly a bad hit (e.g., "Aisha: yes" mid-sentence).
  // We keep it only if the following body is >= 15 chars OR it's the
  // first/last match (they define the structural bounds).
  const trimmed: Match[] = []
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]!
    const next = matches[i + 1]
    const bodyLen = (next ? next.start : normalized.length) - cur.end
    if (i === 0 || i === matches.length - 1 || bodyLen >= 15) trimmed.push(cur)
  }

  // Fewer than two speakers means the structure was not detected; the
  // caller renders the raw passage rather than an empty card.
  if (trimmed.length < 2) return []

  const blocks: Block[] = []
  for (let i = 0; i < trimmed.length; i++) {
    const h = trimmed[i]!
    const next = trimmed[i + 1]
    const body = normalized
      .slice(h.end, next ? next.start : undefined)
      .replace(/^\s+|\s+$/g, '')
    // First speaker whose header starts with Professor/Prof/Dr is the
    // professor. Any speaker AFTER a professor is a student unless
    // their name is also role-prefixed with Professor/Prof/Dr.
    const isProf =
      /^(Professor|Prof\.?|Dr\.?)\b/i.test(h.header) ||
      (i === 0 && !blocks.some(b => b.role === 'professor') && /\?/.test(body))
    const cleanName = h.header
      .replace(/^(?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '')
      .trim() || h.header
    blocks.push({ role: isProf ? 'professor' : 'student', name: cleanName, body })
  }

  return blocks
}
