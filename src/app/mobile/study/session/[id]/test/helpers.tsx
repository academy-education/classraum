"use client"

import type { Question } from './types'

/**
 * Normalize display text so students don't see raw \n or **bold**
 * markers when the model leaks JSON-escapes or markdown into passage /
 * prompt / choice fields:
 *   - Literal "\n" (backslash + n as two chars, from double-encoded
 *     JSON strings the model occasionally emits) → real newline
 *   - Literal "\t" → real tab
 *   - "**bold**" → bold
 *   - "*italic*" → italic (single-star pairs only; won't touch a lone
 *     "*" or math like "2*3")
 *   - Leading "# " / "## " / "### " heading markers stripped
 *   - Escaped quotes \" → "
 *
 * Applied at every user-facing render site (passage, prompt, choice,
 * correct-answer display).
 */
export function normalizeDisplayText(text: string | null | undefined): string {
  if (!text) return ''
  let s = String(text)
  // Escaped whitespace + quote fixes first — order matters so later
  // regexes see real newlines.
  s = s.replace(/\\n/g, '\n')
       .replace(/\\t/g, '\t')
       .replace(/\\"/g, '"')
       .replace(/\\'/g, "'")
  // Markdown bold/italic — only inline pairs, not standalone stars.
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '$1')
       .replace(/(?<![*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1')
  // Heading markers at line start.
  s = s.replace(/^#{1,4}\s+/gm, '')
  return s
}

/** Test-format-aware choice label. KSAT uses circled digits ①-⑤,
 *  everything else uses Latin letters A-F. Falls back to numeric
 *  index if `family` is unknown or index out of range. */
export function choiceLabel(family: string | null | undefined, index: number): string {
  if (family === 'ksat') {
    const circled = ['①', '②', '③', '④', '⑤', '⑥']
    return circled[index] ?? `${index + 1}.`
  }
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']
  return letters[index] ?? `${index + 1}.`
}

/**
 * Convert a per-section percent (0-100) into the TOEFL Jan 2026
 * 1-6 band score (0.5 increments). ETS aligns the band to CEFR;
 * the mapping below is calibrated against the pre-2026 0-30 band
 * descriptors (Advanced ≥24, High-Int 18-23, Low-Int 4-17, Below 0-3)
 * extrapolated into the new scale. ETS hasn't published an exact
 * crosswalk yet, so this is best-effort and worth re-tuning when
 * official descriptors land.
 */
export function percentToToeflBand(percent: number): number {
  if (percent >= 95) return 6.0
  if (percent >= 88) return 5.5
  if (percent >= 80) return 5.0
  if (percent >= 70) return 4.5
  if (percent >= 60) return 4.0
  if (percent >= 50) return 3.5
  if (percent >= 38) return 3.0
  if (percent >= 25) return 2.5
  if (percent >= 15) return 2.0
  if (percent >= 5) return 1.5
  return 1.0
}

export function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Compute passage-group context for the current question — used to
 *  show "Passage X — Question Y of Z in this passage" labels on
 *  shared-passage tests (TOEFL/IELTS/ACT Reading). Returns null when
 *  the test has no passage groups or the current question is
 *  ungrouped. */
export function passageGroupInfo(questions: Question[], currentIdx: number): {
  groupIndex: number
  totalGroups: number
  indexInGroup: number
  totalInGroup: number
} | null {
  const currentQuestion = questions[currentIdx]
  const currentGroupId = currentQuestion?.passageGroupId
  if (!currentGroupId) return null
  // Complete-the-Words items stand alone by design (one paragraph =
  // one item with 10 blanks). If the model erroneously emits a
  // passageGroupId on a fill_in_blanks item, the grouper would
  // display "Question X of Y in this passage" but each item has a
  // different passage — confusing. Force-treat as ungrouped.
  if (currentQuestion?.type === 'fill_in_blanks') return null
  // Walk the list in order. Each new groupId increments groupIndex.
  // Within a group, count items to find this question's position.
  const groupOrder: string[] = []
  for (const q of questions) {
    const id = q.passageGroupId
    if (id && !groupOrder.includes(id)) groupOrder.push(id)
  }
  const totalGroups = groupOrder.length
  if (totalGroups < 2) return null // not worth showing for single group
  const groupIndex = groupOrder.indexOf(currentGroupId) + 1
  const inGroup = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.passageGroupId === currentGroupId)
  const totalInGroup = inGroup.length
  const indexInGroup = inGroup.findIndex(({ i }) => i === currentIdx) + 1
  return { groupIndex, totalGroups, indexInGroup, totalInGroup }
}

/** Renders a passage as one `<p>` per paragraph, with first-line
 *  indent on every paragraph after the first. Splits on `\n\n` (the
 *  encoding the generator uses). Single-paragraph passages render
 *  flat (no indent) since there's nothing to differentiate. Multi-
 *  paragraph passages get an indent on paragraphs 2+ so the reader
 *  can immediately see "this is a new paragraph" without having to
 *  notice the vertical gap. */
export function PassageParagraphs({ text }: { text: string }) {
  const normalized = normalizeDisplayText(text)
  // Split on one-or-more blank lines. Trim each paragraph so leading
  // whitespace from the model doesn't fight the indent we're adding.
  const paragraphs = normalized.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length <= 1) {
    // No paragraph breaks — render with whitespace-pre-wrap so any
    // intra-paragraph line breaks the model emits still show.
    return <p className="whitespace-pre-wrap">{normalized}</p>
  }
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap"
          // First paragraph flush left; subsequent paragraphs get a
          // first-line indent. Bumped from 2em → 2.5em and space-y
          // 2 → 3 because the previous spacing was too tight for
          // students to perceive paragraph breaks at a glance.
          style={i === 0 ? undefined : { textIndent: '2.5em' }}
        >
          {p}
        </p>
      ))}
    </div>
  )
}

export function fmtTick(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(Math.abs(v) < 1 ? 2 : 1)
}
