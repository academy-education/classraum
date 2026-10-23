/** @jest-environment node */
/**
 * "Needs attention today" (overview) and the per-row work summary (Students tab) come from
 * src/lib/camp/metrics.ts, and agree with the donut on the same data.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => db.from(t) } }))
jest.mock('@/lib/api-auth', () => ({ getUserFromRequest: async () => ({ id: F.MANAGER }) }))

// now = 2026-10-23 12:00 KST
const NOW = new Date('2026-10-23T03:00:00Z')
const PAST = '2026-10-21T14:59:59+00:00'
const TODAY = '2026-10-23T14:59:59+00:00'
const FUTURE = '2026-10-30T14:59:59+00:00'

const S2 = 'student-2'
const S3 = 'student-3'

jest.mock('@/lib/camp/reports', () => {
  const asg = (id: string, due: string | null) => ({ id, title: id, question_count: 5, due_at: due, created_at: '2026-10-01T00:00:00Z' })
  const sess = (aid: string, sid: string, status: string, completedAt: string | null = null) => [`${aid}:${sid}`, {
    id: `${aid}-${sid}`, student_id: sid, status, correct_count: status === 'completed' ? 4 : null,
    total_count: status === 'completed' ? 5 : null, completed_at: completedAt, config: { campAssignmentId: aid },
  }] as const
  return {
    loadClassroomCampData: jest.fn(async (room: { id: string; name: string }) => {
      if (room.id !== 'room-a') {
        return { program: {}, classroom: room, studentIds: [], usersById: new Map(), assignments: [], sessionByKey: new Map(), skillsByStudent: new Map(), accuracyByStudent: new Map() }
      }
      return {
        program: { id: 'prog-sat', name: 'SAT', test_family: 'sat' },
        classroom: { id: room.id, name: room.name },
        studentIds: ['student-a', S2, S3],
        usersById: new Map([['student-a', { name: 'Ann', email: null }], [S2, { name: 'Bo', email: null }], [S3, { name: 'Cy', email: null }]]),
        assignments: [asg('past-1', PAST), asg('past-2', PAST), asg('today', TODAY), asg('future', FUTURE)],
        sessionByKey: new Map([
          // Ann: both past sets untouched (2 overdue / missing), today's set not started
          // Bo: one past set in progress (1 overdue / late), one completed late, today's done
          sess('past-1', S2, 'in_progress'),
          sess('past-2', S2, 'completed', '2026-10-22T05:00:00Z'),
          sess('today', S2, 'completed', '2026-10-23T01:00:00Z'),
          // Cy: everything past done on time, today's set not started -> due today only
          sess('past-1', S3, 'completed', '2026-10-20T01:00:00Z'),
          sess('past-2', S3, 'completed', '2026-10-20T02:00:00Z'),
        ]),
        skillsByStudent: new Map(),
        accuracyByStudent: new Map(),
      }
    }),
  }
})

import { GET as overviewGET } from '@/app/api/camp/overview/route'
import { GET as studentsGET } from '@/app/api/camp/students/route'

const req = (path: string) => new NextRequest(`http://localhost${path}`)

beforeEach(() => {
  const s = F.campSeed()
  s.students = [...s.students, { user_id: S2, academy_id: F.ACAD }, { user_id: S3, academy_id: F.ACAD }]
  s.camp_programs = s.camp_programs.map(p => (p.id === F.SAT_CAMP ? { ...p, student_cap: 30, starts_on: '2026-10-20', ends_on: '2026-10-31' } : p))
  db = fakeDb(s)
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
})
afterEach(() => { jest.useRealTimers() })

test('overview lists students with overdue or due-today work, most overdue first', async () => {
  const body = await (await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))).json()
  expect(body.needsAttention.map((r: { name: string }) => r.name)).toEqual(['Ann', 'Bo', 'Cy'])
  expect(body.needsAttention[0]).toMatchObject({ overdue: 2, missing: 2, late: 0, dueTodayNotStarted: 1, classroomId: F.ROOM_A })
  expect(body.needsAttention[1]).toMatchObject({ overdue: 1, late: 1, dueTodayNotStarted: 0 })
  expect(body.needsAttention[2]).toMatchObject({ overdue: 0, dueTodayNotStarted: 1 })
})

test('the donut counts the same pairs the attention list does', async () => {
  const body = await (await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))).json()
  // 3 students x 4 sets: completed 4 (Bo x2, Cy x2), late 1 (Bo), missing 2 (Ann), open 5
  expect(body.assignmentStatus).toEqual({ completed: 4, late: 1, missing: 2, open: 5 })
  const overdue = body.needsAttention.reduce((n: number, r: { overdue: number }) => n + r.overdue, 0)
  expect(overdue).toBe(body.assignmentStatus.late + body.assignmentStatus.missing)
})

test('students rows carry the metrics summary', async () => {
  const body = await (await studentsGET(req(`/api/camp/students?programId=${F.SAT_CAMP}`))).json()
  const byName = Object.fromEntries((body.students as Array<{ name: string; work: unknown }>).map(r => [r.name, r.work]))
  expect(byName.Ann).toMatchObject({ total: 4, overdue: 2, notStarted: 4, started: 0, dueTodayNotStarted: 1 })
  expect(byName.Bo).toMatchObject({ overdue: 1, late: 1, completedLate: 1, started: 3 })
  expect(byName.Cy).toMatchObject({ overdue: 0, completedLate: 0, dueTodayNotStarted: 1 })
})
