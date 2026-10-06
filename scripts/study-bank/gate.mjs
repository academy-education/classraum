/**
 * The insert gate, callable from the plain-ESM bank helpers.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * `src/lib/study/bank-qc.ts` defined the contract and nothing enforced it:
 * `evaluateBatch` had no caller outside its own tests, and the live insert
 * path — `insertListening()` in toefl-bank-helper.mjs — imported nothing from
 * it. A documented gate nobody runs is an instruction, and this project's
 * whole thesis is that instructions do not hold and gates do.
 *
 * The helpers are .mjs and cannot import .ts without a build step, so the
 * CONTRACT lives in gate-contract.json and both sides read it. There is no
 * second hand-written copy: a second copy is precisely what let the admin
 * dashboard's stage list silently lose the `tells` gate.
 *
 * WHAT IT CHECKS
 *
 * A batch may insert only when every stage its FAMILY requires has a run
 * that (a) passed and (b) was recorded against the sha256 of the exact item
 * file being inserted. Editing one option after review changes the hash and
 * makes every prior pass STALE — which blocks, and is reported separately so
 * the cause is unambiguous.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { eliminationVerdict } from './elimination-paired.mjs'
import { scanFiles, describeHits } from './question-number-refs.mjs'
import { checkFiles as checkStemDuplicates, describe as describeStemDuplicates } from './stem-duplicates.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const contract = JSON.parse(readFileSync(join(HERE, 'gate-contract.json'), 'utf8'))
const ledgerPath = join(HERE, 'ledger.json')

/** sha256 of an item file, byte-for-byte. The same bytes the reviewer saw. */
export function shaOfFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** Family for a task, mirroring familyForTask() in bank-qc.ts via the shared
 *  contract. SAT is decided by section, TOEFL by task. */
export function familyFor(task, family, section) {
  /*
   * MATHS IS DECIDED BY SECTION, NOT BY FAMILY — fixed 2026-09-04.
   *
   * This read `if (family === 'sat')`, so only SAT maths resolved to
   * mc_stem_source. ACT, ISEE and SSAT maths fell through to the task map,
   * missed it (their rows carry task 'multiple_choice'), and defaulted to
   * mc_hidden_source — which requires an `elimination` stage. Elimination
   * is a probe for "can you reject an option with the SOURCE hidden", and a
   * maths item's source is its stem: there is nothing to hide. So the gate
   * demanded, of every non-SAT maths batch, a stage that cannot be run on
   * it, and would have refused every one. Caught when act-math-v4gi and
   * isee-math-s8 were gated with all four mc_stem_source stages recorded
   * and passing.
   *
   * The rule that is actually true: the maths stem IS the source, whoever
   * writes the exam.
   */
  if (section === 'math') return 'mc_stem_source'
  if (family === 'sat') return 'mc_hidden_source'
  return contract.taskFamily[task] ?? 'mc_hidden_source'
}

/**
 * Verdict for one batch. Mirrors evaluateBatch() in bank-qc.ts — the same
 * three-way split, and the same deliberate strictness:
 *   - a run at a different hash counts for nothing
 *   - one failed stage blocks regardless of the others
 *   - unknown/extra stages are ignored rather than credited, so adding a
 *     cheap gate can never accidentally satisfy a required expensive one
 */
export function evaluate(family, currentSha, stages, opts = {}) {
  const required = contract.familyStages[family] ?? []
  const missing = [], failed = [], stale = [], notes = []
  for (const stage of required) {
    const r = stages?.[stage]
    if (!r) { missing.push(stage); continue }
    /*
     * SAT R&W ELIMINATION IS RE-DERIVED, NOT TRUSTED (register A23, 2026-10-02).
     * The old bar — zero confidently rejectable options — was met by no shipped
     * cohort, so it was overridden twice and then read five different ways in
     * later ledger entries. The bar is now a margin over a matched live control
     * (elimination-paired.mjs). The gate recomputes the verdict from the
     * recorded numbers: a stage without them, or whose `passed` disagrees with
     * them, does not count — the same reason the inserters re-derive the drop
     * rule from qc.json instead of trusting a ledger script.
     */
    if (stage === 'elimination' && opts.pairedElimination) {
      if (r.contentSha && r.contentSha !== currentSha) { stale.push(stage); continue }
      const v = eliminationVerdict(r)
      if (v.verdict === 'none') { missing.push(stage); notes.push(`elimination: no verdict under the paired-control bar (${v.why}); run scripts/study-bank/elimination-paired.mjs`); continue }
      if ((v.verdict === 'pass') !== (r.passed === true)) { failed.push(stage); notes.push(`elimination: recorded passed=${r.passed} but its own numbers say ${v.verdict} (${v.why})`); continue }
      if (v.verdict === 'fail') { failed.push(stage); notes.push(`elimination: ${v.why}`) }
      continue
    }
    // A stage with no explicit `passed` is NOT a pass. The ledger used to
    // store measurements only, and the dashboard rendered a check for any
    // stage that had a result — including one recording an 83%-vs-50% key
    // tell. Absence of a verdict is not a verdict.
    if (r.passed !== true && r.passed !== false) { missing.push(stage); continue }
    if (r.contentSha && r.contentSha !== currentSha) { stale.push(stage); continue }
    if (!r.passed) failed.push(stage)
  }
  return { canInsert: missing.length === 0 && failed.length === 0 && stale.length === 0, missing, failed, stale, notes }
}

