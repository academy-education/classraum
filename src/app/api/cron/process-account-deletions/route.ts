import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'

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
  status: 'hard_deleted' | 'phase_3_required' | 'unsupported_role' | 'error'
  detail?: string
  cascadeSummary?: unknown
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
            console.warn(
              `[CRON account-deletions] user=${userId} requires Phase 3 ` +
                `(sole manager). Leaving in pending state for manual review.`
            )
            results.push({
              userId,
              status: 'phase_3_required',
              detail: msg,
            })
            continue
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
