import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { deletePortOneBillingKey } from '@/lib/portone-billing-key'
import { sendAccountPermanentlyDeletedEmail } from '@/lib/account-deletion-emails'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { raiseAlert } from '@/lib/ops/alert'

/**
 * Daily cron — processes accounts whose 30-day soft-delete window has
 * expired. For each, runs the role-appropriate cascade via the
 * `delete_user_account_cascade()` Postgres function, then removes the auth
 * identity, then stamps the account_deletion_log row as hard-deleted.
 *
 * Schedule (vercel.json): 03:00 UTC daily = 12:00 KST — well away from the
 * busier morning crons (subscription-billing at 09:00 UTC, etc.).
 *
 * Idempotency: the cascade function returns `{status: "already_deleted"}`
 * for missing users, and the audit-log update has a `WHERE hard_deleted_at
 * IS NULL` guard. So a retry mid-batch (network blip, manual re-fire,
 * preview deploy hitting prod) is safe.
 *
 * Backpressure: processes up to BATCH_LIMIT rows per run. Daily, this is
 * far more headroom than realistic deletion volume. If it ever saturates,
 * leftover rows roll into the next day.
 *
 * Phase 3 handling: when the cascade function raises PHASE_3_REQUIRED for a
 * sole-manager account, this cron logs the failure but does NOT mark the
 * row hard-deleted — the row stays in account_deletion_log pending manual
 * handling. Support / engineering sees these in the audit table and can
 * trigger the Phase 3 academy cascade explicitly.
 */

const BATCH_LIMIT = 50
const GRACE_PERIOD_DAYS = 30

interface ProcessResult {
  userId: string
  status:
    | 'hard_deleted'
    | 'hard_deleted_with_academy'
    | 'phase_3_pending_confirmation'
    | 'unsupported_role'
    | 'error'
  detail?: string
  cascadeSummary?: unknown
}

/**
 * Pulls the "did the user opt-in to academy cascade?" flag out of the most
 * recent open audit-log row. The /api/account/delete endpoint encodes this
 * into the `reason` column as JSON: `{"confirmCascadeAcademy": true|false}`.
 *
 * Falls back to false (safer default — leave for manual review) if the
 * row is missing or unparseable.
 */
/**
 * Phase 3 cascade for a sole-manager user who confirmed academy deletion.
 *
 * Steps, in order:
 *   1. Look up every academy the user solely manages.
 *   2. For each academy: call delete_academy_cascade() RPC. This returns
 *      the list of other-member user_ids whose role rows were deleted
 *      and now need their users row + auth identity cleaned up.
 *   3. For each former-member user_id: call delete_user_account_cascade()
 *      to remove their users row and auth identity. They have no academy
 *      anymore — keeping a partially-functional account is worse UX than
 *      hard-removing it.
 *   4. Finally call delete_user_account_cascade() for the manager
 *      themselves. (At this point the cascade function will succeed
 *      because the sole-managed academies are gone.)
 *   5. Hard-delete each former member's auth identity and update their
 *      audit log (if they had one) or insert a new "cascaded from academy
 *      closure" entry.
 *   6. Hard-delete the manager's auth identity and stamp their audit row.
 *
 * Returns { success: true, summary } on success or { success: false, error }.
 */
async function runAcademyCascade(managerUserId: string): Promise<
  | { success: true; summary: unknown }
  | { success: false; error: string }
