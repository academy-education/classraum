/** @jest-environment node */
/**
 * recordHeartbeat / withHeartbeat against a fake table: what a degraded
 * or failed run actually WRITES and RAISES. The pure decisions are in
 * run-status.test.ts; this pins that heartbeat.ts uses them.
 */
const upserts: Array<Record<string, unknown>> = []
const raised: Array<{ severity: string; title: string; message: string }> = []
const resolved: string[] = []
let prevStreak = 0

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { fail_streak: prevStreak } }) }) }),
      upsert: async (row: Record<string, unknown>) => { upserts.push(row); return { error: null } },
    }),
  },
}))
jest.mock('@/lib/ops/alert', () => ({
  raiseAlert: async (a: { severity: string; title: string; message: string }) => { raised.push(a) },
  resolveAlerts: async (k: string) => { resolved.push(k) },
}))

import { recordHeartbeat, withHeartbeat, heartbeatFor } from '../heartbeat'

beforeEach(() => { upserts.length = 0; raised.length = 0; resolved.length = 0; prevStreak = 0 })

describe('recordHeartbeat with a status', () => {
  it('degraded: ok:false, last_ok_at moves, alert says partially failed', async () => {
    await recordHeartbeat('refresh-test-specs', heartbeatFor('degraded', { failed: 2 }))
    expect(upserts[0]!.ok).toBe(false)
    expect(upserts[0]!.last_ok_at).toBeDefined()
    expect(upserts[0]!.fail_streak).toBe(1)
    expect((upserts[0]!.detail as Record<string, unknown>).status).toBe('degraded')
    expect(raised).toHaveLength(1)
    expect(raised[0]!.title).toBe('Test spec refresh partially failed')
    expect(raised[0]!.message).toMatch(/ran to completion/)
    expect(resolved).toEqual([])
  })

  it('failed: ok:false, last_ok_at untouched, alert says failed', async () => {
    await recordHeartbeat('apple-secret-expiry', heartbeatFor('failed', { kind: 'missing' }))
    expect(upserts[0]!.ok).toBe(false)
    expect(upserts[0]!.last_ok_at).toBeUndefined()
    expect(raised[0]!.title).toBe('Apple secret expiry check failed')
    expect(raised[0]!.severity).toBe('critical') // the job's own severity
  })

  it('ok: resolves the job-failed alert and raises nothing', async () => {
    prevStreak = 5
    await recordHeartbeat('refresh-test-specs', heartbeatFor('ok', {}))
    expect(upserts[0]!.ok).toBe(true)
    expect(upserts[0]!.fail_streak).toBe(0)
    expect(raised).toEqual([])
    expect(resolved).toEqual(['job-failed:refresh-test-specs'])
  })

  it('a legacy {ok:false} with no status is still a failure', async () => {
    await recordHeartbeat('study-billing', { ok: false, detail: {} })
    expect(upserts[0]!.last_ok_at).toBeUndefined()
    expect(raised[0]!.title).toBe('Study billing failed')
  })
})

describe('withHeartbeat reads the result when told how', () => {
  it('records the status the reader returns for a resolved promise', async () => {
    const out = await withHeartbeat('refresh-test-spec-examples', async () => ({ failed: 10 }), () => 'failed')
    expect(out).toEqual({ failed: 10 })
    expect(upserts[0]!.ok).toBe(false)
    expect(raised[0]!.title).toBe('Test spec example refresh failed')
  })

  it('without a reader, a resolved promise is ok (unchanged default)', async () => {
    await withHeartbeat('session-completion', async () => ({ n: 1 }))
    expect(upserts[0]!.ok).toBe(true)
  })

  it('a throw is still a failure and rethrows', async () => {
    await expect(withHeartbeat('sync', async () => { throw new Error('boom') }, () => 'ok')).rejects.toThrow('boom')
    expect(upserts[0]!.ok).toBe(false)
  })
})
