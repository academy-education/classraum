/**
 * @jest-environment jsdom
 *
 * useUserStore.fetchUser must not name users.email (revoked from
 * `authenticated` by migration 120 — the select would fail outright) and must
 * still surface the caller's own email, now from app_user_contacts.
 */
const selects: string[] = []

jest.mock('@/lib/supabase', () => ({
  db: {
    from: () => {
      const chain: Record<string, unknown> = {}
      chain.select = (cols: string) => { selects.push(cols); return chain }
      chain.eq = () => chain
      chain.single = () => {
        // Behave like PostgREST after migration 120.
        if (/\bemail\b/.test(selects[selects.length - 1])) {
          return Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied for table users' } })
        }
        return Promise.resolve({
          data: { id: 'u1', name: 'Kim', role: 'manager', created_at: '2026-01-01',
                  managers: { academy_id: 'ac1' }, teachers: null, parents: null, students: [] },
          error: null,
        })
      }
      return chain
    },
    rpc: (name: string, args: { uids: string[] }) => Promise.resolve(
      name === 'app_user_contacts' && args.uids[0] === 'u1'
        ? { data: [{ id: 'u1', email: 'kim@x.kr', phone: null }], error: null }
        : { data: [], error: null }),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUserStore } = require('@/stores/useUserStore')

it('loads the user without selecting email, and takes email from app_user_contacts', async () => {
  await useUserStore.getState().fetchUser('u1')
  const state = useUserStore.getState()
  expect(state.error).toBeNull()
  expect(selects.some(s => /\bemail\b/.test(s))).toBe(false)
  expect(state.user).toMatchObject({ id: 'u1', email: 'kim@x.kr', role: 'manager', academy_id: 'ac1' })
})
