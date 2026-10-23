/**
 * @jest-environment jsdom
 *
 * "Needs attention today" UI (camp dashboard pass, 2026-10-23): the overview card, the Students tab's Overdue
 * chip / sort / filters, the classroom grid's overdue cells and incomplete-only toggle, and every new string in
 * both locales.
 */
import fs from 'fs'
import path from 'path'
import React from 'react'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p && 'n' in p ? `${k}:${p.n}` : k), language: 'english' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/stores', () => ({ showErrorToast: jest.fn(), showSuccessToast: jest.fn() }))
jest.mock('@/hooks/useConfirm', () => ({ useConfirm: () => async () => true }))
jest.mock('@/lib/supabase', () => ({ db: {} }))
jest.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return { LineChart: Stub, Line: Stub, ResponsiveContainer: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub, CartesianGrid: Stub, Legend: Stub }
})

import { CampOverviewPanel } from '../CampOverviewPanel'
import { CampStudentsPanel } from '../CampStudentsPanel'
import { CampClassroomDashboard } from '../CampClassroomDashboard'

const tt = (k: string, p?: Record<string, string | number | undefined>) => (p && 'n' in p ? `${k}:${p.n}` : k)

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
let fetchMock: jest.Mock
beforeEach(() => {
  fetchMock = jest.fn()
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
})

const baseOverview = {
  studentsEnrolled: 3, studentCap: 30,
  completion: { done: 1, expected: 3, pct: 33 },
  averageScorePct: 80, scoredSessions: 1,
  skillsToReview: { count: 0, accuracyThreshold: 70, minAnswers: 5 },
  reviewTopics: [], trend: [], daily: [],
  assignmentStatus: { completed: 1, late: 1, missing: 1, open: 0 },
}
const attention = [
  { studentId: 's1', name: 'Ann', email: null, classroomId: 'r1', classroomName: 'A', overdue: 2, late: 0, missing: 2, dueTodayNotStarted: 1 },
  { studentId: 's3', name: 'Cy', email: null, classroomId: 'r1', classroomName: 'A', overdue: 0, late: 0, missing: 0, dueTodayNotStarted: 1 },
]

function renderOverview(needsAttention: unknown[], handlers: Partial<{ onOpenStudent: jest.Mock; onShowOverdueStudents: jest.Mock }> = {}) {
  return render(
    <CampOverviewPanel
      overview={{ ...baseOverview, needsAttention }}
      program={{ test_family: 'sat' }}
      formatDate={d => d}
      sectionLabel={s => s}
      domainLabel={(_f, d) => d}
      t={tt}
      language="english"
      accent={{ dot: '', badge: '', hex: '#000' }}
      donut={null}
      onOpenStudent={handlers.onOpenStudent ?? jest.fn()}
      onShowOverdueStudents={handlers.onShowOverdueStudents ?? jest.fn()}
    />,
  )
}

describe('Needs attention card', () => {
  it('comes before the stat cards and lists students in the server order', () => {
    const { container } = renderOverview(attention)
    const card = screen.getByTestId('camp-needs-attention')
    const stat = screen.getByText('camp.overview.studentsEnrolled')
    expect(card.compareDocumentPosition(stat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const names = within(card).getAllByRole('button').map(b => b.textContent)
    expect(names[0]).toContain('Ann')
    expect(names[0]).toContain('camp.attention.overdue:2')
    expect(names[1]).toContain('Cy')
    expect(names[1]).not.toContain('camp.attention.overdue')
    expect(container).toBeTruthy()
  })

  it('a row opens that student', () => {
    const onOpenStudent = jest.fn()
    renderOverview(attention, { onOpenStudent })
    fireEvent.click(screen.getByText('Ann'))
    expect(onOpenStudent).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1', classroomId: 'r1' }))
  })

  it('says so when nobody needs attention', () => {
    renderOverview([])
    expect(screen.getByText('camp.attention.empty')).toBeInTheDocument()
  })

  it('caps the list and hands the rest to the Students tab', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ ...attention[0], studentId: `s${i}`, name: `N${i}` }))
    const onShowOverdueStudents = jest.fn()
    renderOverview(many, { onShowOverdueStudents })
    fireEvent.click(screen.getByText('camp.attention.more:3'))
    expect(onShowOverdueStudents).toHaveBeenCalled()
  })
})

