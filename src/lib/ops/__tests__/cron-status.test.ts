/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  deliveryStatus,
  reminderStatus,
  refundSyncStatus,
  duelsStatus,
  portoneSyncStatus,
  subscriptionBillingStatus,
} from '../cron-status'

/**
 * Every cron here caught per-item errors, counted them, and recorded
 * ok:true. Each block is one job's decision; the last block pins that the
 * route actually hands the decision to its heartbeat (route files may
 * export only handlers, so wiring is checked by source).
 */
describe('deliveryStatus (push reminders, weekly recap, receipt sweep)', () => {
  it('ok when nothing failed, skips do not count', () => {
    expect(deliveryStatus({ sent: 0, failed: 0 })).toBe('ok')
    expect(deliveryStatus({ sent: 3, failed: 0 })).toBe('ok')
  })
  it('degraded on some failures, failed when most or all failed', () => {
    expect(deliveryStatus({ sent: 9, failed: 1 })).toBe('degraded')
    expect(deliveryStatus({ sent: 0, failed: 4 })).toBe('failed')
  })
})

describe('reminderStatus', () => {
  it('reads failed against the total, not reminded against total', () => {
    // 2 of 5 had no recipients (skipped, not failed): still ok.
    expect(reminderStatus({ remindedInvoices: 3, totalInvoices: 5, failed: 0 })).toBe('ok')
    expect(reminderStatus({ remindedSessions: 4, totalSessions: 5, failed: 1 })).toBe('degraded')
  })
  it('takes the worst of due and overdue', () => {
    expect(reminderStatus(
      { remindedAssignments: 2, totalAssignments: 2, failed: 0 },
      { notifiedAssignments: 0, totalAssignments: 2, failed: 2 },
    )).toBe('failed')
  })
  it('an early-return result with no total and no failed is ok', () => {
    expect(reminderStatus({ remindedInvoices: 0 })).toBe('ok')
  })
  it('failures without a readable total are not ok', () => {
    expect(reminderStatus({ failed: 1 })).toBe('failed')
  })
})

describe('refundSyncStatus', () => {
  it('any unverifiable payment is not ok', () => {
    expect(refundSyncStatus({ checked: 29, unverifiable: 0 })).toBe('ok')
    expect(refundSyncStatus({ checked: 29, unverifiable: 1 })).toBe('degraded')
    expect(refundSyncStatus({ checked: 29, unverifiable: 29 })).toBe('failed')
  })
})

describe('duelsStatus', () => {
  it('an ended duel left active is a failure', () => {
    expect(duelsStatus({ examined: 0, unresolved: 0 })).toBe('ok')
    expect(duelsStatus({ examined: 4, unresolved: 1 })).toBe('degraded')
    expect(duelsStatus({ examined: 2, unresolved: 2 })).toBe('failed')
  })
})

describe('portoneSyncStatus', () => {
  it('worst side wins', () => {
    const ok = { synced: 0, errors: 0 }
    expect(portoneSyncStatus({ settlements: ok, payouts: ok })).toBe('ok')
    expect(portoneSyncStatus({ settlements: { synced: 9, errors: 1 }, payouts: ok })).toBe('degraded')
    expect(portoneSyncStatus({ settlements: ok, payouts: { synced: 0, errors: 3 } })).toBe('failed')
  })
})

describe('subscriptionBillingStatus', () => {
  it('declines are not counted at all; writes and rejections fail; anomalies degrade', () => {
    expect(subscriptionBillingStatus({ writeFailures: 0, rejected: 0, anomalies: 0 })).toBe('ok')
    expect(subscriptionBillingStatus({ writeFailures: 1, rejected: 0, anomalies: 0 })).toBe('failed')
    expect(subscriptionBillingStatus({ writeFailures: 0, rejected: 1, anomalies: 0 })).toBe('failed')
    expect(subscriptionBillingStatus({ writeFailures: 0, rejected: 0, anomalies: 2 })).toBe('degraded')
  })
})

describe('routes hand the decision to the heartbeat', () => {
  const src = (p: string) => readFileSync(join(process.cwd(), 'src/app/api', p), 'utf8')
  it.each([
    ['cron/study-push-reminders/route.ts', /withHeartbeat\('study-push-reminders', runReminders, deliveryStatus\)/],
    ['cron/study-weekly-recap/route.ts', /withHeartbeat\('study-weekly-recap', runRecap, deliveryStatus\)/],
    ['cron/study-receipt-sweep/route.ts', /\}, deliveryStatus\)/],
    ['cron/payment-reminders/route.ts', /r => reminderStatus\(r\.dueResult, r\.overdueResult\)/],
    ['cron/assignment-reminders/route.ts', /r => reminderStatus\(r\.dueResult, r\.overdueResult\)/],
    ['cron/session-reminders/route.ts', /r => reminderStatus\(r\)/],
    ['cron/study-refund-sync/route.ts', /heartbeatFor\(status, /],
    ['cron/study-resolve-duels/route.ts', /heartbeatFor\(duelsStatus\(summary\), summary\)/],
    ['portone/sync/route.ts', /withHeartbeat\('sync', \(\) => syncAll\(options\), portoneSyncStatus\)/],
    ['cron/subscription-billing/route.ts', /subscriptionBillingStatus\(\{ writeFailures, rejected, anomalies \}\)/],
    ['cron/study-league-roll/route.ts', /heartbeatFor\(closedError \? 'failed' : 'ok', summary\)/],
    ['cron/refresh-test-specs/route.ts', /\}, s => s\.status\)/],
    ['cron/refresh-test-spec-examples/route.ts', /\}, s => s\.status\)/],
  ])('%s', (file, re) => {
    expect(src(file)).toMatch(re)
  })

  it('push reminders count an FCM oauth failure as failed, not skipped', () => {
    const s = src('cron/study-push-reminders/route.ts')
    expect(s.match(/if \(result\.skipped && result\.failed === 0\) skipped\+\+/g)).toHaveLength(2)
    expect(s).not.toMatch(/if \(result\.skipped\) skipped\+\+/)
  })

  it('the five reminder triggers count their per-item catch and return it', () => {
    const s = readFileSync(join(process.cwd(), 'src/lib/notification-triggers.ts'), 'utf8')
    expect(s.match(/\} catch \([a-zA-Z]+\) \{\n\s+failedCount\+\+/g)).toHaveLength(5)
    expect(s.match(/, failed: failedCount \}/g)).toHaveLength(5)
  })
})
