import {
  TARGETS, NOT_APPLICABLE, progressFor, overallProgress, MEANINGFUL_COVERAGE,
  MATHS_WITH_GRAPHIC,
} from '../bank-targets'

/**
 * The finish bar's definition of "done", pinned.
 *
 * The first thing under test is the mistake this table was written to
 * stop. Before it existed, every cohort was judged against one implicit
 * reading bar, and that produced the claim "13 of 14 measured cohorts
 * fail" — which was WRONG for TOEFL lectures. Official ETS lectures
 * score 96.9% blind; the format genuinely is guessable from options plus
 * world knowledge. Holding 274 of our items to a 60% reading bar would
 * have scheduled a rewrite of the one cohort closest to standard.
 *
 * The second is the band's floor. A score UNDER the band is a failure
 * too, and it is the failure a "make it harder" instruction produces if
 * left unbounded: distractors so implausible that a student who read the
 * passage perfectly still cannot choose.
 */
describe('bank targets', () => {
  it('does not judge lectures by the reading bar', () => {
    // The correction, as a test. Same score, same coverage, different
    // task type — and the verdicts must differ.
    const lecture = progressFor('Academic Talk', 274, 60, 88)
    const reading = progressFor('Craft and Structure', 211, 60, 88)

    expect(lecture.state).toBe('done')
    expect(reading.state).toBe('too-easy')

    // And our real lecture number (100%) still fails — being closer to
    // standard is not being at standard.
    expect(progressFor('Academic Talk', 274, 12, 100).state).toBe('too-easy')
  })

  it('treats a score below the band as a failure, not a triumph', () => {
    // "Harder" without a floor produces arbitrary options. 32% on a
    // reading cohort is not a better result than 55% — it means a
    // student who understood the passage cannot pick.
    const p = progressFor('Craft and Structure', 211, 60, 32)
    expect(p.state).toBe('too-hard')
    expect(p.remaining).toContain('arbitrary')

    expect(progressFor('Craft and Structure', 211, 60, 55).state).toBe('done')
  })

  it('keeps the asymmetry: a bad sample is a verdict, a good one is not', () => {
    // 12 of 211 measured. Failing → say so now.
    expect(progressFor('Craft and Structure', 211, 12, 97.4).state).toBe('too-easy')
    // 12 of 211 measured. In band → not enough to claim the cohort.
    const thin = progressFor('Craft and Structure', 211, 12, 55)
    expect(thin.state).toBe('spot-checked')
    expect(thin.remaining).toContain('Attack 31 more')
  })

  it('excludes not-applicable cohorts from the bar entirely', () => {
    // Standard English Conventions carries its sentence in the STEM.
    // There is no withheld source, so the attack is the wrong
    // instrument — counting its 234 items as outstanding would mean the
    // bar could never reach 100%.
    expect(progressFor('Standard English Conventions', 234, 12, 52.8).state)
      .toBe('not-applicable')

    const { total, pct } = overallProgress([
      { domain: 'Standard English Conventions', items: 234, measured: 12, blindPct: 52.8 },
      { domain: 'Craft and Structure', items: 100, measured: 60, blindPct: 55 },
    ])
    expect(total).toBe(100)
    expect(pct).toBe(100)
  })

  it('reports the bank as it actually stands today: 0% done', () => {
    // The real 2026-08-03 sweep. Every measured cohort is above its
    // band, so the honest finish figure is zero — and the bar must not
    // find a way to show progress that has not happened.
    const { done, pct } = overallProgress([
      { domain: 'Academic Passage', items: 433, measured: 12, blindPct: 100 },
      { domain: 'Academic Talk', items: 274, measured: 12, blindPct: 100 },
      { domain: 'Craft and Structure', items: 211, measured: 52, blindPct: 97.4 },
      { domain: 'Choose a Response', items: 71, measured: 12, blindPct: 91.7 },
      { domain: 'Conversation', items: 193, measured: 12, blindPct: 83.3 },
      { domain: 'Build a Sentence', items: 90, measured: 0, blindPct: null },
    ])
    expect(done).toBe(0)
    expect(pct).toBe(0)
  })

  it('says how many items an unmeasured cohort needs', () => {
    const p = progressFor('Conversation', 205, 0, null)
    expect(p.state).toBe('unmeasured')
    expect(p.remaining).toContain('Attack 41 of 205')
    expect(Math.ceil(205 * MEANINGFUL_COVERAGE)).toBe(41)
  })

  it('does not judge maths with an instrument that keeps the whole problem', () => {
    /*
     * All four maths domains scored 100% "blind" and were reported as
     * the bank's worst cohorts. The attack KEEPS the stem — right for
     * listening and reading, where the withheld source is the audio or
     * passage — but a maths item has no separate source: `passage` is
     * null on all 848 and the stem IS the problem. So 100% meant the
     * solver did the algebra, not that the item leaked.
     *
     * The band that judged them came from a comment in bank-targets.ts
     * claiming the attack "removes the stem entirely". Nothing checked
     * that sentence, and it was false.
     */
    for (const d of ['Algebra', 'Advanced Math', 'Geometry and Trigonometry',
                     'Problem-Solving and Data Analysis']) {
      expect(NOT_APPLICABLE.has(d)).toBe(true)
      // Even a perfect-looking 100% must not be reported as a failure.
      expect(progressFor(d, 205, 12, 100).state).toBe('not-applicable')
      expect(TARGETS[d]).toBeUndefined()
    }

    // 848 maths items must leave the denominator entirely...
    const { total } = overallProgress([
      { domain: 'Algebra', items: 205, measured: 12, blindPct: 100 },
      { domain: 'Advanced Math', items: 207, measured: 12, blindPct: 100 },
      { domain: 'Geometry and Trigonometry', items: 225, measured: 12, blindPct: 100 },
      { domain: 'Problem-Solving and Data Analysis', items: 211, measured: 12, blindPct: 100 },
      { domain: 'Conversation', items: 193, measured: 12, blindPct: 83.3 },
    ])
    expect(total).toBe(193)

    // ...but the 132 that carry a FIGURE are recorded, not forgotten.
    // A figure-blind attack could judge those; it does not exist yet.
    expect(Object.values(MATHS_WITH_GRAPHIC).reduce((a, b) => a + b, 0)).toBe(132)
  })

  it('every band sits below its published baseline', () => {
    // The product goal is items a little HARDER than the public tests.
    // A band whose ceiling met or exceeded the official figure would
    // encode "as easy as the real thing", which is not the ask.
    for (const [domain, t] of Object.entries(TARGETS)) {
      expect(t.min).toBeLessThan(t.max)
      expect(t.note).not.toHaveLength(0)
      if (t.published !== null) {
        expect(t.max).toBeLessThan(t.published)
      }
      expect(NOT_APPLICABLE.has(domain)).toBe(false)
    }
  })

  it('flags a domain with no target rather than passing it silently', () => {
    const p = progressFor('Some New Task Type', 50, 20, 40)
    expect(p.state).toBe('unmeasured')
    expect(p.remaining).toContain('No target set')
  })
})