/** Human-readable reason, so a refusal says what to run rather than just no. */
export function explain(v) {
  if (v.canInsert) return 'all required gates passed at this content hash'
  const parts = []
  if (v.failed.length) parts.push(`FAILED: ${v.failed.join(', ')}`)
  if (v.missing.length) parts.push(`never run: ${v.missing.join(', ')}`)
  if (v.stale.length) parts.push(`stale (items edited after the gate passed): ${v.stale.join(', ')}`)
  for (const n of v.notes ?? []) parts.push(n)
  return parts.join(' | ')
}

/**
 * Gate a batch about to be inserted.
 *
 * `itemFiles` are hashed together, in the order given, so the verdict is
 * bound to the exact content. Returns { canInsert, sha, reason, batch }.
 *
 * A batch with no ledger entry at all is REFUSED, not waved through — the
 * default for an unreviewed batch has to be "no", or the gate is decoration.
 */
export function gateBatch({ task, family, section, itemFiles, liveStems }) {
  const fam = familyFor(task, family, section)
  const h = createHash('sha256')
  for (const f of itemFiles) h.update(readFileSync(f))
  const sha = h.digest('hex')

  /*
   * HARDCODED QUESTION NUMBERS (register A74 follow-up, 2026-10-02). Ten live
   * act-english-v1 stems read "Question 10 asks about the preceding passage";
   * on any drawn form that names the wrong question. No ledger stage looks for
   * it, so it is checked here, before the ledger, for every inserter. A file
   * this check cannot read throws (question-number-refs.mjs) rather than
   * passing silently.
   */
  const q = scanFiles(itemFiles)
  if (q.hits.length) {
    return {
      canInsert: false, sha, family: fam, batch: null, questionNumberRefs: q.hits,
      reason: `${q.hits.length} hardcoded question-number reference(s) — items are drawn into a new order, so this text names the wrong question on a form. Reword position-independently ("This question asks…"):\n    ${describeHits(q.hits)}`,
    }
  }

  /*
   * STEM DUPLICATES (REGISTER §5, 2026-10-06). Nine live pairs shared a stem
   * (+passage+graphic) with different distractors and no passage group, so the
   * one-per-group draw rule could not keep them apart; ISEE "ARDUOUS" was served
   * twice in one form. Refused here against the LIVE bank (same family) and
   * within the batch, unless the two share a passage group (an intentional set).
   * The live read throws on failure rather than passing the batch. `liveStems`
   * lets a test inject the live rows.
   */
  const d = checkStemDuplicates(itemFiles, family, { live: liveStems })
  if (d.hits.length) {
    return {
      canInsert: false, sha, family: fam, batch: null, stemDuplicates: d.hits,
      reason: `${d.hits.length} stem duplicate(s) — the same question (stem+passage+graphic) is already live or appears twice in this batch, with no shared passage group, so one form can draw both. Drop or rewrite the duplicate, or give an intentional set a shared passage group:\n    ${describeStemDuplicates(d.hits)}`,
    }
  }

  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  const batch = (ledger.batches || []).find(b => b.contentSha === sha)
  if (!batch) {
    return {
      canInsert: false, sha, family: fam, batch: null,
      reason: `no QC ledger entry for content hash ${sha.slice(0, 12)}. Run the gates and record them in scripts/study-bank/ledger.json before inserting.`,
    }
  }
  const v = evaluate(fam, sha, batch.stages, { pairedElimination: family === 'sat' && section === 'reading_writing' })
  return { ...v, sha, family: fam, batch: batch.id, reason: explain(v) }
}

/** Escape hatch, deliberately loud and deliberately narrow.
 *
 *  Set BANK_GATE_OVERRIDE to a REASON string (not "1", not "true") to insert
 *  past a refusal. The reason is printed and must be recorded in the ledger
 *  afterwards. This exists because orphan-repair batches legitimately carry
 *  fewer items than a gate expects — not so the gate can be skipped when it
 *  is inconvenient. */
export function overrideReason() {
  const r = process.env.BANK_GATE_OVERRIDE
  if (!r || r === '1' || r === 'true') return null
  return r
}
