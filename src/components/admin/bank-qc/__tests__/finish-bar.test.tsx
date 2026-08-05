import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LiveBankState } from '../LiveBankState'

/**
 * The finish bar, rendered.
 *
 * /admin/bank-qc is behind an admin login, so this is where the bar is
 * actually exercised. It is fed the SHAPE the live route returns, with
 * the real 2026-08-03 sweep numbers, so a change that makes the bar
 * claim progress the bank has not made fails here.
 */
jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: null } }) } },
}))

// Real cohorts, real scores, as they stand after the four human sittings
// of 2026-08-06. The bar used to put every measured item in one red
// "too guessable" segment on MODEL evidence alone; a person then scored
// at or below chance on two of those cohorts. Model-flagged-but-unchecked
// is now amber, red means a human reproduced it, and cleared counts as
// finished.
const LIVE = {
  generatedAt: '2026-08-04T00:00:00.000Z',
  totals: { items: 3369, measured: 212, unmeasured: 3157 },
  finish: { done: 0, humanCleared: 254, tooEasy: 72, unconfirmed: 918, tooHard: 0,
            spotChecked: 0, unmeasured: 205, total: 1449, pct: 18 },
  cohorts: [
    {
      family: 'toefl', domain: 'Academic Passage', items: 433, multipleChoice: 433,
      measured: 12, unmeasured: 421, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'unconfirmed', target: { min: 50, max: 60, published: 71.6, note: 'College Board SAT R&W scores 71.6% blind.' },
      remaining: 'Model solvers score 100%, 40pts over the band — but no human sitting has confirmed it. Review 8 more items by hand before rewriting anything.',
    },
    {
      family: 'toefl', domain: 'Academic Talk', items: 274, multipleChoice: 274,
      measured: 12, unmeasured: 262, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'unconfirmed', target: { min: 80, max: 90, published: 96.9, note: 'Official ETS lectures score 96.9% blind.' },
      remaining: 'Model solvers score 100%, 10pts over the band — but no human sitting has confirmed it. Review 20 more items by hand before rewriting anything.',
    },
    {
      family: 'sat', domain: 'Craft and Structure', items: 211, multipleChoice: 211,
      measured: 52, unmeasured: 159, blindPct: 97.4, everySolverGotIt: 50, status: 'badly-guessable',
      progress: 'unconfirmed', target: { min: 50, max: 60, published: 71.6, note: 'College Board SAT R&W scores 71.6% blind.' },
      remaining: 'Model solvers score 97.4%, 37.4pts over the band — but no human sitting has confirmed it. Review 20 more items by hand before rewriting anything.',
    },
    {
      // CONFIRMED. Model 91.7%; a person then scored 11/20 against a
      // 5/20 control — 3.1 sd, p<0.001. The only cohort where the two
      // instruments agree, and the only one still in red.
      family: 'toefl', domain: 'Choose a Response', items: 72, multipleChoice: 72,
      measured: 12, unmeasured: 60, blindPct: 91.7, everySolverGotIt: 11, status: 'badly-guessable',
      progress: 'too-easy', target: { min: 45, max: 55, published: 62.2, note: 'ETS reply items score 62.2% blind.' },
      remaining: '36.7pts too guessable, CONFIRMED by hand: a human scored 55.0% vs a 25.0% control (+30pts) over 20 items. Rewrite distractors so the score falls to 45-55%.',
    },
    {
      // CLEARED. Model said 100%; the human scored 15% against a 25%
      // control — BELOW chance. The model was reading its own world
      // knowledge, not a leak.
      family: 'toefl', domain: 'Announcement', items: 121, multipleChoice: 121,
      measured: 12, unmeasured: 109, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'human-cleared', target: { min: 38, max: 45, published: 47.8, note: 'Short exchange band.' },
      remaining: 'Model solvers score 100%, but a human scored 15.0% against a 25.0% control across 20 items (-10pts). The model number reflects its own world knowledge, not a leak. No rewrite justified on this evidence.',
    },
    {
      family: 'toefl', domain: 'Daily Life', items: 133, multipleChoice: 133,
      measured: 12, unmeasured: 121, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'human-cleared', target: { min: 38, max: 45, published: 47.8, note: 'Short exchange band.' },
      remaining: 'Model solvers score 100%, but a human scored 25.0% against a 25.0% control across 20 items (+0pts). The model number reflects its own world knowledge, not a leak. No rewrite justified on this evidence.',
    },
    {
      // The real 2026-08-03 figure, from an instrument that cannot judge
      // this task type: a conventions item carries its sentence in the
      // stem, so the attack withholds nothing.
      family: 'sat', domain: 'Standard English Conventions', items: 234, multipleChoice: 234,
      measured: 12, unmeasured: 222, blindPct: 52.8, judgeable: false,
      everySolverGotIt: 6, status: 'not-applicable',
      progress: 'not-applicable', target: null, remaining: '',
    },
    {
      family: 'sat', domain: 'Algebra', items: 205, multipleChoice: 205,
      measured: 0, unmeasured: 205, blindPct: null, everySolverGotIt: 0, status: 'unmeasured',
      progress: 'unmeasured', target: { min: 25, max: 35, published: null, note: 'Judged against chance.' },
      remaining: 'Attack 41 of 205 items to reach a verdict.',
    },
    {
      family: 'toefl', domain: 'Build a Sentence', items: 90, multipleChoice: 0,
      measured: 0, unmeasured: 90, blindPct: null, everySolverGotIt: 0, status: 'not-applicable',
      progress: 'not-applicable', target: null, remaining: '',
    },
  ],
  provenance: [], runs: [],
}

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => LIVE })) as unknown as typeof fetch
})

