/** @jest-environment node */
/**
 * loadClassroomCampData ignored the roster and user-name read errors. A failed roster read became
 * `studentIds = []`, and every camp surface built on it (overview, Students tab, reports) rendered a class of
 * zero students with 0% everything, indistinguishable from an empty class. It now throws.
 */
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'

let db: FakeDb
let failing: string | null = null

/** A builder whose every chain call returns itself and which resolves to a PostgREST error. */
function failingBuilder() {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'or', 'order', 'range', 'limit', 'not']) b[m] = () => b
  b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok, bad)
  return b
}

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: (t: string) => (t === failing ? failingBuilder() : db.from(t)) },
}))

import { loadClassroomCampData } from '../reports'

const room = { id: 'room-a', name: 'A', camp_program_id: 'prog-sat' }

beforeEach(() => {
  failing = null
  db = fakeDb({
    camp_programs: [{ id: 'prog-sat', name: 'SAT', test_family: 'sat', deleted_at: null }],
    classroom_students: [{ classroom_id: 'room-a', student_id: 'student-a' }],
    camp_assignments: [],
    users: [{ id: 'student-a', name: 'Student A', email: null }],
    study_sessions: [],
  })
})

it('loads normally when every read succeeds', async () => {
  const data = await loadClassroomCampData(room)
  expect('error' in data).toBe(false)
  if (!('error' in data)) {
    expect(data.studentIds).toEqual(['student-a'])
    expect(data.usersById.get('student-a')?.name).toBe('Student A')
  }
})

it('a failed roster read throws instead of reporting an empty class', async () => {
  failing = 'classroom_students'
  await expect(loadClassroomCampData(room)).rejects.toThrow(/roster/)
})

it('a failed student-name read throws instead of rendering nameless students', async () => {
  failing = 'users'
  await expect(loadClassroomCampData(room)).rejects.toThrow(/names/)
})
