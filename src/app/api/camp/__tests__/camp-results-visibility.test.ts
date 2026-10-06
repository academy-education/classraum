/** @jest-environment node */
/**
 * Camp Study-results visibility, through the actual route handlers.
 *
 * Owner rule (2026-10-07): "Only camp teachers can see the study results.
 * They should be able to see all information about study mode's
 * assignments as long as the teacher and the student is in the same camp."
 *
 * Every allow case is paired with deny cases for (a) a regular academy
 * teacher and (b) a camp teacher of a DIFFERENT camp in the same academy —
 * before this change both of those got a 200 from /api/camp/students and
 * /api/camp/overview, and (b)'s twin, a co-teacher of the SAME camp, got
 * a 403 from the per-student routes.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
let CURRENT: string | null = null

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: (t: string) => db.from(t) },
}))
jest.mock('@/lib/api-auth', () => ({
  getUserFromRequest: async () => (CURRENT ? { id: CURRENT } : null),
}))
// The heavy loaders are out of scope here — the gate runs before them.
jest.mock('@/lib/camp/reports', () => ({
  loadClassroomCampData: jest.fn(async (room: { id: string; name: string }) => ({
    program: { id: 'prog-sat', name: 'SAT', test_family: 'sat' },
    classroom: { id: room.id, name: room.name },
    studentIds: room.id === 'room-a' ? ['student-a', 'student-out'] : [],
    usersById: new Map(),
    assignments: [],
    sessionByKey: new Map(),
    skillsByStudent: new Map(),
    accuracyByStudent: new Map(),
  })),
  buildCampReportPayload: jest.fn(async () => ({ assignments: [], mockTests: [] })),
}))

import { GET as studentSessionGET } from '@/app/api/camp/student-session/route'
import { GET as studentGET } from '@/app/api/camp/student/route'
import { GET as studentsGET } from '@/app/api/camp/students/route'
import { GET as overviewGET } from '@/app/api/camp/overview/route'
import { GET as dashboardGET } from '@/app/api/camp/dashboard/route'
import { GET as programGET } from '@/app/api/camp/program/route'

const req = (path: string) => new NextRequest(`http://localhost${path}`)

const q = (prompt: string) => ({ prompt, choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', explanation: 'because' })

function seed(times: [number | null, number | null] = [30, 50]) {
  const s = F.campSeed()
  s.camp_assignments = [
    { id: 'asg-a', classroom_id: F.ROOM_A, title: 'Algebra set', question_count: 2, deleted_at: null },
  ]
  s.study_sessions = [
    {
      id: 'sess-a', student_id: F.STUDENT_A, status: 'completed', score: 50,
      correct_count: 1, total_count: 2, created_at: '2026-10-01T00:00:00Z',
      completed_at: '2026-10-01T00:01:20Z', config: { campAssignmentId: 'asg-a' },
    },
    {
      id: 'sess-out', student_id: F.STUDENT_OUTSIDER, status: 'completed', score: 100,
      correct_count: 2, total_count: 2, created_at: '2026-10-01T00:00:00Z',
      completed_at: '2026-10-01T00:01:00Z', config: { campAssignmentId: 'asg-a' },
    },
    {
      id: 'sess-personal', student_id: F.STUDENT_A, status: 'completed', score: 90,
      correct_count: 9, total_count: 10, created_at: '2026-10-01T00:00:00Z',
      completed_at: '2026-10-01T00:20:00Z', config: { family: 'sat' },
    },
  ]
  s.study_attempts = [
    { id: 'at1', session_id: 'sess-a', position: 0, question: q('Q1'), student_answer: 'a', is_correct: true, time_spent_seconds: times[0] },
    { id: 'at2', session_id: 'sess-a', position: 1, question: q('Q2'), student_answer: 'b', is_correct: false, time_spent_seconds: times[1] },
  ]
  s.users = [{ id: F.STUDENT_A, name: 'Student A' }]
  return s
}

beforeEach(() => {
  db = fakeDb(seed())
  CURRENT = null
})

describe('GET /api/camp/student-session (per-question answers, review, time)', () => {
  const call = () => studentSessionGET(req('/api/camp/student-session?sessionId=sess-a'))

  test('unauthenticated -> 401', async () => {
    expect((await call()).status).toBe(401)
  })

  test.each([
    ['regular academy teacher', F.T_PLAIN],
    ['camp teacher of a different camp', F.T_TOEFL],
    ['deactivated teacher', F.T_INACTIVE],
    ['manager of another academy', F.OTHER_MANAGER],
    ['stranger with a forged camp room', F.T_STRANGER],
  ])('%s -> 403', async (_l, user) => {
    CURRENT = user
    expect((await call()).status).toBe(403)
  })

  test.each([
    ['the classroom\'s own camp teacher', F.T_ROOM_A],
    ['a camp teacher of another classroom in the SAME camp', F.T_ROOM_B],
    ['the academy manager', F.MANAGER],
  ])('%s -> 200 with answers, explanations and per-question time', async (_l, user) => {
    CURRENT = user
    const res = await call()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(2)
    expect(body.rows[1]).toMatchObject({ studentAnswer: 'b', isCorrect: false, timeSpentSeconds: 50 })
    expect(body.rows[1].question.explanation).toBe('because')
    expect(body.timing).toMatchObject({ basis: 'measured', totalSeconds: 80 })
    expect(body.session.startedAt).toBe('2026-10-01T00:00:00Z')
  })

  test('an even split is reported as a total, never as per-question times', async () => {
    db = fakeDb(seed([40, 40]))
    CURRENT = F.T_ROOM_A
    const body = await (await call()).json()
    expect(body.timing.basis).toBe('even_split')
    expect(body.timing.totalSeconds).toBe(80)
    expect(body.rows.map((r: { timeSpentSeconds: unknown }) => r.timeSpentSeconds)).toEqual([null, null])
  })

  test('a student who has left the camp is no longer visible', async () => {
    CURRENT = F.T_ROOM_A
    expect((await call()).status).toBe(200)
    db.tables.classroom_students = db.tables.classroom_students.filter(r => r.student_id !== F.STUDENT_A)
    expect((await call()).status).toBe(403)
  })

  test('a student enrolled from outside the academy is not "in the camp"', async () => {
    CURRENT = F.T_ROOM_A
    const res = await studentSessionGET(req('/api/camp/student-session?sessionId=sess-out'))
    expect(res.status).toBe(403)
  })

  test('the student\'s own (non-assignment) Study session is never readable here', async () => {
    CURRENT = F.T_ROOM_A
    const res = await studentSessionGET(req('/api/camp/student-session?sessionId=sess-personal'))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/camp/student (per-student drill-down)', () => {
  const call = (student = F.STUDENT_A) =>
    studentGET(req(`/api/camp/student?classroomId=${F.ROOM_A}&studentId=${student}`))

  test.each([
    ['regular academy teacher', F.T_PLAIN, 403],
    ['camp teacher of a different camp', F.T_TOEFL, 403],
    ['camp teacher of the same camp, other classroom', F.T_ROOM_B, 200],
    ['manager', F.MANAGER, 200],
  ])('%s -> %s', async (_l, user, status) => {
    CURRENT = user
    expect((await call()).status).toBe(status)
  })

  test('student enrolled from outside the academy -> 404', async () => {
    CURRENT = F.T_ROOM_A
    expect((await call(F.STUDENT_OUTSIDER)).status).toBe(404)
  })
})

describe('GET /api/camp/dashboard (classroom tracking)', () => {
  test.each([
    ['regular academy teacher', F.T_PLAIN],
    ['camp teacher of a different camp', F.T_TOEFL],
  ])('%s -> 403', async (_l, user) => {
    CURRENT = user
    expect((await dashboardGET(req(`/api/camp/dashboard?classroomId=${F.ROOM_A}`))).status).toBe(403)
  })
})

describe('program-wide routes', () => {
  test.each([
    ['students', studentsGET],
    ['overview', overviewGET],
  ] as const)('/api/camp/%s: plain teacher and other-camp teacher denied, same-camp teachers allowed', async (name, GET) => {
    const call = () => GET(req(`/api/camp/${name}?programId=${F.SAT_CAMP}`))
    CURRENT = F.T_PLAIN
    expect((await call()).status).toBe(403)
    CURRENT = F.T_TOEFL
    expect((await call()).status).toBe(403)
    CURRENT = F.T_STRANGER
    expect((await call()).status).toBe(403)
    CURRENT = F.T_ROOM_B
    expect((await call()).status).toBe(200)
    CURRENT = F.MANAGER
    expect((await call()).status).toBe(200)
  })

  test('/api/camp/program tells the page who may open results', async () => {
    const flags = async (user: string) => {
      CURRENT = user
      const body = await (await programGET(req(`/api/camp/program?academyId=${F.ACAD}`))).json()
      return Object.fromEntries(
        (body.programs as Array<{ program: { id: string }; canViewResults: boolean }>)
          .map(g => [g.program.id, g.canViewResults]),
      )
    }
    expect(await flags(F.T_PLAIN)).toEqual({ [F.SAT_CAMP]: false, [F.TOEFL_CAMP]: false })
    expect(await flags(F.T_ROOM_A)).toEqual({ [F.SAT_CAMP]: true, [F.TOEFL_CAMP]: false })
    expect(await flags(F.T_TOEFL)).toEqual({ [F.SAT_CAMP]: false, [F.TOEFL_CAMP]: true })
    expect(await flags(F.MANAGER)).toEqual({ [F.SAT_CAMP]: true, [F.TOEFL_CAMP]: true })
  })

  test('/api/camp/program no longer lists a forged other-academy classroom', async () => {
    CURRENT = F.MANAGER
    const body = await (await programGET(req(`/api/camp/program?academyId=${F.ACAD}`))).json()
    const sat = (body.programs as Array<{ program: { id: string }; classrooms: Array<{ id: string }> }>)
      .find(g => g.program.id === F.SAT_CAMP)!
    expect(sat.classrooms.map(c => c.id)).not.toContain(F.ROOM_FORGED_IN_Y)
  })
})
