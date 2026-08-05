/**
 * Repair for generated questions that put the PASSAGE in the prompt.
 *
 * ── The defect ───────────────────────────────────────────────────────
 * Measured 2026-08-05 while sampling generator output for the blind
 * attack: 46 of 709 distinct generated items (6.5%) carry the whole
 * reading passage inside `prompt`, with `passage` empty. One ran to
 * 1,015 characters against a median real stem of 88.
 *
 * Two consequences, and the second is the one that matters:
 *   1. The student meets the passage twice, or in the wrong place.
 *   2. No answerability gate can judge the item. The attack works by
 *      withholding the SOURCE; if the source is inside the stem there
 *      is nothing to withhold, and a correct answer is a legitimate
 *      solve rather than a leak. Those 46 items were silently
 *      unmeasurable — the same trap that made 848 maths items look
 *      like the bank's worst cohorts (see bank-targets.ts).
 *
 * ── Why this refuses rather than guesses ─────────────────────────────
 * A wrong split is worse than no split: it would quietly hand the
 * student a truncated question, and the failure would be invisible
 * because the item still renders. This repo's own rule is that fixing
 * a loud failure by making it quiet is a regression.
 *
 * So `splitSourceFromStem` returns null whenever it is not confident,
 * and the caller leaves the item exactly as it was. An item that stays
 * broken and visible is a better outcome than one that is silently
 * wrong.
 */

/** A real stem in this bank runs 38-189 chars (median 88). Prose this
 *  long is a passage, not a question. Deliberately well clear of the
 *  longest genuine stem so a verbose question is never split. */
export const MAX_STEM_CHARS = 320

/** Below this the leading text is not a passage — splitting would just
 *  be moving a long question into the wrong field. */
const MIN_PASSAGE_CHARS = 150

/** A stem longer than this is not a stem, so a "split" that produced
 *  one has found the wrong boundary. */
const MAX_SPLIT_STEM_CHARS = 260

/*
 * Openers that mark the start of the actual question.
 *
 * Split into STRONG and WEAK because the first version of this list
 * treated bare "when / what / how / who / where / why" as sufficient,
 * and expository prose opens sentences that way constantly. The very
 * passage this repair was built for contains "When a resource is used
 * more efficiently, each unit ... becomes cheaper" — mid-passage — and
 * the splitter happily amputated everything after it. A test caught it;
 * production would not have, because the mangled item still renders.
 *
 * STRONG openers are multi-word and effectively never begin a sentence
 * of narrative prose. WEAK openers are the interrogative words, which
 * count ONLY when the sentence is actually a question.
 */
const STRONG_OPENERS = new RegExp(
  '^(which (choice|of the following)|according to the|as used in|based on the|' +
  'in the (passage|text|context)|the (author|passage|text|speaker|writer) (most|primarily|mainly|suggests|implies|indicates)|' +
  'it can (be inferred|reasonably be)|the main (idea|purpose|point)|' +
  'select the|choose the|identify the|complete the)\\b',
  'i',
)
const WEAK_OPENERS = /^(which|what|who|when|where|why|how)\b/i

/** Is this sentence the question, rather than a line of the passage? */
function looksLikeStem(s: string): boolean {
  if (STRONG_OPENERS.test(s)) return true
  // A weak opener needs the question mark to prove itself.
  return s.endsWith('?') && WEAK_OPENERS.test(s)
}

export interface SplitResult {
  passage: string
  prompt: string
}

/**
 * Pull a leading passage out of a stem, or return null.
 *
 * `tag` — a leading "[Academic — Biology]" marker is kept ON THE STEM,
 * not moved into the passage. It is metadata the harvester and the
 * blueprint quotas read; burying it in the passage would break the
 * cohort routing that depends on it.
 */
export function splitSourceFromStem(rawPrompt: string): SplitResult | null {
  const raw = (rawPrompt ?? '').trim()
  if (raw.length <= MAX_STEM_CHARS) return null

  // Detach a leading [ ... ] tag before doing anything else.
  const tagMatch = raw.match(/^\s*(\[[^\]]*\])\s*/)
  const tag = tagMatch ? tagMatch[1] : ''
  const body = tagMatch ? raw.slice(tagMatch[0].length) : raw

  // Sentence boundaries. Deliberately simple: a wrong boundary here
  // makes the confidence checks below fail, which makes us return null,
  // which is the safe outcome.
  const sentences = body.split(/(?<=[.?!])\s+/).filter(s => s.trim())
  if (sentences.length < 2) return null

  /*
   * Walk backwards to the FIRST sentence (from the end) that looks like
   * the start of a question, and split there. Walking from the end
   * rather than the start matters: a passage can itself contain a
   * sentence beginning "Which", and splitting at the earliest match
   * would amputate most of the passage into the stem.
   */
  for (let i = sentences.length - 1; i >= 1; i--) {
    const s = sentences[i].trim()
    if (!looksLikeStem(s)) continue

    const passage = sentences.slice(0, i).join(' ').trim()
    const stem = sentences.slice(i).join(' ').trim()

    if (passage.length < MIN_PASSAGE_CHARS) return null
    if (stem.length > MAX_SPLIT_STEM_CHARS) continue   // boundary too early
    if (!stem) return null

    return { passage, prompt: tag ? `${tag} ${stem}` : stem }
  }

  // Long, but no recognisable question boundary. Leave it alone and
  // visible rather than inventing a split.
  return null
}

/** Does this item carry its source inside the stem? Used by the QC
 *  scripts to COUNT the defect without repairing it, so the rate stays
 *  reportable after the repair lands. */
export function hasSourceInStem(prompt: string | null | undefined, passage: string | null | undefined): boolean {
  if (passage && passage.trim()) return false
  return (prompt ?? '').trim().length > MAX_STEM_CHARS
}