> {
  try {
    const { data: soleAcademies, error: soleError } = await dbAdmin
      .rpc('user_sole_managed_academies', { p_user_id: managerUserId })
    if (soleError) {
      return { success: false, error: `sole lookup: ${soleError.message}` }
    }

    const academies = (soleAcademies ?? []) as Array<{
      academy_id: string
      academy_name: string
      member_count: number
    }>

    if (academies.length === 0) {
      // Defensive: the user got flagged PHASE_3_REQUIRED but no longer
      // sole-manages any academy (maybe a co-manager was added between
      // the deletion request and the cron run). Fall through to the
      // normal user cascade.
      // The manager's own deletion request IS schedule-gated — they
      // requested deletion + 30 days have elapsed, that's why we're
      // here — so the default schedule check is fine.
      const { error: userErr } = await dbAdmin.rpc(
        'delete_user_account_cascade',
        { p_user_id: managerUserId }
      )
      if (userErr) return { success: false, error: userErr.message }
      // The `.catch()` this replaces was decorative: deleteUser resolves
      // with { error } rather than rejecting, so a failed auth delete was
      // reported as a completed erasure while the identity — and the
      // ability to sign in with it — still existed.
      const { error: authErr } = await dbAdmin.auth.admin.deleteUser(
        managerUserId
      )
      if (
        authErr &&
        !(authErr.message || '').toLowerCase().includes('not found')
      ) {
        return { success: false, error: `manager auth delete: ${authErr.message}` }
      }
      return { success: true, summary: { note: 'no_longer_sole_manager' } }
    }

    const academySummaries: unknown[] = []
    const allOtherMemberIds = new Set<string>()
    const billingKeyResults: Array<{
      academyId: string
      cancelled: boolean
      error?: string
    }> = []

    // Step 1+2: cascade each academy.
    //
    // BEFORE the SQL cascade, we cancel the PortOne billing key (so the
    // customer's stored card token is actually released — the cascade
    // deletes the academy_subscriptions row, which would otherwise leave
    // the key orphaned at PortOne). Failures here are logged but do not
    // abort the cascade — better to delete the academy with a stranded
    // billing key than to leave the customer's deletion request pending.
    for (const a of academies) {
      // Look up the academy's billing_key from academy_subscriptions
      // BEFORE the cascade runs (otherwise the row will be gone).
      const { data: subRow } = await dbAdmin
        .from('academy_subscriptions')
        .select('billing_key, billing_key_cancelled_at')
        .eq('academy_id', a.academy_id)
        .maybeSingle()

      const billingKey = (subRow as { billing_key?: string } | null)
        ?.billing_key
      const alreadyCancelled = (subRow as { billing_key_cancelled_at?: string } | null)
        ?.billing_key_cancelled_at

      if (billingKey && !alreadyCancelled) {
        const cancelResult = await deletePortOneBillingKey(billingKey)
        billingKeyResults.push({
          academyId: a.academy_id,
          cancelled: cancelResult.cancelled,
          error: cancelResult.error,
        })
        if (cancelResult.cancelled) {
          // Best-effort stamp — error deliberately unchecked. The row is
          // deleted by the cascade a few lines below, so a failed write
          // costs nothing; the authoritative record that the key was
          // released is the PortOne-side cancellation plus the log line.
          await dbAdmin
            .from('academy_subscriptions')
            .update({ billing_key_cancelled_at: new Date().toISOString() })
            .eq('academy_id', a.academy_id)
          console.info(
            `[CRON] PortOne billing key cancelled for academy=${a.academy_id}`
          )
        } else {
          // Loud log so ops can manually clean up at PortOne. NOTE: we
          // intentionally do NOT log any portion of the billing key —
          // even a prefix is sensitive payment credential material, and
          // Vercel logs are team-readable. Ops cross-references via
          // academy_id + the academy_subscriptions row instead.
          console.error(
            `[CRON] PortOne billing-key cancel FAILED for academy=${a.academy_id}: ${cancelResult.error}`
          )
        }
      } else if (billingKey && alreadyCancelled) {
        // Idempotent: prior cron run already cancelled it. Skip.
        billingKeyResults.push({
          academyId: a.academy_id,
          cancelled: true,
          error: 'already_cancelled',
        })
      } else {
        // No subscription / no billing key — nothing to cancel.
        billingKeyResults.push({
          academyId: a.academy_id,
          cancelled: true,
          error: 'no_billing_key',
        })
      }

      const { data: result, error: cascadeErr } = await dbAdmin.rpc(
        'delete_academy_cascade',
        { p_academy_id: a.academy_id }
      )
      if (cascadeErr) {
        return {
          success: false,
          error: `academy ${a.academy_id} cascade: ${cascadeErr.message}`,
        }
      }
      academySummaries.push(result)
      const memberIds = (result as { member_user_ids?: string[] } | null)
        ?.member_user_ids ?? []
      for (const id of memberIds) {
        if (id !== managerUserId) allOtherMemberIds.add(id)
      }
    }

    // Step 3+4: clean up each former member's user row and auth identity.
    const memberResults: Array<{ id: string; ok: boolean; err?: string }> = []
    for (const memberId of allOtherMemberIds) {
      try {
        // Insert an audit log row first so the cascade is traceable.
        // (Best-effort — we don't have email/role/name handy without an
        // extra lookup. The cron context "cascaded from academy" is
        // captured in the reason.)
        const { data: memberRow } = await dbAdmin
          .from('users')
          .select('email, role, name')
          .eq('id', memberId)
          .maybeSingle()
        // FAIL CLOSED. This insert used to be unchecked, one statement
        // before an irreversible cascade — an RLS/constraint/connection
        // failure hard-deleted a user who never asked to be deleted with
        // no audit row at all, and nothing anywhere recorded that it
        // happened. We now require the row back from the database before
        // touching anything destructive; if it isn't there, this member
        // is skipped and left intact for the next run.
        const { data: logRow, error: logInsertError } = await dbAdmin
          .from('account_deletion_log')
          .insert({
            user_id: memberId,
            user_email: memberRow?.email ?? null,
            user_role: memberRow?.role ?? null,
            user_name: memberRow?.name ?? null,
            scheduled_at: new Date().toISOString(),
            hard_deleted_at: new Date().toISOString(),
            reason: JSON.stringify({
              cascadedFromAcademyClosure: true,
              triggeredByUserId: managerUserId,
            }),
          })
          .select('id')
          .maybeSingle()

        if (logInsertError || !logRow) {
          console.error(
            `[CRON] audit log insert FAILED for member=${memberId} — refusing to delete`,
            logInsertError
          )
          await raiseAlert({
            severity: 'critical',
            title: 'Deletion skipped: audit log write failed',
            message:
              `Could not write account_deletion_log for user ${memberId} during ` +
              `the academy cascade triggered by ${managerUserId}. The cascade was ` +
              `SKIPPED for this user (no data deleted) — an unlogged irreversible ` +
              `delete is worse than a delayed one. Investigate and re-run.`,
            dedupeKey: 'account-deletion:audit-log-write-failed',
            error: logInsertError,
            context: { memberId, managerUserId, stage: 'academy_cascade_member' },
          })
          memberResults.push({
            id: memberId,
            ok: false,
            err: 'audit_log_write_failed',
          })
          continue
        }

        // Former academy member: they didn't personally request deletion
        // but their academy is being closed by the (verified, schedule-
        // gated) sole-manager cascade flow. Pass p_skip_schedule_check
        // so the function doesn't reject them with `not_scheduled`.
        const { error: ucErr } = await dbAdmin.rpc(
          'delete_user_account_cascade',
          { p_user_id: memberId, p_skip_schedule_check: true }
        )
        if (ucErr) throw new Error(ucErr.message)

        const { error: aErr } = await dbAdmin.auth.admin.deleteUser(
          memberId
        )
        if (
          aErr &&
          !(aErr.message || '').toLowerCase().includes('not found')
        ) {
          throw new Error(aErr.message)
        }

        // Final confirmation email — best-effort. Their academy was
        // closed by the owner; they were warned 30 days ago via the
        // academy-closure-notice email from /api/account/delete.
        if (memberRow?.email) {
          void sendAccountPermanentlyDeletedEmail({
            email: memberRow.email,
            name: memberRow.name || 'there',
            language: null,
          }).then((res) => {
            if (!res.sent) {
              console.error(
                `[CRON] final email failed for member=${memberId}:`,
                res.error
              )
            }
          })
        }

        memberResults.push({ id: memberId, ok: true })
      } catch (e) {
        const err = (e as Error).message
        console.error(
          `[CRON] member cleanup failed for ${memberId} (academy cascade):`,
          err
        )
        memberResults.push({ id: memberId, ok: false, err })
      }
    }

    // Step 5: finally clean up the manager. Capture their email + name
    // BEFORE the cascade nukes the users row so we can send the final
    // confirmation email after delete succeeds.
    const { data: managerRow } = await dbAdmin
      .from('users')
      .select('email, name')
      .eq('id', managerUserId)
      .maybeSingle()

    const { error: managerCascadeErr } = await dbAdmin.rpc(
      'delete_user_account_cascade',
      { p_user_id: managerUserId }
    )
    if (managerCascadeErr) {
      return { success: false, error: `manager cascade: ${managerCascadeErr.message}` }
    }
    const { error: managerAuthErr } = await dbAdmin.auth.admin.deleteUser(
      managerUserId
    )
    if (
      managerAuthErr &&
      !(managerAuthErr.message || '').toLowerCase().includes('not found')
    ) {
      return {
        success: false,
        error: `manager auth delete: ${managerAuthErr.message}`,
      }
    }

    // Stamp the manager's audit row. Checked: the manager is already
    // gone at this point so we cannot fail closed, but a missing
    // hard_deleted_at makes the audit trail read as "deletion pending"
    // for an account that no longer exists — someone has to backfill it.
    const { error: managerStampError } = await dbAdmin
      .from('account_deletion_log')
      .update({ hard_deleted_at: new Date().toISOString() })
      .eq('user_id', managerUserId)
      .is('hard_deleted_at', null)
      .is('reactivated_at', null)

    if (managerStampError) {
      console.error(
        `[CRON] audit stamp failed for manager=${managerUserId}:`,
        managerStampError
      )
      await raiseAlert({
        severity: 'critical',
        title: 'Audit trail incomplete after hard deletion',
        message:
          `User ${managerUserId} was permanently deleted (academy cascade) but ` +
          `account_deletion_log.hard_deleted_at could not be stamped. The audit ` +
          `row still reads as pending. Backfill required.`,
        dedupeKey: 'account-deletion:audit-stamp-failed',
        error: managerStampError,
        context: { managerUserId, stage: 'academy_cascade_manager' },
      })
    }

    // Final confirmation email for the manager — best-effort.
    if (managerRow?.email) {
      void sendAccountPermanentlyDeletedEmail({
        email: managerRow.email,
        name: managerRow.name || 'there',
        language: null,
      }).then((res) => {
        if (!res.sent) {
          console.error(
            `[CRON] final email failed for manager=${managerUserId}:`,
            res.error
          )
        }
      })
    }

    return {
      success: true,
      summary: {
        academies: academySummaries,
        memberResults,
        billingKeyResults,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

async function getCascadeConfirmation(userId: string): Promise<boolean> {
  const { data, error } = await dbAdmin
    .from('account_deletion_log')
    .select('reason')
    .eq('user_id', userId)
    .is('hard_deleted_at', null)
    .is('reactivated_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.reason) return false
  try {
    const parsed = JSON.parse(data.reason as string)
    return parsed?.confirmCascadeAcademy === true
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  // Auth first: a 401'd request never ran the job, so nothing below it —
  // including any heartbeat — may report. Otherwise an unauthorized caller
  // could keep a dead cron looking alive to the watchdog.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    // Find every user whose grace period has expired AND who hasn't
    // already been hard-deleted (we filter the latter via a join on
    // account_deletion_log being open).
    //
    // PERFORMANCE: The `users_deletion_scheduled_idx` partial index from
    // migration 026 makes this query touch only the small set of rows that
    // are scheduled, regardless of total user count.
    const cutoff = new Date(
      Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: dueUsers, error: selectError } = await dbAdmin
      .from('users')
      .select('id, email, role, name, deletion_scheduled_at')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', cutoff)
      .limit(BATCH_LIMIT)

    if (selectError) {
      console.error('[CRON account-deletions] select failed:', selectError)
      // Returns 500 but never throws, so the heartbeat has to be told
      // explicitly — otherwise a job that did no work would read healthy.
      await recordHeartbeat(
        'process-account-deletions',
        { ok: false, detail: { stage: 'select', error: selectError.message } },
        Date.now() - startedAt
      )
      return NextResponse.json(
        { success: false, error: selectError.message },
        { status: 500 }
      )
    }

    const due = dueUsers ?? []
    console.log(
      `[CRON account-deletions] ${due.length} accounts past grace period (cutoff=${cutoff})`
    )

    const results: ProcessResult[] = []

    for (const user of due) {
      const userId = user.id as string
      try {
        // Step 0 — FAIL CLOSED: never run an irreversible delete without a
        // durable audit row. /api/account/delete inserts one at request
        // time, but that insert is best-effort and can fail; without this
        // guard the cron would happily hard-delete a user with no record
        // that the deletion was ever requested, by whom, or why. If the
        // row isn't there we skip the user and alert — the account stays
        // scheduled and a backfilled row lets the next run proceed.
        const { data: openLog, error: openLogError } = await dbAdmin
          .from('account_deletion_log')
          .select('id')
          .eq('user_id', userId)
          .is('hard_deleted_at', null)
          .is('reactivated_at', null)
          .limit(1)

        if (openLogError || !openLog || openLog.length === 0) {
          console.error(
            `[CRON account-deletions] no open audit row for user=${userId} — refusing to delete`,
            openLogError
          )
          await raiseAlert({
            severity: 'critical',
            title: 'Deletion skipped: no audit row',
            message:
              `User ${userId} is past their 30-day deletion window but has no ` +
              `open account_deletion_log row${openLogError ? ' (lookup failed)' : ''}. ` +
              `The cascade was SKIPPED — deleting a user with no audit trail is ` +
              `not recoverable. Backfill the log row to let the next run proceed.`,
            dedupeKey: 'account-deletion:missing-audit-row',
            error: openLogError,
            context: { userId, role: user.role, stage: 'pre_cascade' },
          })
          results.push({
            userId,
            status: 'error',
            detail: openLogError
              ? `audit log lookup failed: ${openLogError.message}`
              : 'missing_audit_log_row',
          })
          continue
        }

        // Step 1: run the per-role cascade.
        const { data: cascadeResult, error: cascadeError } =
          await dbAdmin.rpc('delete_user_account_cascade', {
            p_user_id: userId,
          })

        // H1 guard: if the cascade function refused (user reactivated
        // between our SELECT and this RPC, or grace period somehow not
        // elapsed), log + skip — do NOT proceed with auth.deleteUser.
        // The reactivated user is healthy; next cron run won't pick
        // them up because deletion_scheduled_at is NULL.
        const cascadeStatus = (cascadeResult as { status?: string } | null)?.status
        if (cascadeStatus === 'not_scheduled') {
          console.warn(
            `[CRON account-deletions] user=${userId} reactivated mid-flight or grace period not elapsed:`,
            cascadeResult
          )
          results.push({
            userId,
            status: 'error',
            detail: 'reactivated_or_not_scheduled',
            cascadeSummary: cascadeResult,
          })
          continue
        }

        if (cascadeError) {
          // PostgREST surfaces raised exceptions in the .message field.
          // Match on the codes we documented in the function.
          const msg = cascadeError.message || ''

          if (msg.includes('PHASE_3_REQUIRED')) {
            // Sole-manager account. Check the audit log: did the user
            // confirm they want to cascade-delete their entire academy
            // when they originally clicked Delete? If not, leave pending
            // for support to manually handle (don't silently destroy the
            // academy).
            const confirmed = await getCascadeConfirmation(userId)
            if (!confirmed) {
              // H2: this is a GDPR right-of-erasure failure mode — the
              // user requested deletion, became sole-manager after the
              // request, and now the cron can't safely complete it. The
              // user's account stays banned-but-not-deleted indefinitely
              // unless an admin intervenes. Surface to admins via the
              // alerts table so it shows up on the AdminDashboard, and
              // log loudly. Idempotent: we use a (severity, title, user_id)
              // pattern so a daily cron retry doesn't pile up duplicate
              // alerts — we check for an existing unresolved alert first.
              console.warn(
                `[CRON account-deletions] user=${userId} requires Phase 3 ` +
                  `(sole manager) but did not confirm academy cascade. ` +
                  `Surfacing alert for admin remediation.`
              )

              const { data: existingAlert } = await dbAdmin
                .from('alerts')
                .select('id')
                .eq('severity', 'warning')
                .eq('resolved', false)
                .contains('context', { user_id: userId, kind: 'phase_3_stuck' })
                .limit(1)
                .maybeSingle()

              if (!existingAlert) {
                // Checked: this row IS the escalation. An unchecked insert
                // here meant a GDPR right-of-erasure failure could go
                // unnoticed forever because the notification about it also
                // failed silently.
                const { error: alertInsertError } = await dbAdmin
                  .from('alerts')
                  .insert({
                    severity: 'warning',
                    title: 'Account stuck in deletion grace period',
                    message:
                      `User ${userId} requested deletion but became sole-manager ` +
                      `of one or more academies before the 30-day window elapsed. ` +
                      `They did not confirm academy cascade in the original request, ` +
                      `so the cron cannot safely proceed. Manually trigger the ` +
                      `academy cascade (via Phase 3 admin endpoint) OR contact the ` +
                      `user to re-confirm via a fresh deletion request.`,
                    context: { user_id: userId, kind: 'phase_3_stuck' },
                  })

                if (alertInsertError) {
                  console.error(
                    `[CRON account-deletions] phase-3 alert insert failed for ${userId}:`,
                    alertInsertError
                  )
                  // Escalate through the shared path, which also reaches
                  // Sentry and (for critical) email — so the dashboard
                  // row failing is not the end of the line.
                  await raiseAlert({
                    severity: 'warning',
                    title: 'Could not record phase-3 stuck deletion',
                    message:
                      `User ${userId} is stuck mid-deletion and the alerts-table ` +
                      `insert that would have surfaced it on the admin dashboard ` +
                      `failed.`,
                    dedupeKey: 'account-deletion:phase3-alert-insert-failed',
                    error: alertInsertError,
                    context: { userId, kind: 'phase_3_stuck' },
                  })
                }
              }

              results.push({
                userId,
                status: 'phase_3_pending_confirmation',
                detail: msg,
              })
              continue
            }

            // Confirmed → run the full academy cascade for each sole-
            // managed academy, then cascade each other member, then the
            // manager themselves.
            const academyResult = await runAcademyCascade(userId)
            if (academyResult.success) {
              results.push({
                userId,
                status: 'hard_deleted_with_academy',
                cascadeSummary: academyResult.summary,
              })
              continue
            } else {
              console.error(
                `[CRON account-deletions] academy cascade failed for ${userId}:`,
                academyResult.error
              )
              results.push({
                userId,
                status: 'error',
                detail: `academy cascade failed: ${academyResult.error}`,
              })
              continue
            }
          }

          if (msg.includes('UNSUPPORTED_ROLE')) {
            console.error(
              `[CRON account-deletions] user=${userId} has unsupported ` +
                `role (admin/super_admin). Clearing schedule.`
            )
            // Don't leave admin accounts in a pending state forever —
            // clear the scheduled column so they re-emerge as healthy.
            // Audit log row stays for the record.
            //
            // Checked: if this silently fails the account stays flagged and
            // the cron re-picks it every single day forever, logging the
            // same error and never converging.
            const { error: clearScheduleError } = await dbAdmin
              .from('users')
              .update({ deletion_scheduled_at: null })
              .eq('id', userId)

            if (clearScheduleError) {
              console.error(
                `[CRON account-deletions] failed to clear schedule for ${userId}:`,
                clearScheduleError
              )
              await raiseAlert({
                severity: 'warning',
                title: 'Could not clear deletion schedule for admin account',
                message:
                  `User ${userId} has an unsupported role for deletion and their ` +
                  `deletion_scheduled_at could not be cleared, so this cron will ` +
                  `retry them every day indefinitely.`,
                dedupeKey: 'account-deletion:clear-schedule-failed',
                error: clearScheduleError,
                context: { userId, role: user.role },
              })
            }
            results.push({
              userId,
              status: 'unsupported_role',
              detail: msg,
            })
            continue
          }

          throw cascadeError
        }

        // Step 2: remove the auth identity. If this fails, the public
        // tables are already cleaned — best we can do is log and retry on
        // the next cron run (the auth_admin call is idempotent enough that
        // a retry won't break anything).
        const { error: authDeleteError } =
          await dbAdmin.auth.admin.deleteUser(userId)

        if (authDeleteError) {
          // Some scenarios are fine — e.g. "User not found" if the auth
          // user was already removed in a prior partial run.
          const am = authDeleteError.message || ''
          if (
            !am.toLowerCase().includes('not found') &&
            !am.toLowerCase().includes('user_not_found')
          ) {
            console.error(
              `[CRON account-deletions] auth.deleteUser(${userId}) failed:`,
              authDeleteError
            )
            results.push({
              userId,
              status: 'error',
              detail: `auth delete failed: ${am}`,
            })
            continue
          }
        }

        // Step 3: stamp the audit log row. We update ALL open rows for
        // this user (typically just one).
        const { error: logError } = await dbAdmin
          .from('account_deletion_log')
          .update({ hard_deleted_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('hard_deleted_at', null)
          .is('reactivated_at', null)

        if (logError) {
          // Non-fatal: the user is gone, just the audit timestamp is
          // missing. Alert (not merely log) — an audit row that still
          // reads "pending" for an account that no longer exists is a
          // compliance discrepancy someone has to reconcile.
          console.error(
            `[CRON account-deletions] audit log update failed for ${userId}:`,
            logError
          )
          await raiseAlert({
            severity: 'critical',
            title: 'Audit trail incomplete after hard deletion',
            message:
              `User ${userId} was permanently deleted but ` +
              `account_deletion_log.hard_deleted_at could not be stamped. The ` +
              `audit row still reads as pending. Backfill required.`,
            dedupeKey: 'account-deletion:audit-stamp-failed',
            error: logError,
            context: { userId, stage: 'main_loop' },
          })
        }

        results.push({
          userId,
          status: 'hard_deleted',
          cascadeSummary: cascadeResult,
        })
        console.log(
          `[CRON account-deletions] hard-deleted user=${userId} role=${user.role}`,
          cascadeResult
        )

        // Step 4: final confirmation email. Best-effort; the user's row
        // is already gone — we use the email/name we captured in the
        // initial SELECT above. Don't block on this.
        if (user.email) {
          void sendAccountPermanentlyDeletedEmail({
            email: user.email,
            name: (user.name as string) || 'there',
            // The user_preferences row was cascade-deleted along with the
            // users row, so we can't look up their language at this point.
            // Default to English. (Could be improved by capturing language
            // alongside email at SELECT time — file as follow-up if it
            // matters.)
            language: null,
          }).then((res) => {
            if (!res.sent) {
              console.error(
                `[CRON account-deletions] final email failed for ${userId}:`,
                res.error
              )
            }
          })
        }
      } catch (perUserError) {
        console.error(
          `[CRON account-deletions] error processing user=${userId}:`,
          perUserError
        )
        results.push({
          userId,
          status: 'error',
          detail: (perUserError as Error).message,
        })
        // Continue to next user — don't abort the whole batch for one
        // bad row.
      }
    }

    const summary = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})

    // Per-status counts only — the full `results` array (which carries a
    // cascade summary per user) stays in the HTTP response.
    //
    // ok is NOT unconditionally true: every per-user failure above is
    // caught and pushed as status 'error' so the batch can continue, and
    // the route still returns 200. Reporting ok:true anyway would tell
    // the watchdog that erasure requests are being honoured on a run
    // where none of them were.
    const errorCount = results.filter((r) => r.status === 'error').length
    await recordHeartbeat(
      'process-account-deletions',
      {
        ok: errorCount === 0,
        detail: { processed: results.length, errorCount, ...summary },
      },
      Date.now() - startedAt
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: results.length,
      summary,
      results,
    })
  } catch (error) {
    console.error('[CRON account-deletions] unhandled error:', error)
    await recordHeartbeat(
      'process-account-deletions',
      { ok: false, detail: { error: (error as Error).message } },
      Date.now() - startedAt
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
