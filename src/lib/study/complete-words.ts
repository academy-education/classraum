/**
 * TOEFL "Complete the Words" (item_type 'fill_in_blanks'): every blank must
 * be a DIFFERENT word.
 *
 * Found 2026-10-16 by the owner sitting TOEFL Reading with a student: one
 * paragraph blanked "boundaries" four times ("bound[3]", "bound[6]", …), so
 * the same five letters were the answer to four of its ten questions. A scan
 * of the bank found 15 of 93 live paragraphs repeating a blanked word
 * (psychology x3, biology x3, increases x3, …). The generator prompt never
 * forbade it and no check looked for it.
 *
 * A blank's word is the letters written immediately before its [N] token
 * plus the blank's answer, compared case-insensitively.
 */

export interface BlankLike { id: number; answer: string }

/** The full word each blank completes, in blank order, lower-cased. */
export function blankWords(passage: string, blanks: readonly BlankLike[]): string[] {
  return blanks.map((b) => {
    const m = passage.match(new RegExp(`([A-Za-z\\u00C0-\\u024F'’-]*)\\[${b.id}\\]`))
    return ((m ? m[1] : '') + (b.answer ?? '')).toLowerCase()
  })
}

/** Words completed by more than one blank (empty array = valid). */
export function repeatedBlankWords(passage: string, blanks: readonly BlankLike[]): string[] {
  const seen = new Map<string, number>()
  for (const w of blankWords(passage, blanks)) {
    if (!w) continue
    seen.set(w, (seen.get(w) ?? 0) + 1)
  }
  return [...seen].filter(([, n]) => n > 1).map(([w]) => w)
}
