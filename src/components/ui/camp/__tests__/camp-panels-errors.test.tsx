/**
 * @jest-environment jsdom
 *
 * Camp dashboard panels: failures are shown as failures, and a viewer is only offered what they may do
 * (camp dashboard correctness pass, 2026-10-23).
 *
 *  - CampStudentsPanel: a failed load was a dead-end line of red text with no way to retry.
 *  - CampSessionInfo: a failed attendance count read "No attendance taken".
 *  - CampStudentDetail: Generate report and Withdraw were offered on a colleague's student and 403'd.
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'english' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/stores', () => ({ showErrorToast: jest.fn(), showSuccessToast: jest.fn() }))
jest.mock('@/hooks/useConfirm', () => ({ useConfirm: () => async () => true }))

/** Supabase client stub: every chain call returns the builder, which resolves to the result for its table. */
const dbResults: Record<string, { data?: unknown; error?: unknown; count?: number | null }> = {}
jest.mock('@/lib/supabase', () => ({
  db: {
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'order', 'limit']) b[m] = () => b
      const result = () => ({ data: null, error: null, ...(dbResults[table] ?? {}) })
      b.maybeSingle = async () => result()
      b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad)
      return b
    },
  },
}))

import { CampStudentsPanel } from '../CampStudentsPanel'
import { CampSessionInfo } from '../CampSessionInfo'
import { CampStudentDetail } from '../CampStudentDetail'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const fail = (status = 500) => ({ ok: false, status, json: async () => ({ error: 'boom' }) })

let fetchMock: jest.Mock
beforeEach(() => {
  fetchMock = jest.fn()
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
  for (const k of Object.keys(dbResults)) delete dbResults[k]
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { (console.error as jest.Mock).mockRestore?.() })

const studentRow = {
  studentId: 'student-a', name: 'Student A', email: null, classroomId: 'room-a', classroomName: 'A',
  completion: { done: 0, total: 1 }, avgScorePct: null, lastActive: null,
  states: { done: 0, inProgress: 0, notStarted: 1 },
}

describe('CampStudentsPanel', () => {
  it('a failed load offers Retry, and Retry loads the list', async () => {
    fetchMock.mockResolvedValueOnce(fail()).mockResolvedValueOnce(ok({ students: [studentRow] }))
    render(<CampStudentsPanel programId="prog" testFamily="sat" manageableClassroomIds={['room-a']} />)
    const retry = await screen.findByRole('button', { name: /retry|try again|common\./i })
    expect(screen.getByText('camp.students.loadFailed')).toBeInTheDocument()
    fireEvent.click(retry)
    expect(await screen.findByText('Student A')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('CampSessionInfo', () => {
  const session = {
    id: 's1', date: '2026-10-20', start_time: '10:00:00', end_time: null, status: 'completed',
    location: null, room_number: null, notes: null, classroom_id: 'room-a',
  }

  it('a failed attendance count says so instead of "No attendance taken"', async () => {
    dbResults.classroom_sessions = { data: session }
    dbResults.classrooms = { data: { name: 'A', teacher_id: null } }
    dbResults.attendance = { count: null, error: { message: 'permission denied' } }
    render(<CampSessionInfo sessionId="s1" onClose={() => {}} />)
    expect(await screen.findByText('camp.sessionInfo.attendanceFailed')).toBeInTheDocument()
    expect(screen.queryByText('camp.sessionInfo.noAttendance')).toBeNull()
  })

  it('a real zero still reads "No attendance taken"', async () => {
    dbResults.classroom_sessions = { data: session }
    dbResults.classrooms = { data: { name: 'A', teacher_id: null } }
    dbResults.attendance = { count: 0, error: null }
    render(<CampSessionInfo sessionId="s1" onClose={() => {}} />)
    expect(await screen.findByText('camp.sessionInfo.noAttendance')).toBeInTheDocument()
  })
})

describe('CampStudentDetail actions follow canManage', () => {
  const payload = {
    version: 1, generatedAt: '2026-10-23T00:00:00Z',
    program: { id: 'prog', name: 'SAT', testFamily: 'sat' },
    classroom: { id: 'room-a', name: 'A' },
    student: { id: 'student-a', name: 'Student A', email: null },
    period: { start: null, end: '2026-10-23' },
    assignments: [], skills: [], strengths: [], weaknesses: [],
    cohort: { n: 1, studentAccuracy: null, percentile: null },
    completion: { done: 0, total: 0, rate: 0 },
  }
  const reports = { reports: [{ id: 'rep-1', createdAt: '2026-10-20T00:00:00Z', periodStart: '2026-10-01', periodEnd: '2026-10-20' }] }

  function routeFetch() {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith('/api/camp/student?') ? ok({ payload, lastActivity: null }) : ok(reports))
  }

  it.each([
    [false, 0],
    [true, 1],
  ])('canManage=%s -> Generate report / Withdraw shown %s time(s)', async (canManage, n) => {
    routeFetch()
    render(
      <CampStudentDetail classroomId="room-a" studentId="student-a" studentName="Student A"
        testFamily="sat" canManage={canManage} onClose={() => {}} />,
    )
    await screen.findByText('camp.studentDetail.tabs.reports')
    expect(screen.queryAllByText('camp.studentDetail.generateReport')).toHaveLength(n)
    fireEvent.click(screen.getByText('camp.studentDetail.tabs.reports'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/camp/reports?classroomId='), expect.anything()))
    await screen.findByText('camp.studentDetail.reportsList.period')
    expect(screen.queryAllByLabelText('camp.withdrawReport.action')).toHaveLength(n)
  })
})
