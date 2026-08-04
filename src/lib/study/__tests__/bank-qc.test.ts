/**
 * These assertions exist because each one corresponds to a way items have
 * actually reached the bank unchecked. A test that only proved "all gates
 * pass => insert" would be green in every historical failure.
 */
import {
  evaluateBatch, familyForTask, explainVerdict, FAMILY_STAGES,
  type QcRun, type QcStage,
} from '../bank-qc'

const SHA = 'a'.repeat(64)
const OTHER_SHA = 'b'.repeat(64)

const run = (stage: QcStage, passed: boolean, sha = SHA, ranAt = '2026-08-01T10:00:00Z'): QcRun =>
  ({ stage, passed, contentSha: sha, ranAt })

const allPassing = (stages: readonly QcStage[], sha = SHA) => stages.map(s => run(s, true, sha))

describe('familyForTask', () => {
  it('routes the four option-less TOEFL types away from the MC gates', () => {
    // These have no key to leak, so requiring a no-source attack on them
    // would be requiring a measurement that does not exist.
    for (const t of ['speaking_repeat', 'speaking_interview', 'arrange_words',
      'writing_email', 'writing_discussion']) {
      expect(familyForTask(t, 'toefl', 'speaking')).toBe('production')
    }
  })

  it('routes Complete the Words to cloze, not MC', () => {
    expect(familyForTask('fill_in_blanks', 'toefl', 'reading')).toBe('cloze')
  })

  it('routes SAT math to the stem-is-the-source family', () => {
    // Maths needs the stem stripped, not the passage — and the verbal tell
    // scripts read "clean" on it no matter what, because maths options carry
    // no hedges or absolutes.
    expect(familyForTask('multiple_choice', 'sat', 'math')).toBe('mc_stem_source')
    expect(familyForTask('multiple_choice', 'sat', 'reading_writing')).toBe('mc_hidden_source')
  })

  it('routes ordinary listening/reading MC to the full treatment', () => {
    for (const t of ['choose_response', 'conversation', 'announcement',
      'academic_talk', 'daily_life', 'academic_passage']) {
      expect(familyForTask(t, 'toefl', 'listening')).toBe('mc_hidden_source')
    }
  })
})

describe('evaluateBatch — the gate itself', () => {
  it('permits insert only when every required stage passed at this hash', () => {
    const v = evaluateBatch('mc_hidden_source', SHA, allPassing(FAMILY_STAGES.mc_hidden_source))
    expect(v.canInsert).toBe(true)
    expect(v).toMatchObject({ missing: [], failed: [], stale: [] })
  })

  it('BLOCKS when a required stage never ran', () => {
    // The historical default: shape passed, a human wrote ids into a keep
    // file, and the item inserted having been checked for nothing else.
    const runs = [run('shape', true)]
    const v = evaluateBatch('mc_hidden_source', SHA, runs)
    expect(v.canInsert).toBe(false)
    expect(v.missing).toEqual(['withsource', 'nosource', 'elimination', 'tells'])
  })

  it('BLOCKS when a required stage ran and failed', () => {
    const runs = allPassing(FAMILY_STAGES.mc_hidden_source)
      .map(r => (r.stage === 'nosource' ? { ...r, passed: false } : r))
    const v = evaluateBatch('mc_hidden_source', SHA, runs)
    expect(v.canInsert).toBe(false)
    expect(v.failed).toEqual(['nosource'])
  })

  it('BLOCKS when the items were edited after the gates passed — the hash-binding case', () => {
    // Every stage passed, but against the PREVIOUS content. This is the one
    // an id keep-list structurally cannot catch, and it is why the ledger
    // stores a hash rather than a list of ids.
    const runs = allPassing(FAMILY_STAGES.mc_hidden_source, OTHER_SHA)
    const v = evaluateBatch('mc_hidden_source', SHA, runs)
    expect(v.canInsert).toBe(false)
    expect(v.stale).toEqual([...FAMILY_STAGES.mc_hidden_source])
    expect(v.missing).toEqual([])   // reported as stale, not missing, so the cause is legible
  })

  it('lets a re-run at the same hash clear an earlier failure', () => {
    const runs: QcRun[] = [
      ...allPassing(FAMILY_STAGES.mc_hidden_source.filter(s => s !== 'tells')),
      run('tells', false, SHA, '2026-08-01T10:00:00Z'),
      run('tells', true, SHA, '2026-08-01T12:00:00Z'),   // fixed, re-run, same content
    ]
    expect(evaluateBatch('mc_hidden_source', SHA, runs).canInsert).toBe(true)
  })

  it('does NOT let a later PASS at a different hash paper over a failure at this one', () => {
    const runs: QcRun[] = [
      ...allPassing(FAMILY_STAGES.mc_hidden_source.filter(s => s !== 'tells')),
      run('tells', false, SHA, '2026-08-01T10:00:00Z'),
      run('tells', true, OTHER_SHA, '2026-08-01T12:00:00Z'),
    ]
    const v = evaluateBatch('mc_hidden_source', SHA, runs)
    expect(v.canInsert).toBe(false)
    expect(v.failed).toEqual(['tells'])
  })

  it('ignores extra stages rather than crediting them', () => {
    // Adding a cheap new gate must never satisfy a required expensive one.
    const runs: QcRun[] = [
      run('shape', true),
      { stage: 'somethingNew' as QcStage, passed: true, contentSha: SHA, ranAt: '2026-08-01T11:00:00Z' },
    ]
    const v = evaluateBatch('mc_hidden_source', SHA, runs)
    expect(v.canInsert).toBe(false)
    expect(v.missing).toContain('nosource')
  })
})

