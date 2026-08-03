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

// Real cohorts, real scores. Every measured one is above its band, so
// the honest finish figure is 0%.
const LIVE = {
  generatedAt: '2026-08-04T00:00:00.000Z',
  totals: { items: 3369, measured: 212, unmeasured: 3157 },
  finish: { done: 0, tooEasy: 1517, tooHard: 0, spotChecked: 0, unmeasured: 205, total: 1722, pct: 0 },
  cohorts: [
    {
      family: 'toefl', domain: 'Academic Passage', items: 433, multipleChoice: 433,
      measured: 12, unmeasured: 421, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'too-easy', target: { min: 50, max: 60, published: 71.6, note: 'College Board SAT R&W scores 71.6% blind.' },
      remaining: '40pts too guessable. Rewrite distractors so the score falls to 50-60%.',
    },
    {
      family: 'toefl', domain: 'Academic Talk', items: 274, multipleChoice: 274,
      measured: 12, unmeasured: 262, blindPct: 100, everySolverGotIt: 12, status: 'badly-guessable',
      progress: 'too-easy', target: { min: 80, max: 90, published: 96.9, note: 'Official ETS lectures score 96.9% blind.' },
      remaining: '10pts too guessable. Rewrite distractors so the score falls to 80-90%.',
    },
    {
      family: 'sat', domain: 'Craft and Structure', items: 211, multipleChoice: 211,
      measured: 52, unmeasured: 159, blindPct: 97.4, everySolverGotIt: 50, status: 'badly-guessable',
      progress: 'too-easy', target: { min: 50, max: 60, published: 71.6, note: 'College Board SAT R&W scores 71.6% blind.' },
      remaining: '37.4pts too guessable. Rewrite distractors so the score falls to 50-60%.',
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
  it('reports 0% with the bank in its real state', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
    // The denominator is the ATTACKABLE population, not all 3,369 —
    // Build a Sentence has no options and is out of scope, not behind.
    expect(screen.getByText(/0 of 1,722 attackable items finished/)).toBeInTheDocument()
  })

  it('does not draw a Finished segment when nothing is finished', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
    // A zero-width green sliver would still read as "some progress".
    expect(screen.queryByLabelText(/^Finished/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Too guessable: 1517 items')).toBeInTheDocument()
    expect(screen.getByLabelText('Not measured: 205 items')).toBeInTheDocument()
  })

  it('shows what is left on hover, per cohort, as an action', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())

    fireEvent.mouseEnter(screen.getByLabelText('Too guessable: 1517 items'))

    // Two reading cohorts share the 50-60% band, so this is legitimately
    // plural — asserting one match would be asserting the wrong thing.
    expect(await screen.findAllByText(/Rewrite distractors so the score falls to 50-60%/))
      .toHaveLength(2)
    // And the per-task band travels with it — the lecture cohort is
    // shown against 80-90%, NOT the reading bar. This is the correction
    // that made the bands necessary.
    expect(screen.getByText(/falls to 80-90%/)).toBeInTheDocument()
    expect(screen.getByText(/Official ETS lectures score 96.9% blind/)).toBeInTheDocument()
  })

  it('separates unmeasured from failing in the hover detail', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())

    fireEvent.mouseEnter(screen.getByLabelText('Not measured: 205 items'))
    expect(await screen.findByText(/Attack 41 of 205 items/)).toBeInTheDocument()
    // Unknown must not be phrased as a defect.
    expect(screen.getByText(/Unknown, not passing/)).toBeInTheDocument()
    // The failing cohorts are NOT listed under this segment.
    expect(screen.queryByText(/Rewrite distractors/)).not.toBeInTheDocument()
  })

  it('is reachable without a mouse', async () => {
    render(<LiveBankState />)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
    // Segments and legend entries are real buttons carrying the same
    // handler on focus as on hover, so a keyboard user gets the detail
    // too. Addressed by aria-label because "Not measured" is also a
    // status chip in the table below — a span, not a control.
    fireEvent.focus(screen.getByLabelText('Not measured: 205 items'))
    expect(await screen.findByText(/Attack 41 of 205 items/)).toBeInTheDocument()
  })
})
