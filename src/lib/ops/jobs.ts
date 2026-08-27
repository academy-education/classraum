/**
 * The registry of scheduled jobs the watchdog expects to hear from.
 *
 * `maxSilenceMinutes` is deliberately generous — roughly 2× the cadence
 * plus slack — so a single skipped or slow run does not page anyone, but
 * a job that has genuinely stopped is caught within one cycle.
 *
 * Keep in sync with `crons` in vercel.json. The test in
 * src/lib/__tests__/ops-jobs.test.ts asserts exactly that, so adding a
 * cron without registering it here fails CI rather than shipping an
 * unmonitored job — which is precisely how 18 crons ran unwatched.
 */

export interface JobSpec {
  /** Heartbeat key. Matches the cron path's last segment. */
  job: string
  /** Human name for alert copy. */
  label: string
  schedule: string
  maxSilenceMinutes: number
  /** critical = money or delivery is affected the moment it stops. */
  severity: 'warning' | 'critical'
}

const H = 60
const D = 24 * H

export const JOB_REGISTRY: JobSpec[] = [
  // Money. If these stop, charges are missed or refunds never reconcile.
  { job: 'subscription-billing',         label: 'Subscription billing',        schedule: '0 9 * * *',   maxSilenceMinutes: 2 * D, severity: 'critical' },
  { job: 'study-billing',                label: 'Study billing',               schedule: '15 9 * * *',  maxSilenceMinutes: 2 * D, severity: 'critical' },
  { job: 'study-refund-sync',            label: 'Study refund reconcile',      schedule: '40 3 * * *',  maxSilenceMinutes: 2 * D, severity: 'critical' },
  // Invoices real families. Scheduled 2026-08-20 after every template
  // was rolled forward to a future occurrence — before that, a daily run
  // would have emitted back-dated invoices going back to Jan 2025.
  { job: 'recurring-payments',           label: 'Recurring student invoicing', schedule: '35 0 * * *',  maxSilenceMinutes: 2 * D, severity: 'critical' },
  { job: 'sync',                         label: 'PortOne sync',                schedule: '0 */6 * * *', maxSilenceMinutes: 14 * H, severity: 'critical' },
  { job: 'payment-reminders',            label: 'Payment reminders',           schedule: '10 0 * * *',  maxSilenceMinutes: 2 * D, severity: 'warning' },

  // Credits. Stops refunding students whose generation died.
  { job: 'study-reap-stuck-generations', label: 'Stuck-generation reaper',     schedule: '*/10 * * * *', maxSilenceMinutes: 45,   severity: 'critical' },

  // Delivery. Students/teachers stop being told things.
  { job: 'session-reminders',            label: 'Session reminders',           schedule: '0 0 * * *',   maxSilenceMinutes: 2 * D, severity: 'warning' },
  { job: 'assignment-reminders',         label: 'Assignment reminders',        schedule: '5 0 * * *',   maxSilenceMinutes: 2 * D, severity: 'warning' },
  { job: 'pending-grades-reminder',      label: 'Pending grades reminder',     schedule: '0 9 * * *',   maxSilenceMinutes: 2 * D, severity: 'warning' },
  { job: 'session-completion',           label: 'Session auto-completion',     schedule: '0 10 * * *',  maxSilenceMinutes: 2 * D, severity: 'warning' },
  { job: 'study-push-reminders',         label: 'Study push reminders',        schedule: '0 9 * * *',   maxSilenceMinutes: 2 * D, severity: 'warning' },
  { job: 'study-weekly-recap',           label: 'Study weekly recap',          schedule: '0 0 * * 1',   maxSilenceMinutes: 9 * D, severity: 'warning' },
  { job: 'study-league-roll',            label: 'Study league roll',           schedule: '5 0 * * 1',   maxSilenceMinutes: 9 * D, severity: 'warning' },
  { job: 'study-resolve-duels',          label: 'Study duel resolution',       schedule: '0 * * * *',   maxSilenceMinutes: 3 * H, severity: 'warning' },

  // Compliance / housekeeping.
  { job: 'process-account-deletions',    label: 'Account deletion processor',  schedule: '0 3 * * *',   maxSilenceMinutes: 2 * D, severity: 'critical' },
  { job: 'account-deletion-digest',      label: 'Account deletion digest',     schedule: '0 0 * * 1',   maxSilenceMinutes: 9 * D, severity: 'warning' },
  // Weekly is plenty for a 6-month clock, and the job is silent until
  // `apple` is in NEXT_PUBLIC_OAUTH_PROVIDERS. Critical because the
  // failure it guards is Apple sign-in breaking with no deploy, no code
  // change and nothing in our logs.
  { job: 'apple-secret-expiry',          label: 'Apple secret expiry check',   schedule: '0 6 * * 1',   maxSilenceMinutes: 9 * D, severity: 'critical' },

  // Content refresh. Monthly/quarterly — long silence is normal.
  { job: 'refresh-test-specs',           label: 'Test spec refresh',           schedule: '30 4 1 * *',  maxSilenceMinutes: 40 * D, severity: 'warning' },
  { job: 'refresh-test-spec-examples',   label: 'Test spec example refresh',   schedule: '0 5 1 1,4,7,10 *', maxSilenceMinutes: 100 * D, severity: 'warning' },
]

export const jobSpec = (job: string): JobSpec | undefined =>
  JOB_REGISTRY.find(j => j.job === job)
