/**
 * The gate is only real if the INSERT PATH refuses. These tests cover the
 * seam between the TypeScript contract and the plain-ESM helper that does
 * the inserting.
 *
 * Two failure modes are specifically guarded:
 *
 *  1. The contract JSON drifting from the ItemFamily/QcStage unions. bank-qc
 *     casts the JSON to those types, and a cast cannot fail at runtime — so
 *     without this the file could lose a family and TypeScript would keep
 *     insisting everything was fine.
 *
 *  2. A stage with measurements but no verdict counting as a pass. The
 *     ledger stored measurements only, and the dashboard rendered a check
 *     for any stage that had a result — including the pilot's `tells`,
 *     which recorded an 83%-vs-50% key tell. Absence of a verdict is not a
 *     verdict.
 */
import { FAMILY_STAGES, familyForTask, evaluateBatch, type ItemFamily, type QcStage } from '../bank-qc'
import contract from '../../../../scripts/study-bank/gate-contract.json'
import ledger from '../../../../scripts/study-bank/ledger.json'
// The gate the .mjs insert path actually calls.
import { evaluate, familyFor } from '../../../../scripts/study-bank/gate.mjs'

const FAMILIES: ItemFamily[] = ['mc_hidden_source', 'mc_stem_source', 'cloze', 'production']
const SHA = 'a'.repeat(64)

describe('the shared contract', () => {
  it('covers exactly the four families, no more and no fewer', () => {
    expect(Object.keys(contract.familyStages).sort()).toEqual([...FAMILIES].sort())
  })

  it('lists only real stages', () => {
    const known: QcStage[] = ['shape', 'withsource', 'nosource', 'elimination', 'tells']
    for (const stages of Object.values(contract.familyStages)) {
      for (const s of stages) expect(known).toContain(s)
    }
  })

  it('is the same object bank-qc exports — one source, not two', () => {
    expect(FAMILY_STAGES).toEqual(contract.familyStages)
  })

  it('maps every pipeline task to the family bank-qc would pick', () => {
    // familyFor() in gate.mjs reads the JSON; familyForTask() is the TS
    // switch. They must agree for every task, or the insert path gates a
    // batch against the wrong stage list.
    for (const [task, fam] of Object.entries(contract.taskFamily)) {
      if (task.startsWith('sat_')) continue // SAT is decided by section
      const section = fam === 'cloze' ? 'reading' : 'listening'
      expect(familyForTask(task, 'toefl', section)).toBe(fam)
      expect(familyFor(task, 'toefl', section)).toBe(fam)
    }
  })

  it('agrees with the TS switch on SAT, which is decided by section', () => {
    expect(familyFor('multiple_choice', 'sat', 'math')).toBe('mc_stem_source')
    expect(familyFor('multiple_choice', 'sat', 'reading_writing')).toBe('mc_hidden_source')
    expect(familyForTask('multiple_choice', 'sat', 'math')).toBe('mc_stem_source')
  })
})

describe('the .mjs gate mirrors evaluateBatch', () => {
  const stagesAllPassing = (fam: ItemFamily) =>
    Object.fromEntries(FAMILY_STAGES[fam].map(s => [s, { passed: true, contentSha: SHA }]))

  it('admits a batch whose every required stage passed at this hash', () => {
    for (const fam of FAMILIES) {
      expect(evaluate(fam, SHA, stagesAllPassing(fam)).canInsert).toBe(true)
    }
  })

  it('refuses a stage that has measurements but NO verdict', () => {
    // The exact shape the ledger stored before this change.
    const stages = { ...stagesAllPassing('mc_hidden_source'), tells: { keyAtLengthExtremePct: 83, chancePct: 50 } }
    const v = evaluate('mc_hidden_source', SHA, stages)
    expect(v.canInsert).toBe(false)
    expect(v.missing).toContain('tells')
  })

  it('treats a pass recorded against a different hash as stale, not valid', () => {
    const stages = { ...stagesAllPassing('mc_hidden_source'), nosource: { passed: true, contentSha: 'b'.repeat(64) } }
    const v = evaluate('mc_hidden_source', SHA, stages)
    expect(v.canInsert).toBe(false)
    expect(v.stale).toEqual(['nosource'])
    expect(v.failed).toEqual([])   // reported separately — the cause differs
  })

  it('blocks on a single failed stage however many others passed', () => {
    const stages = { ...stagesAllPassing('mc_hidden_source'), elimination: { passed: false, contentSha: SHA } }
    const v = evaluate('mc_hidden_source', SHA, stages)
    expect(v.canInsert).toBe(false)
    expect(v.failed).toEqual(['elimination'])
  })

  it('ignores extra stages rather than crediting them', () => {
    // Adding a cheap new gate must never satisfy a required expensive one.
    const stages = { shape: { passed: true, contentSha: SHA }, somethingNew: { passed: true, contentSha: SHA } }
    const v = evaluate('production', SHA, stages)
    expect(v.canInsert).toBe(false)
    expect(v.missing).toEqual(expect.arrayContaining(['withsource', 'tells']))
  })

  it('does not require nosource/elimination of production tasks', () => {
    // They have no key to leak, so demanding those gates would make every
    // Speaking and Writing batch permanently un-insertable.
    const v = evaluate('production', SHA, stagesAllPassing('production'))
    expect(v.canInsert).toBe(true)
    expect(FAMILY_STAGES.production).not.toContain('nosource')
  })

  it('gives the same verdict as the TypeScript evaluateBatch', () => {
    // Same inputs, same answer — otherwise the admin page and the insert
    // path disagree about whether a batch is servable.
    const runs = FAMILY_STAGES.mc_hidden_source.map(stage => ({
      stage, contentSha: SHA, passed: stage !== 'elimination', ranAt: '2026-08-02T00:00:00Z',
    }))
    const ts = evaluateBatch('mc_hidden_source', SHA, runs)
    const mjs = evaluate('mc_hidden_source', SHA,
      Object.fromEntries(runs.map(r => [r.stage, { passed: r.passed, contentSha: r.contentSha }])))
    expect(mjs.canInsert).toBe(ts.canInsert)
    expect(mjs.failed).toEqual(ts.failed)
  })
})

describe('the real pilot batch', () => {
  it('is refused, and names all four failing gates', () => {
    // 24 items: 0 hard against a 20% standard, 3 items with an option
    // rejectable on sight, an 83%-vs-50% key-length tell with a 6/6 slot-A
    // run, and a sub-batch missing listeningTask. The only stage it passes
    // is the no-source attack, and only after recalibration.
    const batch = ledger.batches[0]
    const v = evaluate('mc_hidden_source', batch.contentSha, batch.stages)
    expect(v.canInsert).toBe(false)
    expect(v.failed.sort()).toEqual(['elimination', 'shape', 'tells', 'withsource'])
    // batches[0] is a specific entry that HAS a nosource stage; the
    // assertion is needed because three production-task entries
    // (build_a_sentence, interview, listen_and_repeat) legitimately have
    // none — a no-source attack is not a question about those items.
    expect(batch.stages.nosource!.passed).toBe(true)
  })
})
