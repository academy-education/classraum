/** @jest-environment node */
/**
 * Owner decision 2026-10-07: camp teachers and managers see CAMP
 * ASSIGNMENTS ONLY. A student's personal Study sessions — anything not
 * tagged config.campAssignmentId for an assignment of the classroom —
 * stay private to the student.
 *
 * Until then the per-student drill-down (/api/camp/student) and every
 * generated report carried `mockTests`: the student's own completed
 * full-test sessions for the camp's family, read with the service role.
 * The answer-review route already 404'd them; the report builder did not.
 *
 * These run the REAL loaders (loadClassroomCampData +
 * buildCampReportPayload) and the real routes over a filter-honouring fake
 * DB, so a personal session can only stay out of the payload if the code
 * actually leaves it out.
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

import { GET as studentGET } from '@/app/api/camp/student/route'
import { GET as studentSessionGET } from '@/app/api/camp/student-session/route'
import { GET as dashboardGET } from '@/app/api/camp/dashboard/route'
import { GET as reportsGET } from '@/app/api/camp/reports/route'
import { withoutPersonalStudy, type CampReportPayload } from '@/lib/camp/reports'

const req = (path: string) => new NextRequest(`http://localhost${path}`)
const q = (prompt: string) => ({ prompt, choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', explanation: 'x' })

const PERSONAL = 'sess-personal-full-test'
const CAMP = 'sess-camp-asg'

function seed() {
  const s = F.campSeed()
  s.camp_programs = s.camp_programs.map(p =>
    p.id === F.SAT_CAMP ? { ...p, name: 'SAT Camp', test_family: 'sat', starts_on: null, ends_on: null } : p)
  s.camp_assignments = [{
    id: 'asg-a', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, title: 'Algebra set', section: 'math',
    domain: null, question_count: 2, due_at: null, created_at: '2026-10-01T00:00:00Z', deleted_at: null, kind: null,
  }]
  s.study_sessions = [
    {
      id: CAMP, student_id: F.STUDENT_A, status: 'completed', score: 50, mode: 'full_test', archived: false,
      correct_count: 1, total_count: 2, created_at: '2026-10-02T00:00:00Z', completed_at: '2026-10-02T00:10:00Z',
      config: { source: 'bank', family: 'sat', section: 'math', campAssignmentId: 'asg-a', classroomId: F.ROOM_A },
    },
    {
      // The student's OWN mock test, same family, completed LATER — so it
      // would also win lastActivity if it were read.
      id: PERSONAL, student_id: F.STUDENT_A, status: 'completed', score: 90, mode: 'full_test', archived: false,
      correct_count: 9, total_count: 10, created_at: '2026-10-05T00:00:00Z', completed_at: '2026-10-05T01:00:00Z',
      config: { source: 'bank', family: 'sat', section: 'math' },
    },
  ]
  s.study_attempts = [
    { id: 'c1', session_id: CAMP, item_id: 'item-1', position: 0, question: q('C1'), student_answer: 'a', is_correct: true, time_spent_seconds: 30 },
    { id: 'c2', session_id: CAMP, item_id: 'item-2', position: 1, question: q('C2'), student_answer: 'b', is_correct: false, time_spent_seconds: 30 },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`, session_id: PERSONAL, item_id: 'item-1', position: i, question: q(`P${i}`),
      student_answer: 'a', is_correct: i < 9, time_spent_seconds: 60,
    })),
  ]
  s.study_item_bank = [
    { id: 'item-1', section: 'math', domain: 'algebra', item: {} },
    { id: 'item-2', section: 'math', domain: 'algebra', item: {} },
  ]
  s.users = [{ id: F.STUDENT_A, name: 'Student A', email: 'a@example.test' }]
  return s
}

beforeEach(() => { db = fakeDb(seed()); CURRENT = null })

describe('the per-student drill-down (/api/camp/student)', () => {
  const call = () => studentGET(req(`/api/camp/student?classroomId=${F.ROOM_A}&studentId=${F.STUDENT_A}`))

  it.each([
    ['camp teacher of the room', F.T_ROOM_A],
    ['camp co-teacher of the same camp', F.T_ROOM_B],
    ['academy manager', F.MANAGER],
  ])('%s sees the camp-assignment session and nothing of the personal one', async (_label, who) => {
    CURRENT = who
    const res = await call()
    expect(res.status).toBe(200)
    const body = await res.json()
    const text = JSON.stringify(body)

    // Visible: the assignment, done, from the camp session.
    expect(body.payload.assignments).toHaveLength(1)
    expect(body.payload.assignments[0]).toMatchObject({ state: 'done', sessionId: CAMP, correctCount: 1, totalCount: 2 })

    // Invisible: the personal session in any form.
    expect(text).not.toContain(PERSONAL)
    expect(body.payload).not.toHaveProperty('mockTests')
    // Its 10 answers are not folded into skills or accuracy either.
    expect(body.payload.skills).toEqual([expect.objectContaining({ domain: 'algebra', correct: 1, total: 2 })])
    expect(body.payload.cohort.studentAccuracy).toBe(50)
    // And it does not move "last active".
    expect(body.lastActivity).toBe('2026-10-02T00:10:00Z')
  })
})

describe('the answer-review route (/api/camp/student-session)', () => {
  it('a camp-assignment session is readable by a camp teacher', async () => {
    CURRENT = F.T_ROOM_A
    const res = await studentSessionGET(req(`/api/camp/student-session?sessionId=${CAMP}`))
    expect(res.status).toBe(200)
    expect((await res.json()).session.id).toBe(CAMP)
  })

  it.each([F.T_ROOM_A, F.MANAGER])('a personal session is a 404 even for %s', async who => {
    CURRENT = who
    const res = await studentSessionGET(req(`/api/camp/student-session?sessionId=${PERSONAL}`))
    expect(res.status).toBe(404)
  })
})

describe('the classroom dashboard (/api/camp/dashboard)', () => {
  it('counts the camp session and never the personal one', async () => {
    CURRENT = F.T_ROOM_A
    const res = await dashboardGET(req(`/api/camp/dashboard?classroomId=${F.ROOM_A}`))
    expect(res.status).toBe(200)
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain(PERSONAL)
    // 1 of 2 from the camp session; with the personal answers it would be 10 of 12.
    expect(text).toMatch(/"correct":1,"total":2/)
  })
})

describe('stored reports (/api/camp/reports?id=…)', () => {
  const legacy = {
    version: 1, generatedAt: '2026-08-24T00:00:00Z',
    program: { id: F.SAT_CAMP, name: 'SAT Camp', testFamily: 'sat' }, classroom: { id: F.ROOM_A, name: 'A' },
    student: { id: F.STUDENT_A, name: 'Student A', email: null }, period: { start: null, end: null },
    assignments: [], skills: [], strengths: [], weaknesses: [],
    cohort: { n: 0, studentAccuracy: null, percentile: null }, completion: { done: 0, total: 0, rate: 0 },
    // A pre-2026-10-07 snapshot that DID capture a personal mock test.
    mockTests: [{ sessionId: PERSONAL, section: 'math', correctCount: 9, totalCount: 10, completedAt: '2026-08-20T00:00:00Z' }],
  }
  beforeEach(() => {
    db.tables.camp_reports = [{
      id: 'rep-1', camp_program_id: F.SAT_CAMP, classroom_id: F.ROOM_A, student_id: F.STUDENT_A,
      period_start: null, period_end: null, created_at: '2026-08-24T00:00:00Z', deleted_at: null, payload: legacy,
    }]
  })

  it.each([
    ['camp teacher', F.T_ROOM_A],
    ['manager', F.MANAGER],
    ['the student themself', F.STUDENT_A],
  ])('an old snapshot\'s personal mock tests are stripped for the %s', async (_l, who) => {
    CURRENT = who
    const res = await reportsGET(req('/api/camp/reports?id=rep-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.payload.program.name).toBe('SAT Camp') // the rest survives
    expect(body.report.payload).not.toHaveProperty('mockTests')
    expect(JSON.stringify(body)).not.toContain(PERSONAL)
  })

  it('withoutPersonalStudy leaves a current payload untouched', () => {
    const { mockTests: _m, ...current } = legacy
    void _m
    expect(withoutPersonalStudy(current as unknown as CampReportPayload)).toBe(current)
  })
})
