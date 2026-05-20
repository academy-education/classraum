import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { deletePortOneBillingKey } from '@/lib/portone-billing-key'

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
    const { data: soleAcademies, error: soleError } = await supabaseAdmin
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
      const { error: userErr } = await supabaseAdmin.rpc(
        'delete_user_account_cascade',
        { p_user_id: managerUserId }
      )
      if (userErr) return { success: false, error: userErr.message }
      await supabaseAdmin.auth.admin
        .deleteUser(managerUserId)
        .catch((e) => console.warn('[CRON] manager auth delete:', e))
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
      const { data: subRow } = await supabaseAdmin
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
          // Best-effort stamp — the row is about to be deleted by the
          // cascade anyway, but recording it now means a partial failure
          // (PortOne ok, cascade not yet run) leaves a meaningful trail.
          await supabaseAdmin
            .from('academy_subscriptions')
            .update({ billing_key_cancelled_at: new Date().toISOString() })
            .eq('academy_id', a.academy_id)
          console.info(
            `[CRON] PortOne billing key cancelled for academy=${a.academy_id}`
          )
        } else {
          // Loud log so ops can manually clean up at PortOne.
          console.error(
            `[CRON] PortOne billing-key cancel FAILED for academy=${a.academy_id} ` +
              `(key=${billingKey.substring(0, 12)}…): ${cancelResult.error}`
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

      const { data: result, error: cascadeErr } = await supabaseAdmin.rpc(
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
        const { data: memberRow } = await supabaseAdmin
          .from('users')
          .select('email, role, name')
          .eq('id', memberId)
          .maybeSingle()
        await supabaseAdmin.from('account_deletion_log').insert({
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

        const { error: ucErr } = await supabaseAdmin.rpc(
          'delete_user_account_cascade',
          { p_user_id: memberId }
        )
        if (ucErr) throw new Error(ucErr.message)

        const { error: aErr } = await supabaseAdmin.auth.admin.deleteUser(
          memberId
        )
        if (
          aErr &&
          !(aErr.message || '').toLowerCase().includes('not found')
        ) {
          throw new Error(aErr.message)
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

    // Step 5: finally clean up the manager.
    const { error: managerCascadeErr } = await supabaseAdmin.rpc(
      'delete_user_account_cascade',
      { p_user_id: managerUserId }
    )
    if (managerCascadeErr) {
      return { success: false, error: `manager cascade: ${managerCascadeErr.message}` }
    }
    const { error: managerAuthErr } = await supabaseAdmin.auth.admin.deleteUser(
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

    // Stamp the manager's audit row.
    await supabaseAdmin
      .from('account_deletion_log')
      .update({ hard_deleted_at: new Date().toISOString() })
      .eq('user_id', managerUserId)
      .is('hard_deleted_at', null)
      .is('reactivated_at', null)

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
  const { data, error } = await supabaseAdmin
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
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { data: dueUsers, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, name, deletion_scheduled_at')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', cutoff)
      .limit(BATCH_LIMIT)

    if (selectError) {
      console.error('[CRON account-deletions] select failed:', selectError)
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
        // Step 1: run the per-role cascade.
        const { data: cascadeResult, error: cascadeError } =
          await supabaseAdmin.rpc('delete_user_account_cascade', {
            p_user_id: userId,
          })

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
              console.warn(
                `[CRON account-deletions] user=${userId} requires Phase 3 ` +
                  `(sole manager) but did not confirm academy cascade. ` +
                  `Leaving pending for manual review.`
              )
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
            await supabaseAdmin
              .from('users')
              .update({ deletion_scheduled_at: null })
              .eq('id', userId)
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
          await supabaseAdmin.auth.admin.deleteUser(userId)

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
        const { error: logError } = await supabaseAdmin
          .from('account_deletion_log')
          .update({ hard_deleted_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('hard_deleted_at', null)
          .is('reactivated_at', null)

        if (logError) {
          // Non-fatal: the user is gone, just the audit timestamp is
          // missing. Log loudly so we can backfill.
          console.error(
            `[CRON account-deletions] audit log update failed for ${userId}:`,
            logError
          )
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: results.length,
      summary,
      results,
    })
  } catch (error) {
    console.error('[CRON account-deletions] unhandled error:', error)
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
