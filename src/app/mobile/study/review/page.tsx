"use client"

import { WrongNotebookInner } from '../_shared/WrongNotebookView'

/**
 * /mobile/study/review — the Review tab now hosts the wrong-answer
 * notebook (오답노트): every missed question with inline notes, filters,
 * search, and a print export. The shared inner component carries its own
 * empty state, so a student with no misses gets a friendly prompt rather
 * than a blank tab. Rendered in `asTab` mode (no back button — it's a
 * bottom-nav root).
 */
export default function ReviewPage() {
  return <WrongNotebookInner asTab />
}