const work = (p: Partial<Record<string, number>>) => ({
  total: 3, completed: 0, started: 0, overdue: 0, late: 0, missing: 0, notStarted: 3, completedLate: 0, dueTodayNotStarted: 0, ...p,
})
const row = (name: string, p: { done?: number; avg?: number | null; last?: string | null; work: ReturnType<typeof work> }) => ({
  studentId: name, name, email: null, classroomId: 'r1', classroomName: 'A',
  completion: { done: p.done ?? 0, total: 3 }, avgScorePct: p.avg ?? null, lastActive: p.last ?? null,
  states: { done: p.done ?? 0, inProgress: 0, notStarted: 3 - (p.done ?? 0) },
  work: p.work,
})
const studentRows = [
  row('Ann', { work: work({ overdue: 2, missing: 2 }) }),
  row('Bo', { done: 2, avg: 90, last: '2026-10-22T00:00:00Z', work: work({ completed: 2, started: 3, overdue: 1, late: 1, notStarted: 0 }) }),
  row('Cy', { work: work({}) }),
  row('Di', { done: 3, avg: 60, last: '2026-10-21T00:00:00Z', work: work({ completed: 3, started: 3, notStarted: 0 }) }),
]
const tableNames = () => screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[0]!.textContent)

describe('Students tab', () => {
  async function renderStudents(initialFilter?: 'all' | 'overdue' | 'not_started' | 'on_track') {
    fetchMock.mockResolvedValue(ok({ students: studentRows }))
    render(<CampStudentsPanel programId="p" testFamily="sat" manageableClassroomIds={['r1']} initialFilter={initialFilter} />)
    await screen.findByText('Ann')
  }

  it('overdue students carry an Overdue chip and their count', async () => {
    await renderStudents()
    const ann = screen.getByText('Ann').closest('tr')!
    expect(within(ann).getByText('camp.metrics.overdue')).toBeInTheDocument()
    const di = screen.getByText('Di').closest('tr')!
    expect(within(di).queryByText('camp.metrics.overdue')).toBeNull()
  })

  it('filter chips split the roster by the metrics categories, with counts', async () => {
    await renderStudents()
    const chip = (f: string) => document.querySelector(`[data-filter="${f}"]`) as HTMLButtonElement
    expect(chip('overdue').textContent).toContain('2')
    expect(chip('not_started').textContent).toContain('1')
    expect(chip('on_track').textContent).toContain('1')
    fireEvent.click(chip('overdue'))
    expect(tableNames()).toEqual(['Ann', 'Bo'])
    fireEvent.click(chip('not_started'))
    expect(tableNames()).toEqual(['Cy'])
    fireEvent.click(chip('on_track'))
    expect(tableNames()).toEqual(['Di'])
  })

  it('opens on the filter it was linked with', async () => {
    await renderStudents('overdue')
    expect(tableNames()).toEqual(['Ann', 'Bo'])
  })

  it('sorts by each column; empty values sort last', async () => {
    await renderStudents()
    const sortBy = (k: string) => fireEvent.click(document.querySelector(`[data-sort="${k}"]`)!)
    expect(tableNames()).toEqual(['Ann', 'Bo', 'Cy', 'Di'])
    sortBy('overdue')                                  // most overdue first
    expect(tableNames().slice(0, 2)).toEqual(['Ann', 'Bo'])
    sortBy('average')                                  // ascending, no score last
    expect(tableNames()).toEqual(['Di', 'Bo', 'Ann', 'Cy'])
    sortBy('average')                                  // descending, no score still last
    expect(tableNames()).toEqual(['Bo', 'Di', 'Ann', 'Cy'])
    sortBy('completion')
    expect(tableNames()).toEqual(['Ann', 'Cy', 'Bo', 'Di'])
    sortBy('lastActive')
    expect(tableNames()).toEqual(['Di', 'Bo', 'Ann', 'Cy'])
    sortBy('name'); sortBy('name')                     // name descending
    expect(tableNames()).toEqual(['Di', 'Cy', 'Bo', 'Ann'])
  })
})