describe('evaluateBatch — family-specific requirements', () => {
  it('does not demand nosource/elimination of production tasks', () => {
    // Requiring a no-source attack on Listen-and-Repeat would block a task
    // type that has no options at all — the gate would be unsatisfiable.
    const v = evaluateBatch('production', SHA, allPassing(FAMILY_STAGES.production))
    expect(v.canInsert).toBe(true)
    expect(FAMILY_STAGES.production).not.toContain('nosource')
    expect(FAMILY_STAGES.production).not.toContain('elimination')
  })

  it('still demands shape, withsource and tells of production tasks', () => {
    const v = evaluateBatch('production', SHA, [run('shape', true)])
    expect(v.canInsert).toBe(false)
    expect(v.missing).toEqual(['withsource', 'tells'])
  })

  it('does not demand elimination of cloze or stem-source maths', () => {
    // There are no distractors to reject in a cloze, and for maths the
    // options-only attack already subsumes it.
    expect(FAMILY_STAGES.cloze).not.toContain('elimination')
    expect(FAMILY_STAGES.mc_stem_source).not.toContain('elimination')
    expect(evaluateBatch('cloze', SHA, allPassing(FAMILY_STAGES.cloze)).canInsert).toBe(true)
  })

  it('every family requires shape, withsource and tells', () => {
    for (const stages of Object.values(FAMILY_STAGES)) {
      expect(stages).toContain('shape')
      expect(stages).toContain('withsource')   // answerable + right difficulty
      expect(stages).toContain('tells')        // batch-level, invisible per item
    }
  })
})

describe('explainVerdict', () => {
  it('names the edited-after-approval case distinctly', () => {
    const v = evaluateBatch('mc_hidden_source', SHA, allPassing(FAMILY_STAGES.mc_hidden_source, OTHER_SHA))
    expect(explainVerdict(v)).toMatch(/edited after the gate passed/)
  })

  it('reports a clean batch as insertable', () => {
    const v = evaluateBatch('cloze', SHA, allPassing(FAMILY_STAGES.cloze))
    expect(explainVerdict(v)).toMatch(/all required gates passed/)
  })
})

describe('TASK_PIPELINES agrees with familyForTask', () => {
  // The pipeline table carries `family` as a display property so the admin UI
  // can group by test/section instead of by family. That duplication is only
  // safe if it cannot drift from the function the gate logic actually uses.
  const { TASK_PIPELINES } = jest.requireActual('../task-pipelines')

  it.each(TASK_PIPELINES as { task: string; label: string; test: string; section: string; family: string }[])(
    '$label resolves to the same family the gate logic would pick',
    (p) => {
      const family = p.test === 'SAT' ? 'sat' : 'toefl'
      const section = p.task === 'sat_math' ? 'math'
        : p.task === 'sat_rw' ? 'reading_writing'
        : p.section.toLowerCase()
      expect(familyForTask(p.task, family, section)).toBe(p.family)
    }
  )

  it('covers every task the coverage table reports on', () => {
    // A task present in the bank but missing here would render as a blank
    // card — silently, which is how the missing listeningTask field shipped.
    const covered = new Set(TASK_PIPELINES.map((p: { task: string }) => p.task))
    for (const t of ['choose_response', 'conversation', 'announcement', 'academic_talk',
      'daily_life', 'academic_passage', 'fill_in_blanks', 'speaking_repeat',
      'speaking_interview', 'arrange_words', 'writing_email', 'writing_discussion',
      'sat_rw', 'sat_math']) {
      expect(covered.has(t)).toBe(true)
    }
  })
})
