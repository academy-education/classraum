/**
 * @jest-environment jsdom
 *
 * A study-only account loads its profile WITHOUT logging an error.
 *
 * `users.role` names the student's default SURFACE; it is not a claim
 * that the matching role row exists. A study-only account is
 * `role: 'student'` with no `students` row, and on 2026-08-03 that was
 * 12 of 204 such users (plus manager 2/13, teacher 1/22, parent 1/175).
 * Every one of them hit `.single()`, which counts zero rows as an error,
 * and printed "[useMobileProfile] Error fetching students row" on every
 * profile load.
 *
 * The damage is not the message, it is the training: a console that
 * cries on a normal state is a console nobody reads when something
 * actually breaks. So the assertion here is on console.error, and the
 * second test is the one that keeps this honest — a REAL fault must
 * still be reported, or "no errors logged" would be satisfiable by
 * deleting the logging.
 */
import { renderHook, waitFor } from '@testing-library/react'

/** Chainable PostgREST stub. `rows` is what the terminal call resolves to. */
function table(rows: Record<string, unknown>[] | null, err: unknown = null) {
  const single = () =>
    rows && rows.length === 1
      ? Promise.resolve({ data: rows[0], error: err })
      : Promise.resolve({
          data: null,
          // What supabase-js really returns for .single() with 0 rows.
          error: err ?? { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
        })
  const maybeSingle = () =>
    Promise.resolve(
      err
        ? { data: null, error: err }
        : { data: rows && rows.length === 1 ? rows[0] : null, error: null },
    )
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'is']) chain[m] = () => chain
  chain.single = single
  chain.maybeSingle = maybeSingle
  chain.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: rows ?? [], error: err }).then(r)
  return chain
}

const USER = { id: 'u1', name: 'Andrew', email: 'a@b.c', role: 'student', phone: '010-0000-0000' }

/** Tables the hook touches. `students` deliberately has NO row. */
let FIXTURE: Record<string, { rows: Record<string, unknown>[] | null; err?: unknown }>

jest.mock('@/lib/supabase', () => ({
  db: {
    from: (t: string) => {
      const f = FIXTURE[t] ?? { rows: [] }
      return table(f.rows, f.err ?? null)
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useMobileProfile } = require('@/app/mobile/profile/hooks/useMobileProfile')

describe('a study-only student (no students row)', () => {
  let spy: jest.SpyInstance

  beforeEach(() => {
    sessionStorage.clear()
    FIXTURE = {
      users: { rows: [USER] },
      user_preferences: { rows: [] },
      students: { rows: [] }, // ← the whole point: the row is absent
    }
    spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => spy.mockRestore())

  it('loads the profile without logging an error', async () => {
    const { result } = renderHook(() => useMobileProfile('u1', 'Andrew', []))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.profile?.role).toBe('student')
    // users.phone is the study-only account's only phone home.
    expect(result.current.profile?.phone).toBe('010-0000-0000')

    const messages = spy.mock.calls.map(c => String(c[0]))
    expect(messages.filter(m => m.includes('Error fetching students row'))).toEqual([])
  })

  it('STILL reports a genuine fault on the same query', async () => {
    // Without this, "logs no error" is trivially satisfiable by removing
    // the console.error entirely — the test would stay green while the
    // real signal was gone. An RLS refusal must still be heard.
    FIXTURE.students = { rows: null, err: { code: '42501', message: 'permission denied for table students' } }

    const { result } = renderHook(() => useMobileProfile('u1', 'Andrew', []))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const messages = spy.mock.calls.map(c => String(c[0]))
    expect(messages.filter(m => m.includes('Error fetching students row')).length).toBe(1)
  })
})
