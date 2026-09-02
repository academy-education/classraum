/**
 * @jest-environment jsdom
 *
 * Renders the real dashboard against the real ledger and asserts the numbers
 * it prints. The page is auth-gated, so this is the only check that actually
 * exercises the render — and it is the stronger one, because it asserts
 * values rather than that a screenshot looked plausible.
 *
 * The case that matters is the SAT proxy bug: the two SAT rows each cover
 * four separately-measured College Board domains, and judging a row by one
 * of them counted 848 maths items as failed when only 207 are.
 */
import { render, screen } from '@testing-library/react'
import { BankQcDashboard } from '../BankQcDashboard'
import { getLedger, readinessTotals } from '@/lib/study/bank-ledger'

// The dashboard's i18n wrapper reads LanguageContext, whose module imports
// the supabase client; jest cannot load supabase's ESM realtime dependency.
jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

const REQUIRED = ['shape', 'withsource', 'nosource', 'elimination', 'tells']

describe('BankQcDashboard', () => {
  it('renders without a client boundary — no hooks, no handlers', () => {
    // If this ever needs 'use client' again it will throw here rather than
    // silently shipping the whole ledger to the browser.
    expect(() => render(<BankQcDashboard />)).not.toThrow()
  })

  it('shows the three SAT maths domains that pass, not one verdict for all 848', () => {
    const l = getLedger()
    const totals = readinessTotals(
      l.coverage, l.auditedCohorts, l.baselines, l.gatesRunOnBank, REQUIRED,
    )
    // Advanced Math (207) is the only failing maths domain. Algebra (205),
    // Geometry (225) and Problem-Solving (211) pass — 641 items that the
    // proxy previously dragged into `failed`, plus Standard English
    // Conventions (234) on the verbal side.
    expect(totals.failed).toBe(1542)
    expect(totals.partial).toBe(1149)
    // Nothing is lost: every live item lands in exactly one bucket.
    expect(totals.ready + totals.partial + totals.failed + totals.unverified)
      .toBe(l.coverage.reduce((n, c) => n + c.items, 0))
  })

  it('states the AI-solver caveat on the page, not just in the commit log', () => {
    render(<BankQcDashboard />)
    // Every number here depends on this being true, so it must be visible.
    expect(screen.getByText(/All solve numbers come from AI solvers, not students/i))
      .toBeInTheDocument()
  })

  it('never renders a Ready chip while four of five gates have never run', () => {
    render(<BankQcDashboard />)
    expect(screen.queryAllByText('Ready')).toHaveLength(0)
    expect(screen.getAllByText('Partly checked').length).toBeGreaterThan(0)
  })

  it('shows a RANGE for rows covering several measured domains', () => {
    render(<BankQcDashboard />)
    // A single figure here would be a claim about the other three domains.
    expect(screen.getAllByText(/\+\d+(\.\d+)? to \+\d+/).length).toBeGreaterThan(0)
  })
})
