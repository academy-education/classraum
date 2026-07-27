/** @jest-environment node */
/**
 * Guard tests for the hard-delete cron.
 *
 * The property under test is fail-closed behaviour around the audit
 * trail: `delete_user_account_cascade` is irreversible, so it must never
 * run for a user whose `account_deletion_log` row is missing or whose
 * lookup failed. Previously the audit write was unchecked and sat one
 * statement before the cascade — a user could be permanently deleted
 * with no record that the deletion was ever requested.
 */
import { GET } from '@/app/api/cron/process-account-deletions/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { raiseAlert } from '@/lib/ops/alert'
import { tableRouter } from '@/tests/study-route-helpers'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { admin: { deleteUser: jest.fn() } },
  },
}))
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn() }))
jest.mock('@/lib/ops/heartbeat', () => ({ recordHeartbeat: jest.fn() }))
jest.mock('@/lib/portone-billing-key', () => ({
  deletePortOneBillingKey: jest.fn(),
}))
jest.mock('@/lib/account-deletion-emails', () => ({
  sendAccountPermanentlyDeletedEmail: jest.fn(async () => ({ sent: true })),
}))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock
const deleteUserMock = dbAdmin.auth.admin.deleteUser as unknown as jest.Mock
const verifyCronAuthMock = verifyCronAuth as unknown as jest.Mock
const raiseAlertMock = raiseAlert as unknown as jest.Mock

const DUE_USER = {
  id: 'user-1',
  email: 'gone@example.com',
  role: 'student',
  name: 'Gone',
  deletion_scheduled_at: '2020-01-01T00:00:00Z',
}

const req = {} as NextRequest

describe('process-account-deletions — audit-log guard', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    verifyCronAuthMock.mockReturnValue(true)
    deleteUserMock.mockResolvedValue({ error: null })
    rpcMock.mockResolvedValue({ data: { status: 'deleted' }, error: null })
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
    ;(console.log as jest.Mock).mockRestore()
    ;(console.warn as jest.Mock).mockRestore()
  })

  it('does NOT run the cascade when the audit-log row is missing', async () => {
    enqueue('users', { data: [DUE_USER] })
    // No open account_deletion_log row for this user.
    enqueue('account_deletion_log', { data: [] })

    const res = await GET(req)
    const body = await res.json()

    // The irreversible call must not have happened.
    expect(rpcMock).not.toHaveBeenCalled()
    expect(deleteUserMock).not.toHaveBeenCalled()

    expect(body.results).toEqual([
      { userId: 'user-1', status: 'error', detail: 'missing_audit_log_row' },
    ])
    expect(raiseAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
    )
  })

  it('does NOT run the cascade when the audit-log lookup itself fails', async () => {
    enqueue('users', { data: [DUE_USER] })
    enqueue('account_deletion_log', { error: { message: 'connection reset' } })

    const res = await GET(req)
    const body = await res.json()

    expect(rpcMock).not.toHaveBeenCalled()
    expect(deleteUserMock).not.toHaveBeenCalled()
    expect(body.results[0].status).toBe('error')
    expect(body.results[0].detail).toContain('connection reset')
    expect(raiseAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
    )
  })

  it('proceeds with the cascade when an open audit-log row exists', async () => {
    enqueue('users', { data: [DUE_USER] })
    enqueue('account_deletion_log', { data: [{ id: 'log-1' }] })
    enqueue('account_deletion_log', { error: null }) // hard_deleted_at stamp

    const res = await GET(req)
    const body = await res.json()

    expect(rpcMock).toHaveBeenCalledWith('delete_user_account_cascade', {
      p_user_id: 'user-1',
    })
    expect(deleteUserMock).toHaveBeenCalledWith('user-1')
    expect(body.results[0].status).toBe('hard_deleted')
  })

  it('rejects unauthenticated callers without touching anything', async () => {
    verifyCronAuthMock.mockReturnValue(false)

    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
