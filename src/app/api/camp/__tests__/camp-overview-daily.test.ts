/** @jest-environment node */
/**
 * /api/camp/overview `daily`: one point per KST camp day with completion of the work due that day, attendance
 * from the camp classrooms' sessions, and average score with n; gaps are null. And the per-classroom loads in the
 * overview and students routes run in parallel.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => db.from(t) } }))
jest.mock('@/lib/api-auth', () => ({ getUserFromRequest: async () => ({ id: F.MANAGER }) }))

// now = 2026-10-23 12:00 KST
const NOW = new Date('2026-10-23T03:00:00Z')

/** Rooms A and B each have one student; started/finished counts are tracked to prove the loads overlap. */
let inFlight = 0
let maxInFlight = 0
jest.mock('@/lib/camp/reports', () => {
  const asg = (id: string, due: string) => ({ id, title: id, question_count: 5, due_at: due, created_at: '2026-10-01T00:00:00Z' })
  const sess = (aid: string, sid: string, status: string, completedAt: string | null, correct: number | null) => [`${aid}:${sid}`, {
    id: `${aid}-${sid}`, student_id: sid, status, correct_count: correct, total_count: correct === null ? null : 10,
    completed_at: completedAt, config: { campAssignmentId: aid },
  }] as const
  return {
    loadClassroomCampData: jest.fn(async (room: { id: string; name: string }) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(r => setTimeout(r, 5))
      inFlight -= 1
      const empty = { program: {}, classroom: room, studentIds: [], usersById: new Map(), assignments: [], sessionByKey: new Map(), skillsByStudent: new Map(), accuracyByStudent: new Map() }
      if (room.id === 'room-a') {
        return {
          ...empty,
          studentIds: ['student-a'],
          usersById: new Map([['student-a', { name: 'Ann', email: null }]]),
          // due 2026-10-21 23:59 KST, completed 2026-10-22 08:30 KST (= 21st 23:30 UTC): score lands on the 22nd
          assignments: [asg('a1', '2026-10-21T14:59:59Z')],
          sessionByKey: new Map([sess('a1', 'student-a', 'completed', '2026-10-21T23:30:00Z', 8)]),
        }
      }
      if (room.id === 'room-b') {
        return {
          ...empty,
          studentIds: ['student-b'],
          usersById: new Map([['student-b', { name: 'Bo', email: null }]]),
          assignments: [asg('b1', '2026-10-21T14:59:59Z')],
          sessionByKey: new Map(),
        }
      }
      return empty
    }),
  }
})

import { GET as overviewGET } from '@/app/api/camp/overview/route'
import { GET as studentsGET } from '@/app/api/camp/students/route'

const req = (path: string) => new NextRequest(`http://localhost${path}`)

beforeEach(() => {
  inFlight = 0
  maxInFlight = 0
  const s = F.campSeed()
  s.students = [...s.students, { user_id: 'student-b', academy_id: F.ACAD }]
  s.camp_programs = s.camp_programs.map(p => (p.id === F.SAT_CAMP ? { ...p, student_cap: 30, starts_on: '2026-10-20', ends_on: '2026-10-31' } : p))
  s.classroom_sessions = [
    { id: 'cs-1', classroom_id: F.ROOM_A, date: '2026-10-21', deleted_at: null },
    { id: 'cs-2', classroom_id: F.ROOM_B, date: '2026-10-21', deleted_at: null },
    { id: 'cs-3', classroom_id: F.ROOM_A, date: '2026-10-22', deleted_at: null },     // attendance not taken yet
    { id: 'cs-x', classroom_id: F.ROOM_TOEFL, date: '2026-10-21', deleted_at: null }, // another camp's room
    { id: 'cs-old', classroom_id: F.ROOM_A, date: '2026-10-10', deleted_at: null },   // before the camp
  ]
  s.attendance = [
    { id: 'at1', classroom_session_id: 'cs-1', status: 'present' },
    { id: 'at2', classroom_session_id: 'cs-2', status: 'absent' },
    { id: 'at3', classroom_session_id: 'cs-2', status: 'late' },
    { id: 'at4', classroom_session_id: 'cs-3', status: 'pending' },
    { id: 'at5', classroom_session_id: 'cs-x', status: 'absent' },
    { id: 'at6', classroom_session_id: 'cs-old', status: 'absent' },
  ]
  db = fakeDb(s)
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout'] })
})
afterEach(() => { jest.useRealTimers() })

test('one point per camp day, starts_on .. today (KST)', async () => {
  const body = await (await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))).json()
  expect(body.daily.map((p: { date: string }) => p.date)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
})

test('completion of the work due that day, attendance of camp sessions that day, score with n', async () => {
  const body = await (await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))).json()
  const byDate = Object.fromEntries(body.daily.map((p: { date: string }) => [p.date, p]))
  // 21st: two pairs due (Ann done, Bo not) = 50%; attendance present + late of 3 marked camp records = 67%
  expect(byDate['2026-10-21']).toMatchObject({ due: 2, completed: 1, completionPct: 50, attendanceMarked: 3, attended: 2, attendancePct: 67, avgScorePct: null, scoreN: 0 })
  // 22nd: Ann's score (completed 08:30 KST), attendance only pending -> gap
  expect(byDate['2026-10-22']).toMatchObject({ completionPct: null, attendancePct: null, avgScorePct: 80, scoreN: 1 })
  // 20th: nothing at all -> every metric a gap, never 0
  expect(byDate['2026-10-20']).toMatchObject({ completionPct: null, attendancePct: null, avgScorePct: null })
})

test('overview loads its classrooms in parallel', async () => {
  await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))
  expect(maxInFlight).toBeGreaterThan(1)
})

test('students loads its classrooms in parallel', async () => {
  await studentsGET(req(`/api/camp/students?programId=${F.SAT_CAMP}`))
  expect(maxInFlight).toBeGreaterThan(1)
})
