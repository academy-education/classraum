/** @jest-environment node */
/**
 * Program-wide camp lists stay inside the program's own academy, and the live drill-down's period uses the
 * Korean date (camp dashboard correctness pass, 2026-10-23).
 *
 *  - /api/camp/overview and /api/camp/students selected classrooms by camp_program_id alone, so a classroom in
 *    ANOTHER academy wired to this program (the pre-122 write gap) was loaded and its roster counted.
 *  - /api/camp/students listed a student enrolled from outside the academy, with their name and scores, although
 *    /api/camp/student refuses to open that same student.
 *  - /api/camp/student used the UTC date for the live period end, and ignored "today" while the camp was running.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
let CURRENT: string | null = F.MANAGER

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: (t: string) => db.from(t) },
}))
jest.mock('@/lib/api-auth', () => ({
  getUserFromRequest: async () => (CURRENT ? { id: CURRENT } : null),
}))

const loaded: string[] = []
const periods: Array<{ start: string | null; end: string | null }> = []
jest.mock('@/lib/camp/reports', () => ({
  loadClassroomCampData: jest.fn(async (room: { id: string; name: string }) => {
    loaded.push(room.id)
    const ids = room.id === 'room-a' ? ['student-a', 'student-out'] : room.id === 'room-forged-y' ? ['student-y'] : []
    const asg = { id: `asg-${room.id}`, title: 'Set', question_count: 2, due_at: null, created_at: '2026-10-01T00:00:00Z' }
    const sessions = new Map(ids.map(sid => [`${asg.id}:${sid}`, {
      id: `sess-${sid}`, student_id: sid, status: 'completed', correct_count: 1, total_count: 2,
      completed_at: '2026-10-02T01:00:00Z', config: { campAssignmentId: asg.id },
    }]))
    return {
      program: { id: 'prog-sat', name: 'SAT', test_family: 'sat' },
      classroom: { id: room.id, name: room.name },
      studentIds: ids,
      usersById: new Map(ids.map(id => [id, { name: id, email: null }])),
      assignments: [asg],
      sessionByKey: sessions,
      skillsByStudent: new Map(),
      accuracyByStudent: new Map(ids.map(id => [id, { correct: 1, total: 2 }])),
    }
  }),
  buildCampReportPayload: jest.fn(async (_d: unknown, _s: string, period: { start: string | null; end: string | null }) => {
    periods.push(period)
    return { assignments: [] }
  }),
}))

import { GET as studentsGET } from '@/app/api/camp/students/route'
import { GET as overviewGET } from '@/app/api/camp/overview/route'
import { GET as studentGET } from '@/app/api/camp/student/route'

const req = (path: string) => new NextRequest(`http://localhost${path}`)

function seed(dates: { starts_on?: string | null; ends_on?: string | null } = {}) {
  const s = F.campSeed()
  s.camp_programs = s.camp_programs.map(p => (p.id === F.SAT_CAMP ? { ...p, student_cap: 30, ...dates } : p))
  return s
}

beforeEach(() => {
  db = fakeDb(seed())
  CURRENT = F.MANAGER
  loaded.length = 0
  periods.length = 0
})

afterEach(() => { jest.useRealTimers() })

describe('program-wide lists are scoped to the program\'s academy', () => {
  test('/api/camp/students never loads a classroom from another academy', async () => {
    const res = await studentsGET(req(`/api/camp/students?programId=${F.SAT_CAMP}`))
    expect(res.status).toBe(200)
    expect(loaded).toContain(F.ROOM_A)
    expect(loaded).not.toContain(F.ROOM_FORGED_IN_Y)
  })

  test('/api/camp/overview never loads a classroom from another academy', async () => {
    const res = await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))
    expect(res.status).toBe(200)
    expect(loaded).not.toContain(F.ROOM_FORGED_IN_Y)
  })

  test('/api/camp/students drops a student enrolled from outside the academy', async () => {
    const body = await (await studentsGET(req(`/api/camp/students?programId=${F.SAT_CAMP}`))).json()
    const ids = (body.students as Array<{ studentId: string }>).map(r => r.studentId)
    expect(ids).toContain(F.STUDENT_A)
    expect(ids).not.toContain(F.STUDENT_OUTSIDER)
  })

  test('/api/camp/overview does not count the outsider (enrolled, completion, scores)', async () => {
    const body = await (await overviewGET(req(`/api/camp/overview?programId=${F.SAT_CAMP}`))).json()
    expect(body.studentsEnrolled).toBe(1)
    expect(body.completion).toMatchObject({ done: 1, expected: 1 })
    expect(body.scoredSessions).toBe(1)
  })
})

describe('/api/camp/student live period end', () => {
  const call = () => studentGET(req(`/api/camp/student?classroomId=${F.ROOM_A}&studentId=${F.STUDENT_A}`))

  test('is the KOREAN date before 09:00 KST, not the UTC date', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-22T23:30:00Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    db = fakeDb(seed({ starts_on: '2026-10-01', ends_on: null }))
    expect((await call()).status).toBe(200)
    expect(periods[0]).toEqual({ start: '2026-10-01', end: '2026-10-23' })
  })

  test('is today while the camp is still running, not the program end', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-23T03:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    db = fakeDb(seed({ starts_on: '2026-10-01', ends_on: '2026-12-31' }))
    await call()
    expect(periods[0]!.end).toBe('2026-10-23')
  })

  test('is capped at the program end once the camp is over', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-23T03:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    db = fakeDb(seed({ starts_on: '2026-08-01', ends_on: '2026-08-31' }))
    await call()
    expect(periods[0]!.end).toBe('2026-08-31')
  })
})
