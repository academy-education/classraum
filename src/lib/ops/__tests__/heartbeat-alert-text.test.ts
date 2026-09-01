/** @jest-environment node */
/**
 * A failure alert must say WHICH half failed.
 *
 * Every job's alert read "Scheduled work it is responsible for is not
 * being done." On 2026-09-01 that fired for account-deletion-digest,
 * which had a 5-run failure streak — and the natural reading was that
 * accounts legally due for deletion were still in the database.
 *
 * They were not. The digest's own detail said `overdue: 0`. The
 * deletions had run; Postmark had refused the email announcing them.
 * The work was done and the operator was not told, which is a different
 * problem with a different fix, and the alert described the wrong one.
 *
 * An alert that overstates is one people learn to discount, which is the
 * expensive failure — the next real "work not done" is read as another
 * false alarm.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = readFileSync(join(process.cwd(), 'src/lib/ops/heartbeat.ts'), 'utf8')

describe('failure alerts distinguish work from notification', () => {
  it('branches on an emailError in the detail', () => {
    expect(src).toMatch(/emailError/)
  })

  it('still says work is not being done when there is no email error', () => {
    // The generic line must survive for the jobs it is true of.
    expect(src).toMatch(/Scheduled work it is responsible for is not being done\./)
  })

  it('says the work ran when only delivery failed', () => {
    expect(src).toMatch(/Its work ran, but the notification could not be delivered/)
  })

  it('names the underlying delivery error rather than hiding it', () => {
    // "This account is not approved to send email" is the actual fix —
    // an alert that omits it sends the reader to the wrong system.
    expect(src).toMatch(/\$\{\(result\.detail as \{ emailError: string \}\)\.emailError\}/)
  })
})
