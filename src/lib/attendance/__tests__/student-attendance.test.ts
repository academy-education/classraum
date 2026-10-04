/**
 * The fake client below behaves like Postgres on a uuid column: ONE
 * non-uuid value in the IN list fails the whole query with 22P02, which is
 * exactly what production logged for student 9fa00a4a on 2026-10-03.
 */
const reportClientError = jest.fn()
jest.mock('@/lib/report-client-error', () => ({
  reportClientError: (...a: unknown[]) => reportClientError(...a),
}))

import { fetchStudentAttendance, realSessionIds } from '../student-attendance'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REAL_A = '8e5cc313-1111-4222-8333-444455556666'
const REAL_B = '0b7e1f22-aaaa-4bbb-8ccc-ddddeeeeffff'
const CLASSROOM = 'c8b227d1-9999-4888-8777-666655554444'
const VIRTUAL = `virtual-${CLASSROOM}-2026-10-03-20:00`
const STUDENT = '9fa00a4a-0000-4000-8000-000000000001'

const rows = [
  { classroom_session_id: REAL_A, student_id: STUDENT, status: 'present' },
  { classroom_session_id: REAL_B, student_id: STUDENT, status: 'late' },
]

function pgLikeClient(calls: string[][] = []) {
  return {
    from: () => ({
      select: () => ({
        in: (_c: string, ids: string[]) => ({
          eq: async (_c2: string, student: string) => {
            calls.push(ids)
            const bad = ids.find((id) => !UUID_RE.test(id))
            if (bad) {
              return {
                data: null,
                error: { code: '22P02', message: `invalid input syntax for type uuid: "${bad}"` },
              }
            }
            return {
              data: rows.filter((r) => ids.includes(r.classroom_session_id) && r.student_id === student),
              error: null,
            }
          },
        }),
      }),
    }),
  }
}

beforeEach(() => {
  reportClientError.mockClear()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('fetchStudentAttendance', () => {
  it('returns attendance for real sessions when a virtual session is in the same batch', async () => {
    const calls: string[][] = []
    const { map, error } = await fetchStudentAttendance(
      pgLikeClient(calls) as never, [REAL_A, VIRTUAL, REAL_B], STUDENT, 'test')
    expect(error).toBeNull()
    expect(map.get(REAL_A)).toBe('present')
    expect(map.get(REAL_B)).toBe('late')
    expect(map.size).toBe(2)
    expect(calls).toEqual([[REAL_A, REAL_B]])
    expect(reportClientError).not.toHaveBeenCalled()
  })

  it('does not query at all when every session is virtual', async () => {
    const calls: string[][] = []
    const { map, error } = await fetchStudentAttendance(
      pgLikeClient(calls) as never, [VIRTUAL], STUDENT, 'test')
    expect(calls).toHaveLength(0)
    expect(map.size).toBe(0)
    expect(error).toBeNull()
  })

  it('reports a query error instead of swallowing it, with no PII', async () => {
    const failing = {
      from: () => ({ select: () => ({ in: () => ({ eq: async () => ({
        data: null, error: { code: '42501', message: 'permission denied' } }) }) }) }),
    }
    const { map, error } = await fetchStudentAttendance(failing as never, [REAL_A], STUDENT, 'where.x')
    expect(error?.code).toBe('42501')
    expect(map.size).toBe(0)
    expect(reportClientError).toHaveBeenCalledTimes(1)
    const [where, , ctx] = reportClientError.mock.calls[0]
    expect(where).toBe('where.x')
    expect(JSON.stringify(ctx)).not.toContain(STUDENT)
  })
})

describe('realSessionIds', () => {
  it('keeps uuids, drops virtual ids, nulls and duplicates', () => {
    expect(realSessionIds([REAL_A, VIRTUAL, null, undefined, REAL_A, 'abc'])).toEqual([REAL_A])
  })
})
