/** @jest-environment node */
import { isTestAccount, fetchTestAccountIds, testFlagsFor } from '@/lib/study/test-accounts'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Minimal PostgREST stand-in: per table, rows filtered by eq / in, paged by range. */
function fakeDb(tables: Record<string, Array<Record<string, unknown>>>, fail?: string): SupabaseClient {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])]
      const result = (data: unknown) => (table === fail ? { data: null, error: { message: 'boom' } } : { data, error: null })
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => { rows = rows.filter(r => r[c] === v); return q },
        in: (c: string, v: unknown[]) => { rows = rows.filter(r => v.includes(r[c])); return q },
        order: () => q,
        range: (a: number, b: number) => Promise.resolve(result(rows.slice(a, b + 1))),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result(rows)).then(res, rej),
      }
      return q
    },
  } as unknown as SupabaseClient
}

describe('isTestAccount', () => {
  it.each([
    [{}, false], [{ isInternal: true }, true], [{ isStudyTestUser: true }, true],
    [{ isInternal: true, isStudyTestUser: true }, true], [{ isInternal: null, isStudyTestUser: null }, false],
  ])('%j -> %s', (f, want) => expect(isTestAccount(f)).toBe(want))
})

describe('fetchTestAccountIds', () => {
  it('is the UNION of both flags, each side alone counts', async () => {
    const db = fakeDb({
      users: [{ id: 'a', is_internal: true }, { id: 'b', is_internal: false }, { id: 'c', is_internal: true }],
      study_user_prefs: [{ student_id: 'b', is_test_user: true }, { student_id: 'c', is_test_user: true }, { student_id: 'd', is_test_user: false }],
    })
    expect([...await fetchTestAccountIds(db)].sort()).toEqual(['a', 'b', 'c'])
  })
  it('pages past 1000 rows rather than truncating', async () => {
    const users = Array.from({ length: 2500 }, (_, i) => ({ id: `u${String(i).padStart(4, '0')}`, is_internal: true }))
    expect((await fetchTestAccountIds(fakeDb({ users, study_user_prefs: [] }))).size).toBe(2500)
  })
  it('throws on a failed read instead of returning a partial set', async () => {
    await expect(fetchTestAccountIds(fakeDb({ users: [] }, 'study_user_prefs'))).rejects.toThrow(/is_test_user/)
  })
})

describe('testFlagsFor', () => {
  it('reports the union and which flag fired, for every requested id', async () => {
    const db = fakeDb({
      users: [{ id: 'a', is_internal: true }, { id: 'b', is_internal: false }, { id: 'z', is_internal: false }],
      study_user_prefs: [{ student_id: 'b', is_test_user: true }],
    })
    const m = await testFlagsFor(db, ['a', 'b', 'z'])
    expect(m.get('a')).toEqual({ isTestAccount: true, isInternal: true, isStudyTestUser: false })
    expect(m.get('b')).toEqual({ isTestAccount: true, isInternal: false, isStudyTestUser: true })
    expect(m.get('z')).toEqual({ isTestAccount: false, isInternal: false, isStudyTestUser: false })
  })
  it('throws on a failed read', async () => {
    await expect(testFlagsFor(fakeDb({ users: [] }, 'users'), ['a'])).rejects.toThrow(/users/)
  })
})
