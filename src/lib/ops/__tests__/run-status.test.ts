/** @jest-environment node */
import {
  batchRunStatus,
  worstStatus,
  statusOf,
  heartbeatRowFields,
  alertSeverityFor,
} from '../run-status'

/**
 * Each case is a decision a cron's heartbeat now depends on. The numbers
 * in the first block are the two runs that read green on 2026-10-01.
 */
describe('batchRunStatus', () => {
  it('fails the 2026-10-01 refresh runs that were reported ok', () => {
    // refresh-test-specs: 37 ran, 21 fresh skips => 16 attempted, 13 failed
    expect(batchRunStatus({ attempted: 16, failed: 13 })).toBe('failed')
    // refresh-test-spec-examples: 11 attempted, 10 failed
    expect(batchRunStatus({ attempted: 11, failed: 10 })).toBe('failed')
  })

  it('is ok with no failures, including an empty run', () => {
    expect(batchRunStatus({ attempted: 5, failed: 0 })).toBe('ok')
    expect(batchRunStatus({ attempted: 0, failed: 0 })).toBe('ok')
  })

  it('is degraded at or below the threshold and failed just above it', () => {
    expect(batchRunStatus({ attempted: 10, failed: 1 })).toBe('degraded')
    expect(batchRunStatus({ attempted: 10, failed: 5 })).toBe('degraded') // exactly 50%
    expect(batchRunStatus({ attempted: 10, failed: 6 })).toBe('failed')
  })

  it('is failed when every attempt failed, even a single one', () => {
    expect(batchRunStatus({ attempted: 1, failed: 1 })).toBe('failed')
  })

  it('honours a custom threshold', () => {
    expect(batchRunStatus({ attempted: 10, failed: 2, failRateThreshold: 0.1 })).toBe('failed')
    expect(batchRunStatus({ attempted: 10, failed: 1, failRateThreshold: 0.1 })).toBe('degraded')
  })

  it('never returns ok for input it cannot read', () => {
    expect(batchRunStatus({ attempted: NaN, failed: 0 })).toBe('failed')
    expect(batchRunStatus({ attempted: 3, failed: 4 })).toBe('failed')
    expect(batchRunStatus({ attempted: -1, failed: 0 })).toBe('failed')
    expect(batchRunStatus({ attempted: 3, failed: Infinity })).toBe('failed')
  })
})

describe('worstStatus / statusOf', () => {
  it('picks the worst', () => {
    expect(worstStatus('ok', 'degraded')).toBe('degraded')
    expect(worstStatus('degraded', 'failed', 'ok')).toBe('failed')
    expect(worstStatus('ok', 'ok')).toBe('ok')
    expect(worstStatus()).toBe('ok')
  })

  it('reads a legacy {ok:false} as failed and honours degraded only when not ok', () => {
    expect(statusOf({ ok: false })).toBe('failed')
    expect(statusOf({ ok: false, status: 'degraded' })).toBe('degraded')
    expect(statusOf({ ok: true, status: 'failed' })).toBe('ok')
  })
})

describe('heartbeatRowFields', () => {
  const NOW = '2026-10-02T00:00:00.000Z'

  it('ok resets the streak and moves last_ok_at', () => {
    expect(heartbeatRowFields('ok', 4, NOW)).toEqual({ ok: true, fail_streak: 0, last_run_at: NOW, last_ok_at: NOW })
  })

  it('degraded is ok:false but still moves last_ok_at, so the watchdog does not call it stopped', () => {
    expect(heartbeatRowFields('degraded', 1, NOW)).toEqual({ ok: false, fail_streak: 2, last_run_at: NOW, last_ok_at: NOW })
  })

  it('failed is ok:false and leaves last_ok_at alone', () => {
    const f = heartbeatRowFields('failed', 2, NOW)
    expect(f).toEqual({ ok: false, fail_streak: 3, last_run_at: NOW })
    expect('last_ok_at' in f).toBe(false)
  })
})

describe('alertSeverityFor', () => {
  it('escalates a failed run to critical at three in a row', () => {
    expect(alertSeverityFor('failed', 2, 'warning')).toBe('warning')
    expect(alertSeverityFor('failed', 3, 'warning')).toBe('critical')
  })

  it('keeps a degraded run at the job severity however long it lasts', () => {
    expect(alertSeverityFor('degraded', 10, 'warning')).toBe('warning')
    expect(alertSeverityFor('degraded', 1, 'critical')).toBe('critical')
    expect(alertSeverityFor('degraded', 1, undefined)).toBe('warning')
  })
})
