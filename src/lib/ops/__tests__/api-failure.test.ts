/** @jest-environment node */
/**
 * The fake error_logs below STORES rows and answers the spread query from
 * what was stored, so the distinct-student alert is exercised against the
 * rows recordApiFailure actually wrote — not against a canned count.
 */
type Row = Record<string, any>
const rows: Row[] = []
const getUser = jest.fn()

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: (table: string) => {
      if (table !== 'error_logs') throw new Error(`unexpected table ${table}`)
      const filters: Array<(r: Row) => boolean> = []
      const q: any = {
        insert: async (row: Row) => { rows.push({ ...row, created_at: new Date().toISOString() }); return { error: null } },
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q },
        gte: (c: string, v: string) => { filters.push((r) => r[c] >= v); return q },
        contains: (c: string, v: Row) => {
          filters.push((r) => Object.entries(v).every(([k, val]) => r[c]?.[k] === val)); return q
        },
        not: (c: string) => { filters.push((r) => r[c] != null); return q },
        limit: () => q,
        then: (ok: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows.filter((r) => filters.every((f) => f(r))), error: null }).then(ok),
      }
      return q
    },
  },
}))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

import { NextRequest, NextResponse } from 'next/server'
import { raiseAlert } from '@/lib/ops/alert'
import {
  recordApiFailure, withApiFailureLogging, normaliseErrorLabel, zodIssueShape,
} from '../api-failure'

const alertMock = raiseAlert as unknown as jest.Mock
const STUDENT_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const STUDENT_B = 'bbbbbbbb-0000-4000-8000-000000000002'
const ANSWER = 'My essay about the summer I spent volunteering'
const ZOD_DETAILS = JSON.stringify([
  { code: 'invalid_enum_value', received: ANSWER, path: ['questions', 3, 'type'], message: `Invalid enum value, received '${ANSWER}'` },
])

const req = (token = 'tok') => new NextRequest('http://localhost/api/study/test/submit', {
  method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{}',
})

beforeEach(() => {
  rows.length = 0
  alertMock.mockClear()
  getUser.mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('recordApiFailure', () => {
  it('records route, status, label and zod issue paths — never the answer text', async () => {
    await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'bad payload', details: ZOD_DETAILS, userId: STUDENT_A })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      service_name: 'StudyApi', level: 'warn', user_id: STUDENT_A,
      context: expect.objectContaining({ route: 'study/test/submit', status: 400, error: 'bad payload', zodIssues: ['questions.#.type:invalid_enum_value'] }),
    })
    expect(JSON.stringify(rows[0])).not.toContain('volunteering')
  })

  it('does NOT alert when one student hits the same failure repeatedly', async () => {
    for (let i = 0; i < 4; i++) {
      await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'bad payload', userId: STUDENT_A })
    }
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('alerts when a second DISTINCT student hits the same route+status+error', async () => {
    await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'bad payload', userId: STUDENT_A })
    expect(alertMock).not.toHaveBeenCalled()
    await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'bad payload', userId: STUDENT_B })
    expect(alertMock).toHaveBeenCalledTimes(1)
    expect(alertMock.mock.calls[0][0]).toMatchObject({
      severity: 'warning',
      dedupeKey: 'api-failure-spread:study/test/submit|400|bad payload',
      context: expect.objectContaining({ distinctStudents: 2 }),
    })
  })

  it('does not merge different signatures: same route, different error', async () => {
    await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'bad payload', userId: STUDENT_A })
    await recordApiFailure({ route: 'study/test/submit', status: 400, error: 'session not found', userId: STUDENT_B })
    await recordApiFailure({ route: 'study/test/generate', status: 400, error: 'bad payload', userId: STUDENT_B })
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('5xx spreading is critical', async () => {
    await recordApiFailure({ route: 'study/explain', status: 502, error: 'model failed', userId: STUDENT_A })
    await recordApiFailure({ route: 'study/explain', status: 502, error: 'model failed', userId: STUDENT_B })
    expect(alertMock.mock.calls[0][0].severity).toBe('critical')
  })
})

describe('withApiFailureLogging', () => {
  it('records a non-2xx response with the verified user, and returns it unchanged', async () => {
    getUser.mockResolvedValue({ data: { user: { id: STUDENT_A } } })
    const h = withApiFailureLogging('study/test/submit', async (_r: NextRequest) =>
      NextResponse.json({ error: 'bad payload', details: ZOD_DETAILS }, { status: 400 }))
    const res = await h(req())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('bad payload')   // body still readable
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(STUDENT_A)
    expect(rows[0].context.zodIssues).toEqual(['questions.#.type:invalid_enum_value'])
  })

  it('records nothing for 2xx (including 207) and for 401', async () => {
    for (const status of [200, 207, 401]) {
      const h = withApiFailureLogging('study/x', async (_r: NextRequest) => NextResponse.json({ error: 'e' }, { status }))
      await h(req())
    }
    expect(rows).toHaveLength(0)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('records a thrown handler as 500 and rethrows', async () => {
    getUser.mockResolvedValue({ data: { user: { id: STUDENT_A } } })
    const h = withApiFailureLogging('study/x', async (_r: NextRequest): Promise<Response> => { throw new Error(ANSWER) })
    await expect(h(req())).rejects.toThrow()
    expect(rows).toHaveLength(1)
    expect(rows[0].context).toMatchObject({ status: 500, error: 'unhandled exception' })
    expect(JSON.stringify(rows)).not.toContain('volunteering')
  })
})

describe('label hygiene', () => {
  it('masks ids, emails and long numbers so the signature is stable and PII-free', () => {
    expect(normaliseErrorLabel('session 8e5cc313-1111-4222-8333-444455556666 not found for kim@x.com 0101234567'))
      .toBe('session <id> not found for <email> <n>')
    expect(normaliseErrorLabel(undefined)).toBe('unlabelled')
  })
  it('ignores non-zod details', () => {
    expect(zodIssueShape('free text')).toEqual([])
    expect(zodIssueShape(undefined)).toEqual([])
  })
})
