/**
 * A cohort cannot be CLEARED by a reader who did not answer.
 *
 * On 2026-08-10 a reviewer sat 20 Academic Talk items and pressed
 * "can't tell" on 19 of them. Abstentions score as not-correct, so the
 * sitting came out at 0.0% — comfortably under HUMAN_CONFIRM_MARGIN,
 * which is the branch that means "a person tried and could not beat the
 * control, so the model's 100% was a false alarm". Both the register
 * renderer and /admin/bank-qc were about to report 275 items as
 * human-cleared on the strength of a sitting that measured nothing.
 *
 * The failure is nasty precisely because the number is not anomalous:
 * 0% is what a perfectly diligent reader on a perfectly sound cohort
 * would also produce. Only the abstention count separates them, and
 * until now nothing carried it into the verdict.
 *
 * BREAK-TEST: delete the `human.cantTell !== undefined && ...` block in
 * progressFor and "refuses to clear a cohort the reader abstained
 * through" fails with 'human-cleared'.
 */
import { progressFor, ABSTENTION_CEILING, type HumanEvidence } from '../bank-targets'

/** Academic Talk: 275 items, blind 100%, 20-item human sitting. */
const DOMAIN = 'Academic Talk'
const ITEMS = 275
const MEASURED = 60
const BLIND = 100

/** The real 2026-08-10 sitting: 19 of 20 abstained, 0 correct. */
const ABSTAINED_THROUGH: HumanEvidence = {
  answered: 20, correct: 0, controlBest: 6, cantTell: 19,
}

/** Same score, but the reader committed on every item. */
const COMMITTED: HumanEvidence = {
  answered: 20, correct: 0, controlBest: 6, cantTell: 0,
}

describe('the abstention guard', () => {
  it('refuses to clear a cohort the reader abstained through', () => {
    const p = progressFor(DOMAIN, ITEMS, MEASURED, BLIND, ABSTAINED_THROUGH)
    expect(p.state).toBe('unconfirmed')
    expect(p.remaining).toContain("can't tell")
    expect(p.remaining).toContain('19')
  })

  it('DOES clear on the same score when the reader committed', () => {
    // The guard must key on abstention, not on the score being low —
    // otherwise it would suppress the genuine clearances (Announcement,
    // Daily Life) that the human-wins rule exists to produce.
    expect(progressFor(DOMAIN, ITEMS, MEASURED, BLIND, COMMITTED).state)
      .toBe('human-cleared')
  })

  it('still CONFIRMS a cohort a committed reader solved', () => {
    // Choose a Response: the guard must not swallow a real confirmation.
    const solved: HumanEvidence = { answered: 20, correct: 16, controlBest: 6, cantTell: 0 }
    expect(progressFor(DOMAIN, ITEMS, MEASURED, BLIND, solved).state).toBe('too-easy')
  })

  it('is a strict majority — exactly half abstained still counts', () => {
    const half: HumanEvidence = { answered: 20, correct: 0, controlBest: 6, cantTell: 10 }
    expect(half.cantTell).toBe(20 * ABSTENTION_CEILING)
    expect(progressFor(DOMAIN, ITEMS, MEASURED, BLIND, half).state).toBe('human-cleared')

    const justOver: HumanEvidence = { answered: 20, correct: 0, controlBest: 6, cantTell: 11 }
    expect(progressFor(DOMAIN, ITEMS, MEASURED, BLIND, justOver).state).toBe('unconfirmed')
  })

  it('leaves callers that cannot supply the count exactly as they were', () => {
    // cantTell is optional so nothing broke on wiring day. Absent means
    // "not known", which must never trigger the guard — a silent
    // behaviour change on an unmigrated caller would be worse than the
    // bug, because it would look like the guard working.
    const unknown: HumanEvidence = { answered: 20, correct: 0, controlBest: 6 }
    expect(progressFor(DOMAIN, ITEMS, MEASURED, BLIND, unknown).state).toBe('human-cleared')
  })

  it('does not fire before there is a sitting worth judging at all', () => {
    // Under HUMAN_VERDICT_MIN the answer is 'unconfirmed' for a
    // different reason, and the message should say so rather than
    // blaming abstention.
    const thin: HumanEvidence = { answered: 5, correct: 0, controlBest: 2, cantTell: 5 }
    const p = progressFor(DOMAIN, ITEMS, MEASURED, BLIND, thin)
    expect(p.state).toBe('unconfirmed')
    expect(p.remaining).toContain('Review 15 more items')
  })
})
