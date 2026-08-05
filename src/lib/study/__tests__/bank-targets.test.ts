import {
  TARGETS, NOT_APPLICABLE, progressFor, overallProgress, MEANINGFUL_COVERAGE,
  MATHS_WITH_GRAPHIC, HUMAN_VERDICT_MIN,
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
    // 88% is inside the lecture band and OVER the reading band, so the
    // two task types must reach different verdicts on the same score.
    // Since 2026-08-06 an over-band score with no human sitting behind
    // it reads `unconfirmed` rather than `too-easy` — the contrast this
    // test protects is unchanged, only the name of the failing state.
    expect(reading.state).toBe('unconfirmed')

    // And our real lecture number (100%) still does not pass — being
    // closer to standard is not being at standard.
    expect(progressFor('Academic Talk', 274, 12, 100).state).not.toBe('done')
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
    /*
     * The asymmetry is unchanged — a bad score at thin coverage is still
     * acted on immediately, while a good one waits for volume. What
     * changed on 2026-08-06 is the EVIDENCE required: a bad MODEL score
     * alone now reads `unconfirmed`, because three cohorts rated 100% by
     * every solver were then scored at or below chance by a person.
     * With a human sitting behind it, 12 measured items still convict.
     */
    expect(progressFor('Craft and Structure', 211, 12, 97.4).state).toBe('unconfirmed')
    expect(progressFor('Craft and Structure', 211, 12, 97.4,
      { answered: 20, correct: 12, controlBest: 5 }).state).toBe('too-easy')
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

  /*
   * ── The correction of 2026-08-06 ───────────────────────────────────
   * The bar reported "1,746 too guessable, 0% done" on model solve
   * rates alone. Four human sittings (72 items) then showed the model
   * is trustworthy where a cohort's tell is STRUCTURAL and inflated
   * where the item carries a passage it happens to know about:
   *
   *   Announcement       model 100%   human 15.0%  vs 25% control
   *   Daily Life         model 100%   human 25.0%  vs 25%
   *   Choose a Response  model 100%   human 55.0%  vs 25%   p<0.001
   *
   * A model-only "too easy" is a suspicion. Only a human turns it into
   * a verdict — or clears it.
   */
  it('will not call a cohort too-easy on model evidence alone', () => {
    // Announcement's real numbers: model says 100%, nobody has looked.
    const p = progressFor('Announcement', 121, 12, 100, null)
    expect(p.state).toBe('unconfirmed')
    expect(p.remaining).toContain('no human sitting has confirmed it')
    expect(p.remaining).toContain('20')
  })

  it('a thin human sitting does not settle it either', () => {
    // Academic Passage: 12 answered, +16.7 — suggestive, under the bar.
    const p = progressFor('Academic Passage', 433, 12, 100,
      { answered: 12, correct: 5, controlBest: 3 })
    expect(p.state).toBe('unconfirmed')
    expect(p.remaining).toContain('Review 8 more items')
    expect(HUMAN_VERDICT_MIN).toBe(20)
  })

  it('CONFIRMS when a human reproduces the effect', () => {
    // Choose a Response, the real sitting: 11/20 against a 5/20 control.
    const p = progressFor('Choose a Response', 72, 12, 91.7,
      { answered: 20, correct: 11, controlBest: 5 })
    expect(p.state).toBe('too-easy')
    expect(p.remaining).toContain('CONFIRMED by hand')
    expect(p.remaining).toContain('55.0%')
    expect(p.remaining).toContain('+30')
  })

  it('CLEARS a cohort when the human contradicts the model', () => {
    // Announcement, the real sitting: 3/20 against a 5/20 control —
    // BELOW chance, against a model score of 100%.
    const p = progressFor('Announcement', 121, 12, 100,
      { answered: 20, correct: 3, controlBest: 5 })
    expect(p.state).toBe('human-cleared')
    expect(p.remaining).toContain('world knowledge')
    expect(p.remaining).toContain('No rewrite justified')
  })

  it('stops the bar claiming 1,746 items are failing on model evidence', () => {
    // The four cohorts as they actually stand today.
    const cohorts = [
      { domain: 'Academic Passage', items: 433, measured: 12, blindPct: 100,
        human: { answered: 12, correct: 5, controlBest: 3 } },      // thin
      { domain: 'Announcement', items: 121, measured: 12, blindPct: 100,
        human: { answered: 20, correct: 3, controlBest: 5 } },      // cleared
      { domain: 'Daily Life', items: 133, measured: 12, blindPct: 100,
        human: { answered: 20, correct: 5, controlBest: 5 } },      // cleared
      { domain: 'Choose a Response', items: 72, measured: 12, blindPct: 91.7,
        human: { answered: 20, correct: 11, controlBest: 5 } },     // confirmed
    ]
    const { done, total, pct } = overallProgress(cohorts)

    // 254 of 759 items are now positively accounted for by a human,
    // where the old bar counted all 759 as failing.
    expect(total).toBe(759)
    expect(done).toBe(121 + 133)
    expect(pct).toBe(33)

    // And the one cohort a human confirmed is still failing.
    expect(progressFor('Choose a Response', 72, 12, 91.7, cohorts[3].human).state)
      .toBe('too-easy')
  })
})
