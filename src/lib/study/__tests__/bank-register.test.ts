import { WORK, SETTLED, FOUND_WHILE_FIXING, registerSummary } from '../bank-register'

/*
 * The register is the ONE list, and it is rendered in two places — the
 * admin page and REGISTER.md. These pin the properties that make it
 * usable rather than the prose, which will change constantly.
 */
describe('bank register', () => {
  it('gives every open item an id, a concrete size and a reason', () => {
    /*
     * "size" is required because "three small data defects" turned out
     * to be one 36-item problem, one disagreement with the reviewer and
     * one non-issue. A work item that cannot state its size has not
     * been looked at.
     */
    for (const w of WORK) {
      expect(w.id).toMatch(/^[AB]\d+$/)
      expect(w.size.trim().length).toBeGreaterThan(0)
      expect(w.why.trim().length).toBeGreaterThan(20)
    }
  })

  it('has no duplicate ids', () => {
    const ids = WORK.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the A/B prefix to mean who is blocked', () => {
    // A = I can do it now. B = it needs a person. The prefix is load
    // bearing: it is how the dashboard splits the list, and a mislabelled
    // item silently moves work onto the wrong person's plate.
    for (const w of WORK) {
      expect(w.owner).toBe(w.id.startsWith('A') ? 'claude' : 'you')
    }
  })

  it('counts open work by owner, ignoring anything done', () => {
    const s = registerSummary([
      { id: 'A1', title: 't', size: 's', why: 'a reason long enough to pass', owner: 'claude', state: 'open' },
      { id: 'A2', title: 't', size: 's', why: 'a reason long enough to pass', owner: 'claude', state: 'done' },
      { id: 'B1', title: 't', size: 's', why: 'a reason long enough to pass', owner: 'you', state: 'open' },
    ])
    expect(s).toEqual({ open: 2, mine: 1, yours: 1, done: 1 })
  })

  it('routes every "found while fixing" entry somewhere', () => {
    /*
     * The whole point of that section is that nothing is recorded
     * without a destination. An entry with no work item and no "fixed"
     * is a finding that has been written down and dropped — which is
     * the failure the section exists to prevent.
     */
    const ids = new Set(WORK.map(w => w.id))
    for (const f of FOUND_WHILE_FIXING) {
      expect(f.landedAs === 'fixed' || ids.has(f.landedAs)).toBe(true)
    }
  })

  it('points every dependency at a real work item, never at itself', () => {
    const ids = new Set(WORK.map(w => w.id))
    for (const w of WORK) {
      for (const dep of w.dependsOn ?? []) {
        expect(ids.has(dep)).toBe(true)
        expect(dep).not.toBe(w.id)
      }
    }
  })

  it('does not leave an open item blocked by something already done', () => {
    /*
     * The failure this catches is silent and expensive: B1 lands, A3 is
     * now startable, and nothing says so because the blocker is prose.
     * A stale dependency makes work look blocked when it is free.
     */
    const state = new Map(WORK.map(w => [w.id, w.state]))
    const stale = WORK
      .filter(w => w.state !== 'done')
      .flatMap(w => (w.dependsOn ?? []).map(dep => ({ id: w.id, dep, depState: state.get(dep) })))
      .filter(d => d.depState === 'done')
    expect(stale).toEqual([])
  })

  it('never assigns one login to two different work items', () => {
    /*
     * Reviewer identity IS the account — study_item_reviews keys on the
     * logged-in user. Two people sharing a login merge into one
     * reviewer_id, which is exactly the failure B1 exists to detect, and
     * it would be invisible: the sitting would complete and report
     * nothing wrong.
     *
     * This was a real slip, not a hypothetical: B1 and B2 were both
     * pointed at andy.manager@ while the prose was being written.
     */
    const seen = new Map<string, string>()
    for (const w of WORK) {
      if (!w.account) continue
      const prior = seen.get(w.account)
      expect(prior === undefined || prior === w.id).toBe(true)
      seen.set(w.account, w.id)
    }
  })

  it('gives an account only to work a person does', () => {
    for (const w of WORK) {
      if (w.account) expect(w.owner).toBe('you')
    }
  })

  it('says who specifically only where the person is not interchangeable', () => {
    // whoSpecifically exists for B1, where the reader who did every
    // prior sitting must NOT be the one who does this one. It is
    // meaningless on work I do, so it must not appear there.
    for (const w of WORK) {
      if (w.whoSpecifically) expect(w.owner).toBe('you')
    }
  })

  it('keeps settled findings pointed at their evidence', () => {
    // A closed question with no document is an assertion, and assertions
    // are what get re-litigated. The grader-calibration entry is the one
    // deliberate exception — its evidence is the absence of public data.
    const undocumented = SETTLED.filter(s => !s.doc)
    expect(undocumented).toHaveLength(1)
    expect(undocumented[0].title).toMatch(/calibrated/)
  })
})
