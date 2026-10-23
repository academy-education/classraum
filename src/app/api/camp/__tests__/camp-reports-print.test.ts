/** @jest-environment node */
/**
 * GET /api/camp/reports?classroomId=…&include=payload — the data behind
 * /print/camp-reports/[classroomId] (2026-10-23).
 *
 * The print view prints every published report of a classroom. It must
 * be readable by exactly the people the list already serves (camp
 * teachers of the program and academy managers), never include a
 * withdrawn report, carry the teacher payload without personal Study,
 * and narrow to one period when asked.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
let user = F.T_ROOM_A
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => db.from(t) } }))
jest.mock('@/lib/api-auth', () => ({ getUserFromRequest: async () => ({ id: user }) }))

import { GET } from '@/app/api/camp/reports/route'

const payload = (student: string) => ({
  version: 2, student: { id: student, name: student, email: null }, classroom: { id: F.ROOM_A, name: 'A' },
  mockTests: [{ id: 'personal-study' }],
})

function seed() {
  const s = F.campSeed()
  s.users = [{ id: F.STUDENT_A, name: 'Kim' }, { id: F.STUDENT_OUTSIDER, name: 'Lee' }]
  s.camp_reports = [
    { id: 'r1', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, student_id: F.STUDENT_A, period_start: '2026-10-01', period_end: '2026-10-10', created_at: '2026-10-10T01:00:00Z', deleted_at: null, payload: payload(F.STUDENT_A) },
    { id: 'r2', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, student_id: F.STUDENT_OUTSIDER, period_start: '2026-10-01', period_end: '2026-10-10', created_at: '2026-10-10T01:00:01Z', deleted_at: null, payload: payload(F.STUDENT_OUTSIDER) },
    { id: 'r3', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, student_id: F.STUDENT_A, period_start: '2026-10-01', period_end: '2026-10-17', created_at: '2026-10-17T01:00:00Z', deleted_at: null, payload: payload(F.STUDENT_A) },
    { id: 'gone', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, student_id: F.STUDENT_A, period_start: '2026-10-01', period_end: '2026-10-17', created_at: '2026-10-17T02:00:00Z', deleted_at: '2026-10-18T00:00:00Z', payload: payload(F.STUDENT_A) },
  ]
  return s
}

const get = (q: string) => GET(new NextRequest(`http://localhost/api/camp/reports?${q}`))

beforeEach(() => { user = F.T_ROOM_A; db = fakeDb(seed()) })

it('returns every published report with its teacher payload, withdrawn ones excluded', async () => {
  const res = await get(`classroomId=${F.ROOM_A}&include=payload`)
  expect(res.status).toBe(200)
  const { reports } = await res.json()
  expect(reports.map((r: { id: string }) => r.id).sort()).toEqual(['r1', 'r2', 'r3'])
  for (const r of reports) {
    expect(r.payload.student.id).toBe(r.studentId)
    expect(r.payload).not.toHaveProperty('mockTests')      // personal Study never printed
  }
})

it('leaves the plain list payload-free', async () => {
  const { reports } = await (await get(`classroomId=${F.ROOM_A}`)).json()
  expect(reports[0]).not.toHaveProperty('payload')
})

it('narrows to one reporting period', async () => {
  const { reports } = await (await get(`classroomId=${F.ROOM_A}&include=payload&periodStart=2026-10-01&periodEnd=2026-10-10`)).json()
  expect(reports.map((r: { id: string }) => r.id).sort()).toEqual(['r1', 'r2'])
})

it('is refused to an academy teacher with no camp classroom, like the list', async () => {
  user = F.T_PLAIN
  const res = await get(`classroomId=${F.ROOM_A}&include=payload`)
  expect(res.status).toBe(403)
  expect((await res.json()).code).toBe('forbidden')
})

it('is refused to a teacher of a different camp', async () => {
  user = F.T_TOEFL
  expect((await get(`classroomId=${F.ROOM_A}&include=payload`)).status).toBe(403)
})

it('is allowed to the academy manager', async () => {
  user = F.MANAGER
  expect((await get(`classroomId=${F.ROOM_A}&include=payload`)).status).toBe(200)
})
