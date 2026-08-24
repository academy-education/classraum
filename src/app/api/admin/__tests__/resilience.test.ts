/** @jest-environment node */
import { isRetryable, withRetry, settle, valueOrNull } from '../_lib/resilience'

/**
 * The behaviours that have to hold for the dashboard fix to mean anything:
 *
 *  · a transient fault is retried and SUCCEEDS on a later attempt (this is
 *    the one that actually prevents the reported blank page);
 *  · a deterministic fault is NOT retried (otherwise a bad table name costs
 *    3x the latency on every load, forever);
 *  · a failed section returns null instead of a plausible number.
 */

const noSleep = async () => {}

describe('isRetryable', () => {
  it('treats a network fault as retryable', () => {
    expect(isRetryable(new TypeError('fetch failed'))).toBe(true)
    expect(isRetryable(new Error('count(users_trend_2026-08-13) failed: TypeError: fetch failed'))).toBe(true)
    expect(isRetryable(new Error('socket hang up'))).toBe(true)
    expect(isRetryable('ECONNRESET')).toBe(true)
  })

  it('treats a deterministic query fault as permanent', () => {
    expect(isRetryable(new Error('relation "public.nope" does not exist'))).toBe(false)
    expect(isRetryable(new Error('permission denied for table users'))).toBe(false)
    expect(isRetryable(new Error('42P01'))).toBe(false)
    expect(isRetryable(new Error('Could not find the table \'public.nope\' in the schema cache'))).toBe(false)
  })
})

describe('withRetry', () => {
  it('recovers from a transient failure — the reported dashboard defect', async () => {
    let calls = 0
    const result = await withRetry(async () => {
      calls++
      if (calls < 3) throw new TypeError('fetch failed')
      return 447
    }, { sleep: noSleep })
    expect(result).toBe(447)
    expect(calls).toBe(3)
  })

  it('gives up after the configured attempts and rethrows the LAST error', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error(`fetch failed #${calls}`) }, { attempts: 3, sleep: noSleep })
    ).rejects.toThrow('fetch failed #3')
    expect(calls).toBe(3)
  })

  it('does not retry a deterministic failure', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error('relation "x" does not exist') }, { sleep: noSleep })
    ).rejects.toThrow('does not exist')
    expect(calls).toBe(1)
  })

  it('backs off exponentially between attempts', async () => {
    const delays: number[] = []
    await expect(
      withRetry(async () => { throw new TypeError('fetch failed') }, {
        attempts: 4,
        baseDelayMs: 100,
        sleep: async (ms) => { delays.push(ms) },
      })
    ).rejects.toThrow()
    expect(delays).toEqual([100, 200, 400])
  })

  it('does not call the function twice when it succeeds first time', async () => {
    let calls = 0
    expect(await withRetry(async () => { calls++; return 'ok' }, { sleep: noSleep })).toBe('ok')
    expect(calls).toBe(1)
  })
})

describe('settle', () => {
  it('passes a successful section through', async () => {
    const s = await settle('academies', async () => ({ total: 12 }), { sleep: noSleep })
    expect(s).toEqual({ ok: true, value: { total: 12 } })
    expect(valueOrNull(s)).toEqual({ total: 12 })
  })

  it('captures a failure instead of throwing — one tile, not the page', async () => {
    const s = await settle('revenue', async () => { throw new Error('boom does not exist') }, { sleep: noSleep })
    expect(s.ok).toBe(false)
    expect(s).toMatchObject({ error: expect.stringContaining('boom') })
  })

  it('NEVER substitutes a zero for a failed read', async () => {
    const s = await settle('revenue', async () => { throw new Error('nope does not exist') }, { sleep: noSleep })
    // The whole point: a broken read must be distinguishable from ₩0.
    expect(valueOrNull(s)).toBeNull()
    expect(valueOrNull(s)).not.toBe(0)
  })

  it('isolates sections from each other', async () => {
    const [a, b] = await Promise.all([
      settle('a', async () => 1, { sleep: noSleep }),
      settle('b', async () => { throw new Error('permission denied') }, { sleep: noSleep }),
    ])
    expect(valueOrNull(a)).toBe(1)
    expect(valueOrNull(b)).toBeNull()
  })
})
