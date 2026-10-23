/**
 * @jest-environment jsdom
 *
 * CampPage correctness (camp dashboard pass, 2026-10-23):
 *  - it opened on groups[0], the OLDEST program, instead of the camp running today;
 *  - a colleague's room read "0 assignments" because its assignments are never fetched;
 *  - a failed review-deck read became [] (decks silently vanished);
 *  - a failed lesson-date read was dropped, so every set lost its lesson chip with no sign of an error.
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'english' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/stores', () => ({ showErrorToast: jest.fn(), showSuccessToast: jest.fn() }))
jest.mock('@/hooks/useConfirm', () => ({ useConfirm: () => async () => true }))
// Presentation-only children with their own tests; stubbed so this file is about CampPage's own state.
jest.mock('@/components/ui/camp/CampOverviewPanel', () => ({ CampOverviewPanel: () => <div data-testid="overview-panel" /> }))
jest.mock('@/components/ui/camp/CampReportsPanel', () => ({ CampReportsPanel: () => null }))
jest.mock('@/components/ui/camp/CampReviewPresenter', () => ({ CampReviewPresenter: () => null }))

let sessionsResult: { data: unknown; error: unknown } = { data: [], error: null }
jest.mock('@/lib/supabase', () => ({
  db: {
    from: () => {
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'order', 'limit']) b[m] = () => b
      b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(sessionsResult).then(ok, bad)
      return b
    },
  },
}))

import { CampPage } from '../CampPage'
import { kstDate } from '@/lib/camp/dates'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

function shift(days: number) {
  const d = new Date(`${kstDate()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const program = (id: string, starts: string, ends: string) => ({
  id, academy_id: 'acad', name: `Camp ${id}`, test_family: 'sat', starts_on: starts, ends_on: ends,
  question_quota: 100, questions_used: 0, student_cap: 30,
})

/** Oldest first, as /api/camp/program orders them: an ended camp, then the one running today. */
const groups = [
  { program: program('old', shift(-120), shift(-60)), classrooms: [], canViewResults: true },
  {
    program: program('now', shift(-5), shift(30)),
    classrooms: [
      { id: 'room-mine', name: 'Mine', teacher_id: 't1', student_count: 3, can_manage: true },
      { id: 'room-theirs', name: 'Theirs', teacher_id: 't2', student_count: 4, can_manage: false },
    ],
    canViewResults: true,
  },
]

let fetchMock: jest.Mock
let deckFails = false
beforeEach(() => {
  deckFails = false
  sessionsResult = { data: [], error: null }
  fetchMock = jest.fn(async (url: string) => {
    if (url.startsWith('/api/camp/program')) return ok({ programs: groups })
    if (url.startsWith('/api/camp/overview')) return ok({})
    if (url.startsWith('/api/camp/assignments')) return ok({ assignments: [] })
    if (url.startsWith('/api/camp/review-set')) return deckFails ? fail() : ok({ reviewSets: [] })
    return fail()
  })
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { (console.error as jest.Mock).mockRestore?.() })

const urls = () => fetchMock.mock.calls.map(c => String(c[0]))

it('opens on the camp running today, not the oldest one', async () => {
  render(<CampPage academyId="acad" />)
  await waitFor(() => expect(urls().some(u => u.startsWith('/api/camp/overview'))).toBe(true))
  expect(urls().filter(u => u.startsWith('/api/camp/overview'))).toEqual(['/api/camp/overview?programId=now'])
})

async function openClassrooms() {
  render(<CampPage academyId="acad" />)
  fireEvent.click(await screen.findByText('camp.tabs.classrooms'))
  await screen.findByText('Theirs')
}

it('shows an assignment count only for a room whose assignments were loaded', async () => {
  await openClassrooms()
  const counts = () => (document.body.textContent ?? '').match(/camp\.assignmentCount/g)?.length ?? 0
  await waitFor(() => expect(counts()).toBe(1))
  // still 1 once everything has settled: the colleague's room never gains a count
  await new Promise(r => setTimeout(r, 50))
  expect(counts()).toBe(1)
  // and the colleague's room was never fetched, so it could only ever have been a made-up 0
  expect(urls().some(u => u.includes('room-theirs'))).toBe(false)
})

it('a failed review-deck read shows an error with Retry, not an empty list', async () => {
  deckFails = true
  await openClassrooms()
  expect(await screen.findByText('camp.reviewSets.loadFailed')).toBeInTheDocument()
})

it('a failed lesson-date read shows an error with Retry, and Retry reloads it', async () => {
  sessionsResult = { data: null, error: { message: 'boom' } }
  await openClassrooms()
  const banner = await screen.findByTestId('camp-sessions-error')
  expect(banner).toHaveTextContent('camp.sessionsLoadFailed')
  sessionsResult = { data: [], error: null }
  fireEvent.click(banner.querySelector('button')!)
  await waitFor(() => expect(screen.queryByTestId('camp-sessions-error')).toBeNull())
})
