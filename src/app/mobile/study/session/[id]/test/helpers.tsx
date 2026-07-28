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
/**
 * Renders a prompt with its leading task tag in bold.
 *
 * Every generated stem opens with the task in brackets — "[Choose a
 * Response]", "[Daily Life — job ad]", "[Complete the Words]". That tag
 * is the fastest way to know what KIND of question you are looking at,
 * and it was rendering in the same weight as the stem, so it read as part
 * of the sentence rather than as a label on it.
 *
 * Only a tag at the very start counts, and only when it is short enough
 * to be a label — a stem that happens to quote bracketed text mid-sentence
 * is left alone.
 */
export function PromptText({ text, className }: {
  text: string | null | undefined
  className?: string
}) {
  const full = normalizeDisplayText(text)
  const m = /^\s*\[([^\]\n]{1,48})\]\s*/.exec(full)
  if (!m) return <span className={className}>{full}</span>
  return (
    <span className={className}>
      <strong className="font-bold">{m[1]}</strong>
      {' '}
      {full.slice(m[0].length)}
    </span>
  )
}

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

/** Canonical form of a passage used ONLY for equality checks between
 *  two items. Display normalization + whitespace collapse, so items
 *  that differ solely in escaping or spacing still count as the same
 *  passage. */
function passageKey(text: string | null | undefined): string {
  return normalizeDisplayText(text).replace(/\s+/g, ' ').trim()
}

/**
 * Split the question list into passage RUNS: maximal spans of
 * CONSECUTIVE questions that share both a `passageGroupId` and the
 * exact same passage text (and live in the same adaptive module).
 *
 * Why not group by `passageGroupId` alone (what this used to do):
 * production data has corrupt group ids — a single id can span many
 * genuinely different passage texts. The card renders the PER-ITEM
 * `question.passage`, so grouping by id alone printed "Question 3 of
 * 5 in this passage" over five different passages. The counter must
 * only ever describe what the student can actually see, so two items
 * belong to the same run only if their passage text is identical.
 *
 * Runs are contiguous on purpose: walking Next through a run is then
 * guaranteed to keep the same passage on screen. A group id whose
 * items are scattered gets reported as several short runs — an
 * undercount, never a false claim.
 *
 * Returns an array parallel to `questions`; entry i is the run index
 * for question i, or -1 for questions that are not part of any
 * passage run.
 */
function passageRuns(questions: Question[], moduleBreakIdx?: number): number[] {
  const runOf: number[] = new Array(questions.length).fill(-1)
  let run = -1
  let prev: { id: string; text: string } | null = null
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const id = q?.passageGroupId
    // Complete-the-Words items stand alone by design (one paragraph =
    // one item with 10 blanks). If the model erroneously emits a
    // passageGroupId on a fill_in_blanks item, treat it as ungrouped.
    if (!id || q?.type === 'fill_in_blanks') { prev = null; continue }
    const text = passageKey(q.passage)
    // No passage text = nothing the counter could honestly describe.
    if (!text) { prev = null; continue }
    // The adaptive module boundary always breaks a run: Module 2 is
    // appended after the break and must never be merged into a
    // Module 1 passage set (its ids can even collide with M1's).
    const atModuleBreak = typeof moduleBreakIdx === 'number' && i === moduleBreakIdx
    if (!prev || atModuleBreak || prev.id !== id || prev.text !== text) run++
    runOf[i] = run
    prev = { id, text }
  }
  return runOf
}

/** Compute passage-group context for the current question — used to
 *  show "Passage X — Question Y of Z in this passage" labels on
 *  shared-passage tests (TOEFL/IELTS/ACT Reading). Returns null when
 *  the current question isn't part of a multi-question passage set
 *  that the UI can display consistently.
 *
 *  `moduleBreakIdx` is the index of the first Module 2 question on
 *  adaptive tests; passing it keeps Module 1 and Module 2 items out
 *  of the same passage set. Group numbering is scoped to the current
 *  module, so Module 2 counts its own passages from 1 (Module 2 is
 *  appended mid-session; a whole-test total would change under the
 *  student's feet). */
export function passageGroupInfo(
  questions: Question[],
  currentIdx: number,
  moduleBreakIdx?: number,
): {
  groupIndex: number
  totalGroups: number
  indexInGroup: number
  totalInGroup: number
} | null {
  const runOf = passageRuns(questions, moduleBreakIdx)
  const currentRun = runOf[currentIdx]
  if (currentRun == null || currentRun < 0) return null

  // Restrict numbering to the current adaptive module.
  const inModule2 = typeof moduleBreakIdx === 'number' && currentIdx >= moduleBreakIdx
  const lo = inModule2 ? moduleBreakIdx! : 0
  const hi = typeof moduleBreakIdx === 'number' && !inModule2 ? moduleBreakIdx : questions.length

  const runsInModule: number[] = []
  let totalInGroup = 0
  let indexInGroup = 0
  for (let i = lo; i < hi; i++) {
    const r = runOf[i]
    if (r < 0) continue
    if (!runsInModule.includes(r)) runsInModule.push(r)
    if (r === currentRun) {
      totalInGroup++
      if (i <= currentIdx) indexInGroup++
    }
  }
  // A one-question "passage set" is not a set — saying "Question 1 of
  // 1 in this passage" adds nothing and, on corrupt data, is exactly
  // where the old code produced its worst claims.
  if (totalInGroup < 2) return null
  const totalGroups = runsInModule.length
  if (totalGroups < 2) return null // not worth showing for single group
  return {
    groupIndex: runsInModule.indexOf(currentRun) + 1,
    totalGroups,
    indexInGroup,
    totalInGroup,
  }
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
