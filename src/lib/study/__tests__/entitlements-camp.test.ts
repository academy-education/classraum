/**
 * A camp entitlement only ever ADDS access — it must never narrow.
 *
 * The trap (docs/CAMP-MODE-PLAN.md): resolveAccess treats "zero active
 * entitlement rows" as the free/trial state where EVERY test is open.
 * Camp mode writes a study_entitlements row (source='camp') so camp
 * students get mock tests for their program's family — but if that row
 * counted as a pass, joining a SAT camp would take a free student from
 * "sees everything" down to "sees only SAT". These tests pin the
 * source-aware branch that prevents exactly that.
 */
import { getTestAccess, canAccessTest } from '@/lib/study/entitlements'

interface EntRow { test: string; source: string | null; expires_at: string | null }

let SUB: { status: string; plan: string } | null
let ROWS: EntRow[]

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        or: () => chain,
        maybeSingle: async () => ({ data: table === 'study_subscriptions' ? SUB : null }),
        then(resolve: (r: { data: unknown; error: null }) => void) {
          // Terminal await on the entitlements query (select().eq().or()).
          return Promise.resolve({ data: table === 'study_entitlements' ? ROWS : [], error: null }).then(resolve)
        },
      }
      return chain
    },
  },
}))

beforeEach(() => {
  SUB = null
  ROWS = []
})

describe('camp entitlements are add-only', () => {
  test('free user with no rows sees all tests (baseline)', async () => {
    expect(await getTestAccess('s1')).toEqual({ all: true, tests: [] })
  })

  test('THE case: a camp-only grant must NOT narrow a free user', async () => {
    ROWS = [{ test: 'sat', source: 'camp', expires_at: null }]
    // Before the source-aware branch this returned { all: false, tests: ['sat'] }
    // and a free camp student lost TOEFL access by joining a SAT camp.
    expect(await getTestAccess('s1')).toEqual({ all: true, tests: [] })
    expect(await canAccessTest('s1', 'toefl')).toBe(true)
    expect(await canAccessTest('s1', 'sat')).toBe(true)
  })

  test('a pass still scopes, and a camp grant widens the pass list', async () => {
    ROWS = [
      { test: 'toefl', source: 'pass', expires_at: null },
      { test: 'sat', source: 'camp', expires_at: null },
    ]
    const access = await getTestAccess('s1')
    expect(access.all).toBe(false)
    expect(access.tests.sort()).toEqual(['sat', 'toefl'])
  })

  test('a pass alone scopes exactly as before (no camp regression)', async () => {
    ROWS = [{ test: 'sat', source: 'pass', expires_at: null }]
    expect(await getTestAccess('s1')).toEqual({ all: false, tests: ['sat'] })
    expect(await canAccessTest('s1', 'toefl')).toBe(false)
  })

  test('all-access pass opens everything regardless of camp rows', async () => {
    ROWS = [
      { test: '*', source: 'pass', expires_at: null },
      { test: 'sat', source: 'camp', expires_at: null },
    ]
    expect(await getTestAccess('s1')).toEqual({ all: true, tests: [] })
  })

  test('recurring premium short-circuits before entitlements', async () => {
    SUB = { status: 'active', plan: 'premium_v1' }
    ROWS = [{ test: 'sat', source: 'camp', expires_at: null }]
    expect(await getTestAccess('s1')).toEqual({ all: true, tests: [] })
  })
})