describe('finish bar', () => {
  it('reports the bank in its real state', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())
    // The denominator is the ATTACKABLE population — Build a Sentence
    // has no options and is out of scope, not behind.
    expect(screen.getByText(/254 of 1,449 attackable items finished/)).toBeInTheDocument()
  })

  it('does not draw a Finished segment when nothing has passed the band', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())
    // Nothing has passed on its own merits, so no "Finished" sliver —
    // the 18% is entirely cohorts a human CLEARED, and that is labelled
    // as such rather than dressed up as passing.
    expect(screen.queryByLabelText(/^Finished/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Cleared by hand: 254 items')).toBeInTheDocument()
    expect(screen.getByLabelText('Not measured: 205 items')).toBeInTheDocument()
  })

  /*
   * The correction itself, pinned. Before 2026-08-06 all 1,517 measured
   * items sat in one red segment on model evidence alone. Red must now
   * mean a person reproduced the effect.
   */
  it('separates a model suspicion from a confirmed defect', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())

    // Only Choose a Response — the one cohort a human confirmed — is red.
    expect(screen.getByLabelText('Too guessable — confirmed by hand: 72 items')).toBeInTheDocument()
    // Everything else the model flagged is amber and explicitly unproven.
    expect(screen.getByLabelText('Model says guessable — unconfirmed: 918 items')).toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByLabelText('Model says guessable — unconfirmed: 918 items'))
    expect(await screen.findAllByText(/no human sitting has confirmed it/)).not.toHaveLength(0)
  })

  it('shows why a cleared cohort needs no rewrite', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())

    fireEvent.mouseEnter(screen.getByLabelText('Cleared by hand: 254 items'))
    // Two cohort rows plus the segment's own legend blurb.
    expect(await screen.findAllByText(/No rewrite justified on this evidence/)).toHaveLength(3)
    expect(screen.getByText(/a human scored 15.0% against a 25.0% control/)).toBeInTheDocument()
  })

  it('shows what is left on hover, per cohort, as an action', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())

    fireEvent.mouseEnter(screen.getByLabelText('Model says guessable — unconfirmed: 918 items'))

    // The per-task band still travels with each cohort — the lecture is
    // judged against 80-90%, NOT the reading bar. This is the correction
    // that made the bands necessary and it must survive the restyle.
    expect(await screen.findByText(/Official ETS lectures score 96.9% blind/)).toBeInTheDocument()
    // Two reading cohorts share the 50-60% band, so this is legitimately
    // plural — asserting one match would be asserting the wrong thing.
    expect(screen.getAllByText(/College Board SAT R&W scores 71.6% blind/)).toHaveLength(2)
  })

  it('separates unmeasured from failing in the hover detail', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())

    fireEvent.mouseEnter(screen.getByLabelText('Not measured: 205 items'))
    expect(await screen.findByText(/Attack 41 of 205 items/)).toBeInTheDocument()
    // Unknown must not be phrased as a defect.
    expect(screen.getByText(/Unknown, not passing/)).toBeInTheDocument()
    // The failing cohorts are NOT listed under this segment.
    expect(screen.queryByText(/Rewrite distractors/)).not.toBeInTheDocument()
  })

  it('is reachable without a mouse', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())
    // Segments and legend entries are real buttons carrying the same
    // handler on focus as on hover, so a keyboard user gets the detail
    // too. Addressed by aria-label because "Not measured" is also a
    // status chip in the table below — a span, not a control.
    fireEvent.focus(screen.getByLabelText('Not measured: 205 items'))
    expect(await screen.findByText(/Attack 41 of 205 items/)).toBeInTheDocument()
  })

  /*
   * A number from the wrong instrument must not render as a score.
   *
   * 52.8% on Standard English Conventions reads like a middling result
   * and is nothing of the kind — the same mistake that briefly reported
   * 848 maths items as the bank's worst cohorts. The measurement is
   * kept (it is real, and deleting it to avoid misreading it is its own
   * distortion) but it is shown as n/a with the figure in the title.
   */
  it('does not print a blind score for a cohort the attack cannot judge', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('18%')).toBeInTheDocument())

    // The bare percentage must not appear anywhere on the page.
    expect(screen.queryByText('52.8%')).not.toBeInTheDocument()

    const cell = screen.getByTitle(/describes the solver, not the item/)
    expect(cell).toHaveTextContent('n/a')
    // The real figure survives, in the explanation.
    expect(cell.getAttribute('title')).toContain('52.8%')

    // ...and a judgeable cohort still prints its score normally.
    expect(screen.getByText('97.4%')).toBeInTheDocument()
  })
})
