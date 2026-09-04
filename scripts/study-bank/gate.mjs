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
export function evaluate(family, currentSha, stages) {
  const required = contract.familyStages[family] ?? []
  const missing = [], failed = [], stale = []
  for (const stage of required) {
    const r = stages?.[stage]
    if (!r) { missing.push(stage); continue }
    // A stage with no explicit `passed` is NOT a pass. The ledger used to
    // store measurements only, and the dashboard rendered a check for any
    // stage that had a result — including one recording an 83%-vs-50% key
    // tell. Absence of a verdict is not a verdict.
    if (r.passed !== true && r.passed !== false) { missing.push(stage); continue }
    if (r.contentSha && r.contentSha !== currentSha) { stale.push(stage); continue }
    if (!r.passed) failed.push(stage)
  }
  return { canInsert: missing.length === 0 && failed.length === 0 && stale.length === 0, missing, failed, stale }
}

/** Human-readable reason, so a refusal says what to run rather than just no. */
export function explain(v) {
  if (v.canInsert) return 'all required gates passed at this content hash'
  const parts = []
  if (v.failed.length) parts.push(`FAILED: ${v.failed.join(', ')}`)
  if (v.missing.length) parts.push(`never run: ${v.missing.join(', ')}`)
  if (v.stale.length) parts.push(`stale (items edited after the gate passed): ${v.stale.join(', ')}`)
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
export function gateBatch({ task, family, section, itemFiles }) {
  const fam = familyFor(task, family, section)
  const h = createHash('sha256')
  for (const f of itemFiles) h.update(readFileSync(f))
  const sha = h.digest('hex')

  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  const batch = (ledger.batches || []).find(b => b.contentSha === sha)
  if (!batch) {
    return {
      canInsert: false, sha, family: fam, batch: null,
      reason: `no QC ledger entry for content hash ${sha.slice(0, 12)}. Run the gates and record them in scripts/study-bank/ledger.json before inserting.`,
    }
  }
  const v = evaluate(fam, sha, batch.stages)
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
