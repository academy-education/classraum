/**
 * TOEFL Writing per-section timing (Jan-2026 format).
 *
 * The Writing section is three tasks delivered in a fixed order —
 * 10 Build-a-Sentence, 1 Email, 1 Academic Discussion — and each task
 * is its OWN timed block: 6 / 7 / 10 minutes. When a block's clock
 * hits zero the test hard-advances to the next block; unanswered items
 * in the expired block stay `null`, which is exactly the representation
 * /api/study/test/submit already grades as blank (gradeAnswer returns
 * false for null/empty, and the client's submit path pads unanswered
 * slots with explicit nulls).
 *
 * Everything here is pure so the splitting + expiry-marking logic is
 * unit-testable without the TestSession component. TestSession derives
 * the sections from the DELIVERED questions (not from a spec lookup),
 * so a short warmup or a single-domain drill — which contains only one
 * task group — falls back to the ordinary whole-test timer:
 * `splitWritingSections` returns null for anything that isn't a
 * multi-task Writing run.
 */

export type WritingSectionKind = 'build_sentence' | 'email' | 'discussion'

/** Per-task time budgets in minutes. 6 + 7 + 10 = 23, which must match
 *  TOEFL_META.writing.minutes and TEST_SPECS' Writing minutesPerSection
 *  (pinned by writing-section-timing.test.ts). */
export const WRITING_SECTION_MINUTES: Record<WritingSectionKind, number> = {
  build_sentence: 6,
  email: 7,
  discussion: 10,
}

const KIND_BY_TYPE: Record<string, WritingSectionKind> = {
  arrange_words: 'build_sentence',
  writing_email: 'email',
  writing_discussion: 'discussion',
}

export interface WritingSection {
  kind: WritingSectionKind
  /** Index of the first question in this section. */
  startIdx: number
  /** Exclusive end — first index NOT in this section. */
  endIdx: number
  /** Time budget for this section. */
  minutes: number
}

/**
 * Split a delivered question list into per-task timed sections.
 *
 * Section boundary = consecutive runs of the same writing task type,
 * in delivery order. Returns null (caller keeps the whole-test timer)
 * when:
 *   - any question is not a Writing task type (this is not a Writing
 *     section test), or
 *   - there are fewer than two task groups (single-task warmups and
 *     domain drills are not the sectioned exam).
 */
export function splitWritingSections(
  questions: ReadonlyArray<{ type?: string | null }>,
): WritingSection[] | null {
  if (questions.length === 0) return null
  const sections: WritingSection[] = []
  for (let i = 0; i < questions.length; i++) {
    const kind = KIND_BY_TYPE[questions[i]?.type ?? '']
    if (!kind) return null
    const last = sections[sections.length - 1]
    if (last && last.kind === kind && last.endIdx === i) {
      last.endIdx = i + 1
    } else {
      sections.push({ kind, startIdx: i, endIdx: i + 1, minutes: WRITING_SECTION_MINUTES[kind] })
    }
  }
  if (sections.length < 2) return null
  return sections
}

/** Which section a question index belongs to. Indexes past the end
 *  clamp to the last section (defensive — should not happen). */
export function writingSectionForIndex(sections: WritingSection[], idx: number): number {
  for (let s = 0; s < sections.length; s++) {
    if (idx < sections[s]!.endIdx) return s
  }
  return sections.length - 1
}

/**
 * Remaining ms in a section. `sectionStartMs` is the whole-test
 * ACTIVE-elapsed value (TestSession's currentElapsedMs) at the moment
 * the student entered the section — 0 for the first section. Clamped
 * at 0 so the countdown never renders negative.
 */
export function writingSectionRemainingMs(
  section: WritingSection,
  sectionStartMs: number,
  elapsedMs: number,
): number {
  return Math.max(0, section.minutes * 60_000 - (elapsedMs - sectionStartMs))
}

/**
 * Pin every unanswered slot of an expired section to `null` — the
 * exact representation the submit path already produces for skipped
 * questions (TestSession pads with `answers[i] ?? null`, and the
 * server's gradeAnswer treats null as blank). Whitespace-only and
 * empty-string leftovers (a cleared arrange_words leaves "") are
 * normalised to null too; real answers — including partial chip
 * arrangements — are untouched, as is everything outside the section.
 */
export function blankUnansweredInSection(
  answers: ReadonlyArray<string | null>,
  section: WritingSection,
): (string | null)[] {
  const out = answers.slice()
  for (let i = section.startIdx; i < section.endIdx && i < out.length; i++) {
    const v = out[i]
    if (v == null || v.trim() === '') out[i] = null
  }
  return out
}
