/**
 * @jest-environment jsdom
 *
 * The supply-and-use panel, rendered against the shape the usage route
 * returns. Asserts values — the low-tests highlight, the "as of" stamp, the
 * error state that shows no numbers — rather than that it mounted.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { BankUsagePanel, lowTone, sectionLabel } from '../BankUsagePanel'
import type { SectionUsage } from '@/lib/study/bank-usage'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

const row = (over: Partial<SectionUsage>): SectionUsage => ({
  family: 'sat', section: 'math', live: 0, staged: 0, stagedInOpenReview: 0, stagedHumanReviewed: 0,
  perTest: 44, liveTestsByDivision: 0, stagedTestsByDivision: 0, measuredDepth: null, measuredHardRoute: null,
  measuredAtLeast: false, liveTests: 0, liveTestsSource: 'division', low: true, completedTests: 0,
  studentsWithTests: 0, maxTestsOneStudent: 0, studentsUnder5Left: 0, studentsNoMeasurement: 0, ...over,
})

const REPORT = {
  generatedAt: '2026-10-23T01:00:00.000Z',
  snapshotMeasured: '2026-10-22',
  realStudents: 80,
  read: { bank: 16067, sessions: 283, reviews: 1119, attempts: 3150 },
  sections: [
    row({ family: 'sat', section: 'reading_writing', live: 1489, perTest: 54, liveTestsByDivision: 27, measuredDepth: 18,
      measuredHardRoute: 9, liveTests: 18, liveTestsSource: 'measured', low: false, completedTests: 15, studentsWithTests: 4, maxTestsOneStudent: 10 }),
    row({ family: 'isee', section: 'reading', live: 153, staged: 540, perTest: 36, liveTestsByDivision: 4, stagedTestsByDivision: 15,
      measuredDepth: 3, liveTests: 3, liveTestsSource: 'measured', low: true, completedTests: 1, studentsWithTests: 1, maxTestsOneStudent: 1, studentsUnder5Left: 1 }),
    row({ family: 'map', section: 'math', live: 0, staged: 68, perTest: 40, stagedTestsByDivision: 1, liveTests: 0, low: true }),
    row({ family: 'toefl', section: 'listening', live: 953, staged: 639, stagedInOpenReview: 12, stagedHumanReviewed: 3, perTest: 48,
      liveTestsByDivision: 19, stagedTestsByDivision: 13, measuredDepth: 11, liveTests: 11, liveTestsSource: 'measured', low: false,
      completedTests: 35, studentsWithTests: 7, maxTestsOneStudent: 10, studentsUnder5Left: 1 }),
  ],
}

function mockFetch(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn(async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch
}

describe('lowTone', () => {
  it('red at 0-2 tests, amber at 3-4, none from 5 (the floor is strict)', () => {
    expect(lowTone(0)).toBe('red')
    expect(lowTone(2)).toBe('red')
    expect(lowTone(3)).toBe('amber')
    expect(lowTone(4)).toBe('amber')
    expect(lowTone(5)).toBeNull()
    expect(lowTone(null)).toBeNull()
  })
})

describe('sectionLabel', () => {
  it('reads as the test and section a person would say', () => {
    expect(sectionLabel({ family: 'sat', section: 'reading_writing' })).toBe('SAT Reading & Writing')
    expect(sectionLabel({ family: 'map', section: 'language' })).toBe('MAP Language Usage')
  })
})

describe('BankUsagePanel', () => {
  it('renders every section with its numbers, and flags the ones under 5 tests', async () => {
    mockFetch(REPORT)
    render(<BankUsagePanel />)
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)

    const isee = rows.find(r => r.textContent?.includes('ISEE Reading'))!
    expect(isee.className).toMatch(/amber/)
    expect(within(isee).getByText('Under 5')).toBeInTheDocument()
    expect(isee.textContent).toContain('540')
    expect(isee.textContent).toContain('(≈ 15 tests)')

    const map = rows.find(r => r.textContent?.includes('MAP Math'))!
    expect(map.className).toMatch(/rose/)

    const sat = rows.find(r => r.textContent?.includes('SAT Reading & Writing'))!
    expect(sat.className).not.toMatch(/rose|amber/)
    expect(sat.textContent).toContain('measured 2026-10-22')
    expect(sat.textContent).toContain('hard route 9')
    expect(sat.textContent).toContain('live ÷ test size ≈ 27')
    // A section with no measurement has no snapshot number to compare against.
    expect(within(map).queryByTestId('division-line')).not.toBeInTheDocument()

    const toefl = rows.find(r => r.textContent?.includes('TOEFL Listening'))!
    expect(toefl.textContent).toContain('12 in an open review')
    expect(toefl.textContent).toContain('35 tests by 7 students')
  })

  it('totals the headline cards from the same rows', async () => {
    mockFetch(REPORT)
    render(<BankUsagePanel />)
    await screen.findByRole('table')
    // 1489 + 153 + 0 + 953 live; 540 + 68 + 639 staged; 2 sections low; 2 students under 5
    expect(screen.getByText('2,595')).toBeInTheDocument()
    expect(screen.getByText('1,247')).toBeInTheDocument()
    expect(screen.getByText('of 80 real students')).toBeInTheDocument()
    expect(screen.getByText(/As of/)).toBeInTheDocument()
  })

  it('a snapshot one day old is not flagged', async () => {
    mockFetch(REPORT) // measured 2026-10-22, read 2026-10-23 10:00 KST
    render(<BankUsagePanel />)
    const table = await screen.findByRole('table')
    expect(screen.queryByTestId('stale-note')).not.toBeInTheDocument()
    expect(within(table).queryAllByTestId('stale-dot')).toHaveLength(0)
    expect(within(table).getByText('depth measured 2026-10-22')).toBeInTheDocument()
  })

  it('a snapshot older than a day gets the amber note and a dot on every measured cell, and only those', async () => {
    mockFetch({ ...REPORT, generatedAt: '2026-10-30T01:00:00.000Z' })
    render(<BankUsagePanel />)
    const table = await screen.findByRole('table')
    expect(screen.getByTestId('stale-note')).toHaveTextContent('measured 8 days ago (2026-10-22), may be out of date')
    // SAT R&W, ISEE Reading, TOEFL Listening are measured; MAP Math is by division.
    expect(within(table).getAllByTestId('stale-dot')).toHaveLength(3)
    const map = within(table).getAllByRole('row').find(r => r.textContent?.includes('MAP Math'))!
    expect(within(map).queryByTestId('stale-dot')).not.toBeInTheDocument()
  })

  it('shows the error and NO numbers when the route fails', async () => {
    mockFetch({ error: 'study_item_bank: read 999 rows, count says 1000' }, false, 500)
    render(<BankUsagePanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('read 999 rows')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('treats a 200 without sections as an error, not as an empty bank', async () => {
    mockFetch({ generatedAt: 'x' })
    render(<BankUsagePanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('malformed response')
  })
})
