/** @jest-environment node */
/**
 * POST /api/admin/academy-members — the replacement for the self-serve
 * membership path that migration 103 removed.
 *
 * The guards here are the ones whose absence caused the original
 * problem: an unvalidated academy id, and a role a caller could grant
 * themselves.
 */
import { POST } from '@/app/api/admin/academy-members/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/app/api/admin/_lib/admin-auth', () => ({ requireAdmin: jest.fn() }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const requireAdminMock = requireAdmin as unknown as jest.Mock

const req = (body: unknown) => ({ json: async () => body } as unknown as Parameters<typeof POST>[0])

let inserted: Record<string, unknown> | null
let insertedInto: string | null
let roleUpdatedTo: string | null

function wire(opts: {
  academy?: { id: string; name: string } | null
  user?: { id: string; email: string; role: string } | null
  already?: boolean
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'academies') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.academy ?? null }) }) }),
    }
    if (table === 'users') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.user ?? null }) }) }),
      update: (patch: Record<string, string>) => ({
        eq: async () => { roleUpdatedTo = patch.role; return { error: null } },
      }),
    }
    return {
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.already ? { user_id: 'u1' } : null }) }) }) }),
      insert: async (row: Record<string, unknown>) => { inserted = row; insertedInto = table; return { error: null } },
    }
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  inserted = null; insertedInto = null; roleUpdatedTo = null
  requireAdminMock.mockResolvedValue({ userId: 'admin-1', role: 'admin' })
  wire({ academy: { id: 'a1', name: 'HERALD' }, user: { id: 'u1', email: 'x@y.z', role: 'student' } })
})

it('refuses a non-admin caller', async () => {
  requireAdminMock.mockResolvedValue(null)
  const res = await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'manager' }))
  expect(res.status).toBe(401)
  expect(inserted).toBeNull()
})

it('refuses a role outside manager|teacher', async () => {
  for (const role of ['student', 'parent', 'admin', 'super_admin', 'owner']) {
    const res = await POST(req({ email: 'x@y.z', academyId: 'a1', role }))
    expect(res.status).toBe(400)
  }
  expect(inserted).toBeNull()
})

// The escalation existed because nobody checked the academy was real.
it('404s on an academy that does not exist', async () => {
  wire({ academy: null, user: { id: 'u1', email: 'x@y.z', role: 'student' } })
  const res = await POST(req({ email: 'x@y.z', academyId: 'nope', role: 'manager' }))
  expect(res.status).toBe(404)
  expect(inserted).toBeNull()
})

// Deliberately does not create accounts: that would put account creation
// behind an admin token and allow making privileged users unknowingly.
it('404s when no account has that email, and creates nothing', async () => {
  wire({ academy: { id: 'a1', name: 'HERALD' }, user: null })
  const res = await POST(req({ email: 'ghost@y.z', academyId: 'a1', role: 'manager' }))
  expect(res.status).toBe(404)
  expect((await res.json()).error).toMatch(/sign up first/)
  expect(inserted).toBeNull()
})

it('adds a manager and promotes the surface pointer', async () => {
  const res = await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'manager' }))
  expect(res.status).toBe(200)
  expect(insertedInto).toBe('managers')
  expect(inserted).toMatchObject({ user_id: 'u1', academy_id: 'a1', active: true })
  expect(roleUpdatedTo).toBe('manager')
})

it('adds a teacher to the teachers table, not managers', async () => {
  await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'teacher' }))
  expect(insertedInto).toBe('teachers')
})

describe('users.role is promoted, never demoted', () => {
  // It is the default-surface pointer, not the identity. Demoting would
  // downgrade someone who manages another academy, or reduce an admin.
  it('does not demote a manager who is added as a teacher', async () => {
    wire({ academy: { id: 'a1', name: 'HERALD' }, user: { id: 'u1', email: 'x@y.z', role: 'manager' } })
    await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'teacher' }))
    expect(insertedInto).toBe('teachers')
    expect(roleUpdatedTo).toBeNull()
  })

  it('does not reduce an admin', async () => {
    wire({ academy: { id: 'a1', name: 'HERALD' }, user: { id: 'u1', email: 'x@y.z', role: 'super_admin' } })
    await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'manager' }))
    expect(roleUpdatedTo).toBeNull()
  })
})

it('is idempotent for someone already in that academy', async () => {
  wire({ academy: { id: 'a1', name: 'HERALD' }, user: { id: 'u1', email: 'x@y.z', role: 'student' }, already: true })
  const res = await POST(req({ email: 'x@y.z', academyId: 'a1', role: 'manager' }))
  expect(res.status).toBe(200)
  expect((await res.json()).alreadyMember).toBe(true)
  expect(inserted).toBeNull()
})
