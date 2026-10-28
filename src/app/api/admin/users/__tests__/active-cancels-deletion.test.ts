/** @jest-environment node */
/**
 * Setting a user to "active" in the admin panel must cancel a pending
 * self-deletion, not just lift the ban. On 2026-09-28 the toggle only
 * unbanned a scheduled student; she paid and studied, and the hard-delete
 * cron erased her account 30 days after her original request.
 */
import { PATCH } from '@/app/api/admin/users/route'
import type { NextRequest } from 'next/server'

type Write = { table: string; values: Record<string, unknown>; filters: [string, string, unknown][] }
const writes: Write[] = []
const updateUserById = jest.fn(async () => ({ error: null }))

function chain(table: string) {
  const w: Write = { table, values: {}, filters: [] }
  const c: Record<string, unknown> = {}
  const self = () => c
  c.select = self
  c.eq = (col: string, v: unknown) => { w.filters.push(['eq', col, v]); return c }
  c.is = (col: string, v: unknown) => { w.filters.push(['is', col, v]); return c }
  c.single = async () => ({ data: { role: 'super_admin' }, error: null })
  c.update = (values: Record<string, unknown>) => { w.values = values; writes.push(w); return c }
  c.insert = async () => ({ error: null })
  c.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res)
  return c
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }),
      admin: { updateUserById: (...a: unknown[]) => (updateUserById as jest.Mock)(...a) },
    },
    from: (t: string) => chain(t),
  }),
}))
jest.mock('../../_lib/admin-auth', () => ({ listAllAuthUsers: jest.fn() }))

const req = (body: unknown) =>
  ({
    headers: { get: () => 'Bearer t' },
    json: async () => body,
  }) as unknown as NextRequest

describe('admin users PATCH — status', () => {
  beforeEach(() => { writes.length = 0; updateUserById.mockClear() })

  it('"active" lifts the ban AND cancels a pending deletion', async () => {
    const res = await PATCH(req({ id: 'student-1', status: 'active' }))
    expect((await res.json()).success).toBe(true)

    expect(updateUserById).toHaveBeenCalledWith('student-1', { ban_duration: 'none' })
    const usersWrite = writes.find(w => w.table === 'users')
    expect(usersWrite?.values).toEqual({ deletion_scheduled_at: null })
    expect(usersWrite?.filters).toContainEqual(['eq', 'id', 'student-1'])
    const logWrite = writes.find(w => w.table === 'account_deletion_log')
    expect(logWrite?.values.reactivated_at).toEqual(expect.any(String))
    expect(logWrite?.filters).toEqual(expect.arrayContaining([
      ['eq', 'user_id', 'student-1'], ['is', 'reactivated_at', null], ['is', 'hard_deleted_at', null],
    ]))
  })

  it('"suspended" does not touch the deletion schedule', async () => {
    await PATCH(req({ id: 'student-1', status: 'suspended' }))
    expect(updateUserById).toHaveBeenCalledWith('student-1', { ban_duration: '876000h' })
    expect(writes.filter(w => w.table === 'users' || w.table === 'account_deletion_log')).toEqual([])
  })
})
