/** @jest-environment node */
/**
 * Owner rule (2026-10-07): "Only camp teachers can see the study results
 * ... as long as the teacher and the student is in the same camp."
 *
 * Run against fakeDb, which HONOURS filters — a dropped `.eq('academy_id')`
 * or `.eq('active', true)` changes the answer here, where a queue mock
 * would return whatever was enqueued.
 */
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'

let db: FakeDb
jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: (t: string) => db.from(t) },
}))

import {
  canViewProgramResults,
  canViewClassroomCampResults,
  isCampTeacherOfProgram,
  isStudentInProgram,
  isStudentOfAcademy,
} from '@/lib/camp/access'
import { canManageClassroom } from '@/lib/camp/api'

const SAT = { id: F.SAT_CAMP, academy_id: F.ACAD }
const TOEFL = { id: F.TOEFL_CAMP, academy_id: F.ACAD }
const room = (id: string) => db.tables.classrooms.find(r => r.id === id) as {
  id: string; teacher_id: string | null; academy_id: string; camp_program_id: string | null
}

beforeEach(() => { db = fakeDb(F.campSeed()) })

describe('program-wide results (overview, Students tab)', () => {
  test.each([
    ['camp teacher of the program', F.T_ROOM_A, true],
    ['camp teacher of ANOTHER classroom of the same camp', F.T_ROOM_B, true],
    ['academy manager', F.MANAGER, true],
    ['camp teacher of a DIFFERENT camp', F.T_TOEFL, false],
    ['regular academy teacher (no camp classroom)', F.T_PLAIN, false],
    ['deactivated teacher still on a camp room', F.T_INACTIVE, false],
    ['manager of another academy', F.OTHER_MANAGER, false],
    ['stranger who forged a camp classroom', F.T_STRANGER, false],
  ])('%s -> %s', async (_label, user, expected) => {
    expect(await canViewProgramResults(user, SAT)).toBe(expected)
  })

  test('a camp teacher sees their own camp, not the other one', async () => {
    expect(await canViewProgramResults(F.T_TOEFL, TOEFL)).toBe(true)
    expect(await canViewProgramResults(F.T_TOEFL, SAT)).toBe(false)
    expect(await canViewProgramResults(F.T_ROOM_A, TOEFL)).toBe(false)
  })
})

describe('forged camp classrooms grant nothing', () => {
  test('a classroom in academy X taught by a non-member of X', async () => {
    // The row exists (pre-122 write gap) and points at the SAT camp.
    expect(room(F.ROOM_FORGED_IN_X).camp_program_id).toBe(F.SAT_CAMP)
    expect(await isCampTeacherOfProgram(F.T_STRANGER, SAT)).toBe(false)
  })

  test('break-test: the same stranger becomes a camp teacher once they ARE staff of X', async () => {
    // Proves the denial above comes from the membership check, not from
    // the fixture failing to match the classroom at all.
    db.tables.teachers.push({ user_id: F.T_STRANGER, academy_id: F.ACAD, active: true })
    expect(await isCampTeacherOfProgram(F.T_STRANGER, SAT)).toBe(true)
  })

  test('a classroom in academy Y wired to academy X\'s camp is refused even to Y\'s manager', async () => {
    expect(await canViewClassroomCampResults(F.OTHER_MANAGER, room(F.ROOM_FORGED_IN_Y))).toBe(false)
    expect(await canViewClassroomCampResults(F.T_STRANGER, room(F.ROOM_FORGED_IN_Y))).toBe(false)
    // ...and to academy X's own manager and camp teachers: the forged
    // room's roster is whoever the stranger enrolled, not X's camp.
    expect(await canViewClassroomCampResults(F.MANAGER, room(F.ROOM_FORGED_IN_Y))).toBe(false)
    expect(await canViewClassroomCampResults(F.T_ROOM_A, room(F.ROOM_FORGED_IN_Y))).toBe(false)
  })

  test('canManageClassroom (assignment builder, quota spend) refuses the forger', async () => {
    expect(await canManageClassroom(F.T_STRANGER, room(F.ROOM_FORGED_IN_X))).toBe(false)
    expect(await canManageClassroom(F.T_STRANGER, room(F.ROOM_FORGED_IN_Y))).toBe(false)
    // and still admits the real owner and the manager
    expect(await canManageClassroom(F.T_ROOM_A, room(F.ROOM_A))).toBe(true)
    expect(await canManageClassroom(F.MANAGER, room(F.ROOM_A))).toBe(true)
    // a deactivated teacher no longer manages their old camp room
    expect(await canManageClassroom(F.T_INACTIVE, room(F.ROOM_GONE))).toBe(false)
  })
})

describe('classroom results (dashboard, drill-down, answer review, reports)', () => {
  test('same camp, other classroom: allowed', async () => {
    expect(await canViewClassroomCampResults(F.T_ROOM_B, room(F.ROOM_A))).toBe(true)
  })
  test('other camp: denied', async () => {
    expect(await canViewClassroomCampResults(F.T_TOEFL, room(F.ROOM_A))).toBe(false)
  })
  test('regular academy teacher: denied', async () => {
    expect(await canViewClassroomCampResults(F.T_PLAIN, room(F.ROOM_A))).toBe(false)
  })
  test('non-camp classroom: no camp results for anyone, even its own teacher', async () => {
    expect(await canViewClassroomCampResults(F.T_PLAIN, room(F.ROOM_PLAIN))).toBe(false)
    expect(await canViewClassroomCampResults(F.MANAGER, room(F.ROOM_PLAIN))).toBe(false)
  })
})

describe('"same camp" for the student', () => {
  test('enrolled in a classroom of the program', async () => {
    expect(await isStudentInProgram(F.STUDENT_A, SAT)).toBe(true)
    expect(await isStudentInProgram(F.STUDENT_A, TOEFL)).toBe(false)
    expect(await isStudentInProgram(F.STUDENT_TOEFL, SAT)).toBe(false)
  })
  test('on the academy roster', async () => {
    expect(await isStudentOfAcademy(F.STUDENT_A, F.ACAD)).toBe(true)
    expect(await isStudentOfAcademy(F.STUDENT_OUTSIDER, F.ACAD)).toBe(false)
  })
})
