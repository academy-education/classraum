/**
 * The QC ledger contract: which gates a batch of authored items must clear
 * before it may enter `study_item_bank`, and whether a given batch has
 * cleared them.
 *
 * WHY THIS IS CODE AND NOT A CHECKLIST
 *
 * Until 2026-08-01 the only gates between an authored item and the bank were
 * the four inside `insertListening()`: JSON shape, explanation-order safety,
 * group size, and "the id appears in a hand-written keep file". Nothing
 * checked whether an item was answerable, how hard it was, or whether it
 * could be solved without its source. A bank-wide audit then found every
 * verbal task type 92.7-100% solvable with the audio or passage hidden.
 *
 * A 24-item pilot authored specifically to fix that came back with zero hard
 * items against a bank standard of 20%, one item with two defensible
 * answers, a 6-of-6 slot-A run in one sub-batch, and a uniform key shape in
 * another. The authors had followed the written constraint. Instructions do
 * not hold; gates do.
 *
 * TWO THINGS THIS ENCODES THAT A CHECKLIST CANNOT
 *
 * 1. HASH BINDING. Every gate result is bound to the sha256 of the exact
 *    item file it judged. Edit one option after review and every prior pass
 *    goes stale. A keep-list of ids cannot express that, which is how items
 *    have historically been changed after approval.
 *
 * 2. FAMILY-SPECIFIC GATES. Four of the eleven TOEFL task types have no
 *    options at all, so "hide the source and see if a solver still picks the
 *    key" is not a question that parses for them. Applying one profile to
 *    everything is the same error as importing Writing's zero-conditions
 *    into the Speaking rubric — see the CLAUDE.md corollary. Each family
 *    declares its own required stages.
 */

/** Item families, grouped by what a "guessability" attack even MEANS. */
export type ItemFamily =
  /** MC whose source (audio/passage) is separate and can be withheld.
   *  choose_response, conversation, announcement, academic_talk,
   *  daily_life, academic_passage, all SAT reading_writing. */
  | 'mc_hidden_source'
  /** MC where the STEM is the source — nothing to withhold but the question.
   *  All SAT math. Attack is options-only; chance is the honest floor. */
  | 'mc_stem_source'
  /** Cloze. Ten scored blanks, first letters given, no options.
   *  Complete the Words. No key positions exist to check. */
  | 'cloze'
  /** Production tasks with no key to leak. speaking_repeat,
   *  speaking_interview, arrange_words, writing_email, writing_discussion. */
  | 'production'

export type QcStage =
  | 'shape'        // mechanical: schema, distinct options, key present, no dupe stems
  | 'withsource'   // answerable? right difficulty? right construct?
  | 'nosource'     // guessable with the source hidden?
  | 'elimination'  // any option confidently rejectable without the source?
  | 'tells'        // batch-level: key position, length extremity, key-shape uniformity

/**
 * Required stages per family. `shape` and `tells` are universal; the two
 * source-hiding stages exist only where there is a source to hide and a key
 * to leak.
 *
 * Production tasks deliberately require only shape + withsource + tells:
 * there is no key, so nosource and elimination are undefined for them. Their
 * real failure modes (a prompt with no answerable reading, a second valid
 * word order, a rubric that cannot separate bands) are checked inside
 * `withsource` for that family.
 */
export const FAMILY_STAGES: Record<ItemFamily, readonly QcStage[]> = {
  mc_hidden_source: ['shape', 'withsource', 'nosource', 'elimination', 'tells'],
  mc_stem_source: ['shape', 'withsource', 'nosource', 'tells'],
  cloze: ['shape', 'withsource', 'nosource', 'tells'],
  production: ['shape', 'withsource', 'tells'],
} as const

/** Maps a bank task to its family. The task string is the one the DRAW
 *  reads — item->>'listeningTask' / 'readingTask', or item->>'type' for the
 *  types that carry neither. Never the `domain` column: the two disagree,
 *  and a served item once escaped an audit because of it. */
export function familyForTask(task: string, family: 'toefl' | 'sat', section: string): ItemFamily {
  if (family === 'sat') return section === 'math' ? 'mc_stem_source' : 'mc_hidden_source'
  switch (task) {
    case 'fill_in_blanks':
      return 'cloze'
    case 'speaking_repeat':
    case 'speaking_interview':
    case 'arrange_words':
    case 'writing_email':
    case 'writing_discussion':
      return 'production'
    default:
      // choose_response, conversation, announcement, academic_talk,
      // daily_life, academic_passage
      return 'mc_hidden_source'
  }
}

export interface QcRun {
  stage: QcStage
  /** sha256 of the item file this run judged. */
  contentSha: string
  passed: boolean
  /** Free-form measurements — accuracy, control, difficulty mix, etc.
   *  Stored so a later reader can re-derive the verdict, not just trust it. */
  metrics?: Record<string, unknown>
  ranAt: string
}

export interface BatchVerdict {
  canInsert: boolean
  /** Required stages with no run at the current hash. */
  missing: QcStage[]
  /** Stages that ran at the current hash and failed. */
  failed: QcStage[]
  /** Stages whose only runs were against a DIFFERENT hash — i.e. the items
   *  were edited after that gate passed. Treated exactly like missing, and
   *  reported separately so the cause is obvious. */
  stale: QcStage[]
}

/**
 * Decide whether a batch may be inserted.
 *
 * Deliberately strict in three ways, each earned by a real incident:
 *  - a run at a different hash counts for nothing (items edited post-QC)
 *  - a single failed stage blocks, regardless of the others
 *  - unknown/extra stages are ignored rather than credited, so adding a new
 *    cheap gate can never accidentally satisfy a required expensive one
 */
export function evaluateBatch(
  family: ItemFamily,
  currentSha: string,
  runs: readonly QcRun[],
): BatchVerdict {
  const required = FAMILY_STAGES[family]
  const missing: QcStage[] = []
  const failed: QcStage[] = []
  const stale: QcStage[] = []

  for (const stage of required) {
    const atCurrent = runs.filter(r => r.stage === stage && r.contentSha === currentSha)
    if (atCurrent.length === 0) {
      // Distinguish "never ran" from "ran, then the items changed". Both
      // block, but only one of them means someone edited after approval.
      const anyRun = runs.some(r => r.stage === stage)
      ;(anyRun ? stale : missing).push(stage)
      continue
    }
    // If a stage was run more than once at this hash, the LATEST wins — a
    // re-run after a fix should be able to clear an earlier failure, but it
    // must be a re-run at the same content.
    const latest = atCurrent.reduce((a, b) => (b.ranAt > a.ranAt ? b : a))
    if (!latest.passed) failed.push(stage)
  }

  return {
    canInsert: missing.length === 0 && failed.length === 0 && stale.length === 0,
    missing,
    failed,
    stale,
  }
}

/** One-line reason for a blocked insert, for logs and the admin view. */
export function explainVerdict(v: BatchVerdict): string {
  if (v.canInsert) return 'all required gates passed at the current content hash'
  const parts: string[] = []
  if (v.failed.length) parts.push(`failed: ${v.failed.join(', ')}`)
  if (v.missing.length) parts.push(`never run: ${v.missing.join(', ')}`)
  if (v.stale.length) parts.push(`stale (items edited after the gate passed): ${v.stale.join(', ')}`)
  return parts.join('; ')
}
