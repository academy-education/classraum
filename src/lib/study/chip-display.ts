/**
 * Build-a-Sentence chip display policy.
 *
 * WHY THIS IS A MODULE AND NOT TWO INLINE ARROW FUNCTIONS.
 *
 * The stored `choices` for an arrange_words item carry the capitalisation
 * the author wrote, and on 2026-08-09 that was measured across the live
 * cohort: 46 of 108 items have exactly ONE capitalised chunk, and in 44 of
 * them (95.7%) that chunk is the correct opener. In the data, the capital
 * letter is a positional tell.
 *
 * Students never see it, because the pool lowercases every chip. That
 * protection was one inline call inside one component with no test — so
 * deleting it would have re-exposed the tell on 41% of the cohort with
 * nothing failing. The data is not the defect; the render is the only
 * thing standing between the data and the student, and an untested guard
 * on a known tell is the shape of defect this bank keeps producing.
 *
 * So the policy lives here and is pinned by chip-display.test.ts. The
 * stored rows are deliberately NOT rewritten: normalising 44 live items
 * would be churn with no student-visible effect, and every touched item is
 * a chance to introduce a new defect.
 */

/** Lowercase the first character; leave the rest exactly as authored. */
export function lcFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

/** Uppercase the first character; leave the rest exactly as authored. */
export function ucFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * The pool of unplaced chips, as the student sees them.
 *
 * Every chip is lowercase-initial so capitalisation carries no positional
 * information. A chunk that is intrinsically capitalised — "Maria", "I" —
 * is lowercased here too: it reads slightly oddly in the pool, and that is
 * the correct trade, because the alternative is that the only capitalised
 * chip in the pool is usually the answer's first word.
 */
export function poolChips(choices: readonly string[], placed: readonly string[]): string[] {
  return choices.filter(c => !placed.includes(c)).map(lcFirst)
}

/**
 * The assembled sentence: slot 0 capitalised so it reads as a sentence,
 * EVERY LATER CHIP LOWERCASED, for the same reason the pool is lowercased.
 *
 * This used to leave later chips "as authored so proper nouns keep their
 * capitals", and that reopened the exact tell the pool exists to close. A
 * user found it on 2026-09-04: place any chunk into slot 0 and the real
 * opener, now sitting in slot 1, still shows its stored capital — so the
 * capitalised chip in the assembled row is the answer, and the student can
 * read it off without solving anything. Re-measured over the live cohort
 * that day: 87 of 165 items (53%) carry a capital on the correct opener,
 * and 2 more carry one on a NON-opener, which is worse than no tell.
 *
 * The proper-noun cost is real and accepted, exactly as it is for the pool:
 * a mid-sentence "maria" reads slightly oddly, and that is the correct
 * trade against handing over the opener on half the cohort.
 */
export function assembledChips(placed: readonly string[]): string[] {
  return placed.map((chip, i) => (i === 0 ? ucFirst(chip) : lcFirst(chip)))
}

/**
 * Terminal punctuation, inferred from the key. Shown as a static token
 * once every chip is placed, so the student is not asked to order a full
 * stop. Defaults to a period when the author emitted none.
 */
export function endPunctuation(correctAnswer: string | null | undefined): string {
  const last = (correctAnswer ?? '').trim().slice(-1)
  return /[.?!]/.test(last) ? last : '.'
}

/**
 * Does this item's stored data carry the positional capitalisation tell?
 *
 * Exported for the bank audit, NOT used at render time — the render is
 * unconditional, which is what makes it safe. Reported by
 * `scripts/study-bank/check-chip-tells.mjs`.
 */
export function leaksOpenerByCapitalisation(
  choices: readonly string[],
  correctAnswer: string | null | undefined,
): boolean {
  const caps = choices.filter(c => /^[A-Z]/.test(c))
  if (caps.length !== 1) return false
  const opener = String(correctAnswer ?? '').split('|')[0]?.trim() ?? ''
  return caps[0].toLowerCase() === opener.toLowerCase()
}