describe('Classroom progress grid', () => {
  const past = new Date(Date.now() - 86_400_000).toISOString()
  const future = new Date(Date.now() + 86_400_000).toISOString()
  const dashboard = {
    roster: [{ studentId: 's1', name: 'Ann', email: null }, { studentId: 's2', name: 'Bo', email: null }],
    assignments: [
      {
        id: 'a1', title: 'Past', section: null, domain: null, questionCount: 5, dueAt: past,
        students: [
          { studentId: 's1', state: 'not_started', correctCount: null, totalCount: null, completedAt: null },
          { studentId: 's2', state: 'done', correctCount: 4, totalCount: 5, completedAt: new Date().toISOString() },
        ],
        completion: { done: 1, inProgress: 0, notStarted: 1, total: 2, pct: 50 },
      },
      {
        id: 'a2', title: 'Future', section: null, domain: null, questionCount: 5, dueAt: future,
        students: [
          { studentId: 's1', state: 'in_progress', correctCount: null, totalCount: null, completedAt: null },
          { studentId: 's2', state: 'done', correctCount: 5, totalCount: 5, completedAt: past },
        ],
        completion: { done: 1, inProgress: 1, notStarted: 0, total: 2, pct: 50 },
      },
    ],
    skills: [], skillsToReview: [], minAnswersForRanking: 5,
  }

  async function renderGrid() {
    fetchMock.mockResolvedValue(ok(dashboard))
    render(<CampClassroomDashboard classroomId="r1" testFamily="sat" canManage />)
    await screen.findByText('Ann')
  }

  it('an unfinished cell past its due date is Overdue; a future one is not', async () => {
    await renderGrid()
    const cells = within(screen.getByText('Ann').closest('tr')!).getAllByRole('cell')
    expect(cells[1]).toHaveAttribute('data-cell-state', 'overdue')
    expect(cells[2]).toHaveAttribute('data-cell-state', 'in_progress')
  })

  it('a cell completed after the due date is marked late', async () => {
    await renderGrid()
    const cells = within(screen.getByText('Bo').closest('tr')!).getAllByRole('cell')
    expect(within(cells[1]!).getByText('camp.metrics.completedLate')).toBeInTheDocument()
    expect(within(cells[2]!).queryByText('camp.metrics.completedLate')).toBeNull()
  })

  it('the name column is sticky', async () => {
    await renderGrid()
    expect(screen.getByText('Ann').closest('td')!.className).toMatch(/\bsticky\b/)
    expect(screen.getByText('camp.dashboard.student').closest('th')!.className).toMatch(/\bsticky\b/)
  })

  it('"show only incomplete" hides students who finished everything', async () => {
    await renderGrid()
    fireEvent.click(screen.getByLabelText('camp.dashboard.onlyIncomplete'))
    await waitFor(() => expect(screen.queryByText('Bo')).toBeNull())
    expect(screen.getByText('Ann')).toBeInTheDocument()
  })
})

describe('locales', () => {
  // Every literal camp.* key the dashboard components call must exist in BOTH locales.
  const files = [
    'CampPage.tsx', 'CampOverviewPanel.tsx', 'CampStudentsPanel.tsx', 'CampClassroomDashboard.tsx',
    'CampSessionInfo.tsx', 'CampStudentDetail.tsx',
  ]
  const lookup = (obj: unknown, key: string) =>
    key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj)

  it.each(files)('%s: every t(\'camp.*\') key is in en and ko', f => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    const keys = [...new Set([...src.matchAll(/t\(\s*'(camp\.[A-Za-z0-9_.]+)'/g)].map(m => m[1]!))]
    expect(keys.length).toBeGreaterThan(0)
    const missing = keys.filter(k => typeof lookup(en, k) !== 'string' || typeof lookup(ko, k) !== 'string')
    expect(missing).toEqual([])
  })

  it('the filter chip labels exist in both locales', () => {
    for (const f of ['all', 'overdue', 'not_started', 'on_track']) {
      expect(typeof lookup(en, `camp.students.filters.${f}`)).toBe('string')
      expect(typeof lookup(ko, `camp.students.filters.${f}`)).toBe('string')
    }
  })
})
