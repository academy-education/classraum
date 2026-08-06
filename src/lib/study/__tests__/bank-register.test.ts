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

  it('keeps settled findings pointed at their evidence', () => {
    // A closed question with no document is an assertion, and assertions
    // are what get re-litigated. The grader-calibration entry is the one
    // deliberate exception — its evidence is the absence of public data.
    const undocumented = SETTLED.filter(s => !s.doc)
    expect(undocumented).toHaveLength(1)
    expect(undocumented[0].title).toMatch(/calibrated/)
  })
})
