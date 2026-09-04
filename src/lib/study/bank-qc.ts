import contract from '../../../scripts/study-bank/gate-contract.json'

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
 * STATUS: WIRED IN as of 2026-08-02.
 *
 * `insertListening()` in scripts/study-bank/toefl-bank-helper.mjs now calls
 * `gateBatch()` before it touches the database and exits 1 on a refusal.
 * Verified end-to-end, in both directions: an ungated batch is refused, a
 * batch whose every stage passes at its hash is admitted, and flipping one
 * stage to failed refuses it again naming that stage.
 *
 * The helper is plain ESM and cannot import this .ts module without a build
 * step. Rather than keep a second hand-written copy of the stage list — the
 * drift that let the admin dashboard silently lose `tells` — the DATA moved
 * to scripts/study-bank/gate-contract.json and both sides read it. This file
 * still owns the types and the semantics; gate.mjs mirrors evaluateBatch,
 * and gate-wiring.test.ts asserts the two give identical verdicts.
 *
 * Ledger stage results now carry `passed`. Before, they held measurements
 * only, and anything holding a measurement read as done — including the
 * pilot's `tells`, which recorded an 83%-vs-50% key-length tell and rendered
 * as a tick. Absence of a verdict is not a verdict, and the gate treats a
 * stage with no explicit `passed` as never having run.
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
/* The data lives in gate-contract.json, not here, because the LIVE INSERT
 * PATH is scripts/study-bank/toefl-bank-helper.mjs — plain ESM, which cannot
 * import a .ts module without a build step. The alternative was a second
 * hand-written copy in the helper, and a second hand-written copy is exactly
 * what let the dashboard's stage list silently lose `tells`. One file, two
 * readers. `bank-qc.test.ts` pins the JSON's shape so this cast cannot drift
 * into a lie. */
export const FAMILY_STAGES = contract.familyStages as Record<ItemFamily, readonly QcStage[]>

/** Maps a bank task to its family. The task string is the one the DRAW
 *  reads — item->>'listeningTask' / 'readingTask', or item->>'type' for the
 *  types that carry neither. Never the `domain` column: the two disagree,
 *  and a served item once escaped an audit because of it. */
export function familyForTask(
  task: string,
  family: 'toefl' | 'sat' | 'act' | 'isee' | 'ssat',
  section: string,
): ItemFamily {
  /*
   * MATHS IS DECIDED BY SECTION, NOT BY FAMILY — widened 2026-09-04, and
   * the family union with it. This read `if (family === 'sat')`, so only
   * SAT maths reached mc_stem_source; ACT, ISEE and SSAT maths fell through
   * to the task switch, missed it (those rows carry task 'multiple_choice')
   * and defaulted to mc_hidden_source, which requires an `elimination`
   * stage. Elimination probes "can you reject an option with the SOURCE
   * hidden", and a maths item's source is its stem — there is nothing to
   * hide, so the gate was demanding a stage that cannot be run. Mirrored in
   * familyFor() in scripts/study-bank/gate.mjs, which is the insert path.
   */
  if (section === 'math') return 'mc_stem_source'
  if (family === 'sat') return 'mc_hidden_source'
  switch (task) {
    case 'fill_in_blanks':
      return 'cloze'
    case 'speaking_repeat':
    // insertRepeat passes the gate the row task 'listen_and_repeat' —
    // fifth occurrence of the unmapped-task-name trap.
    case 'listen_and_repeat':
    case 'speaking_interview':
    // insertFrozen's interview spec passes the row task 'interview'
    // (matching the FROZEN table), so both names must resolve here —
    // the same trap arrange_words/build_a_sentence hit.
    case 'interview':
    case 'arrange_words':
    // The bank ROW carries task='build_a_sentence' while the item type is
    // 'arrange_words'; insertFrozen passes the row name to the gate, so
    // both must resolve to production or the gate demands nosource /
    // elimination stages that cannot exist for a no-options item type.
    case 'build_a_sentence':
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
