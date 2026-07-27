import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { enforceRateLimit, userOrIpKey } from '@/lib/rate-limit'
import {
  sendAccountScheduledForDeletionEmail,
  sendAcademyClosureNoticeEmail,
} from '@/lib/account-deletion-emails'
import { raiseAlert } from '@/lib/ops/alert'

/**
 * POST /api/account/delete
 *
 * Phase 1 — schedules an account for permanent deletion 30 days from now.
 *
 * Flow:
 *   1. Authenticate the caller via `Authorization: Bearer <access_token>`.
 *   2. Validate the email confirmation matches the user's own email (defense
 *      against accidental clicks; doesn't add real security since the caller
 *      is already authenticated).
 *   3. Set `users.deletion_scheduled_at = NOW()`.
 *   4. Ban the auth identity for 30 days via `banned_until` — this immediately
 *      blocks sign-in. The user's existing session continues working until
 *      they sign out (acceptable: they're about to be signed out by the
 *      client anyway).
 *   5. Insert a row into `account_deletion_log` for the audit trail.
 *
 * The hard cascade (deleting role rows, anonymizing invoices, removing the
 * auth identity) runs in a daily cron — see Phase 2 follow-up.
 *
 * If the user signs back in before the 30-day window elapses, the
 * /api/account/reactivate endpoint clears both the scheduled_at column and
 * the auth ban, restoring the account.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 3 deletion requests per user per hour. Tighter than most
  // endpoints because this is irreversible *and* fires off email blasts
  // (academy-closure notices to every member if the user is a sole
  // manager). Without this, a compromised session could spam the cron's
  // audit log and burn through Postmark quota.
  const blocked = enforceRateLimit(
    userOrIpKey('account-delete', user.id, request),
    { windowMs: 60 * 60 * 1000, max: 3 }
  )
  if (blocked) return blocked

  // Parse + validate body.
  let body: {
    confirmEmail?: string
    reason?: string
    confirmCascadeAcademy?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const confirmEmail = (body.confirmEmail || '').trim().toLowerCase()
  if (!confirmEmail) {
    return NextResponse.json(
      { error: 'confirmEmail is required' },
      { status: 400 }
    )
  }

  if (confirmEmail !== (user.email || '').toLowerCase()) {
    return NextResponse.json(
      { error: 'Email confirmation does not match the account email' },
      { status: 400 }
    )
  }

  // Sole-manager gate. We re-check server-side (the eligibility endpoint
  // is purely for UX and is not trusted as the authority). If the user is
  // the sole manager of any academy AND they didn't opt-in to the cascade
  // confirmation, reject with a structured error so the client can prompt
  // for the extra confirmation.
  const { data: userRoleRow } = await dbAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userRoleRow?.role === 'manager') {
    const { data: soleAcademies, error: soleErr } = await dbAdmin
      .rpc('user_sole_managed_academies', { p_user_id: user.id })
    if (soleErr) {
      console.error('[account/delete] sole-manager check failed:', soleErr)
      return NextResponse.json(
        { error: 'Eligibility check failed' },
        { status: 500 }
      )
    }
    const academies = (soleAcademies ?? []) as Array<{
      academy_id: string
      academy_name: string
      member_count: number
    }>

    if (academies.length > 0 && body.confirmCascadeAcademy !== true) {
      return NextResponse.json(
        {
          error: 'Sole manager — academy cascade confirmation required',
          code: 'SOLE_MANAGER_REQUIRES_CASCADE_CONFIRMATION',
          soleManagedAcademies: academies.map((a) => ({
            academyId: a.academy_id,
            academyName: a.academy_name,
            otherMemberCount: Math.max(0, Number(a.member_count) - 1),
          })),
        },
        { status: 400 }
      )
    }
  }

  // Look up the public.users row to capture audit metadata before anything
  // mutates. If the row is missing, we still proceed — but log it loud since
  // it shouldn't happen in normal flows.
  const { data: userRow, error: userRowError } = await dbAdmin
    .from('users')
    .select('id, email, name, role, deletion_scheduled_at')
    .eq('id', user.id)
    .single()

  if (userRowError) {
    console.warn('[account/delete] users row lookup failed:', userRowError)
  }

  if (userRow?.deletion_scheduled_at) {
    // Idempotent: already scheduled. Return the existing schedule rather than
    // re-banning or double-logging.
    return NextResponse.json({
      success: true,
      alreadyScheduled: true,
      scheduledAt: userRow.deletion_scheduled_at,
    })
  }

  const now = new Date()
  const banUntil = new Date(now)
  // 100 years out — the cron will hard-delete at 30 days, but we ban for far
  // longer in case the cron is broken / paused. Reactivation explicitly
  // clears the ban, so a legit "I changed my mind" still works.
  banUntil.setFullYear(banUntil.getFullYear() + 100)

  // Step 1: mark the public.users row scheduled.
  const { error: updateError } = await dbAdmin
    .from('users')
    .update({ deletion_scheduled_at: now.toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.error('[account/delete] users update failed:', updateError)
    return NextResponse.json(
      { error: 'Failed to schedule deletion (users)' },
      { status: 500 }
    )
  }

  // Step 2: ban the auth identity. If this fails, roll back the users update
  // so we don't leave the user in a half-state (DB says deleted, can still
  // sign in).
  const { error: banError } = await dbAdmin.auth.admin.updateUserById(
    user.id,
    { ban_duration: '876000h' } // 100 years in hours (100 * 365 * 24)
  )

  if (banError) {
    console.error('[account/delete] auth ban failed, rolling back:', banError)
    // Checked: if the rollback is dropped we return a 500 the user reads
    // as "nothing happened", while deletion_scheduled_at stays set — and
    // the daily cron hard-deletes them 30 days later. A failed rollback
    // is a scheduled erasure nobody knows about.
    const { error: rollbackError } = await dbAdmin
      .from('users')
      .update({ deletion_scheduled_at: null })
      .eq('id', user.id)
    if (rollbackError) {
      console.error('[account/delete] rollback failed:', rollbackError)
      await raiseAlert({
        severity: 'critical',
        title: 'Deletion rollback failed — account still scheduled',
        message:
          `User ${user.id} could not be banned so their deletion request was ` +
          `rejected, but clearing users.deletion_scheduled_at failed. They were ` +
          `told the request did not go through, yet the hard-delete cron will ` +
          `erase them in 30 days. Clear the column now.`,
        dedupeKey: 'account-delete:rollback-failed',
        error: rollbackError,
        context: { userId: user.id },
      })
    }
    return NextResponse.json(
      { error: 'Failed to schedule deletion (auth)' },
      { status: 500 }
    )
  }

  // Step 3: audit log. Best-effort — if this fails we still consider the
  // deletion scheduled (the user-visible state has changed). Log loudly.
  const requestedFromIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const requestedUserAgent = request.headers.get('user-agent') || null

  // Encode whether the user confirmed academy cascade into the audit row.
  // The cron uses this when deciding whether to run delete_academy_cascade()
  // for sole-manager rows.
  const reasonPayload = JSON.stringify({
    text: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    confirmCascadeAcademy: body.confirmCascadeAcademy === true,
  })

  const { error: logError } = await dbAdmin
    .from('account_deletion_log')
    .insert({
      user_id: user.id,
      user_email: userRow?.email ?? user.email ?? null,
      user_role: userRow?.role ?? null,
      user_name: userRow?.name ?? null,
      scheduled_at: now.toISOString(),
      requested_from_ip: requestedFromIp,
      requested_user_agent: requestedUserAgent,
      reason: reasonPayload,
    })

  if (logError) {
    // Don't fail the request — the user has been scheduled and banned
    // already, so 500ing here would just confuse them. But this is not
    // cosmetic: the cron REQUIRES an open account_deletion_log row before
    // it will hard-delete, so a missing row means the deletion silently
    // stalls at day 30. Alert rather than leaving a console line.
    console.error(
      '[account/delete] audit log insert failed (deletion still applied):',
      logError
    )
    await raiseAlert({
      severity: 'critical',
      title: 'Deletion audit log not written',
      message:
        `User ${user.id} was scheduled for deletion but the ` +
        `account_deletion_log row could not be written. The hard-delete cron ` +
        `fails closed without it, so this erasure request will never complete ` +
        `until the row is backfilled.`,
      dedupeKey: 'account-delete:audit-log-insert-failed',
      error: logError,
      context: { userId: user.id, scheduledAt: now.toISOString() },
    })
  }

  const hardDeletionDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  // Notification emails — best-effort. We fire-and-forget; failures are
  // logged but never block the response, since the deletion has already
  // been applied at this point.
  //
  // 1) Confirmation to the requesting user.
  //
  // 2) If this is a confirmed sole-manager cascade, warn every other
  //    member of each affected academy that their account will be
  //    hard-deleted in 30 days. They didn't request this — they need a
  //    chance to export data or talk to their academy owner.

  // Pull the user's language preference for the email. Default to English
  // if missing; defensive — never block on a preference lookup.
  let recipientLanguage: string | null = null
  try {
    const { data: pref } = await dbAdmin
      .from('user_preferences')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()
    recipientLanguage = (pref as { language?: string } | null)?.language ?? null
  } catch (e) {
    console.warn('[account/delete] preference lookup failed (continuing):', e)
  }

  // AWAITED. This used to be a detached `void ….then()`. There is no
  // waitUntil on this runtime, so a serverless invocation is free to
  // freeze the moment we return the JSON response — the promise may
  // never resolve and the user is never told their account is scheduled
  // for permanent deletion. sendAccountScheduledForDeletionEmail never
  // throws (it reports {sent,error}), so awaiting cannot fail the request.
  const scheduledEmail = await sendAccountScheduledForDeletionEmail({
    email: userRow?.email ?? user.email ?? '',
    name: userRow?.name ?? 'there',
    language: recipientLanguage,
    hardDeletionDate,
  })
  if (!scheduledEmail.sent) {
    console.error(
      '[account/delete] scheduled email failed:',
      scheduledEmail.error,
      'user=',
      user.id
    )
    await raiseAlert({
      severity: 'warning',
      title: 'Deletion-scheduled email not delivered',
      message:
        `User ${user.id} was scheduled for deletion on ${hardDeletionDate} but ` +
        `the confirmation email did not send. They have no record of the ` +
        `30-day window.`,
      dedupeKey: 'account-delete:scheduled-email-failed',
      error: scheduledEmail.error,
      context: { userId: user.id, hardDeletionDate },
    })
  }

  // Academy cascade case: send heads-up to other members.
  //
  // SECURITY (H3): rate-limit per academy. A sole-manager could otherwise
  // toggle delete → reactivate → delete repeatedly and spam every member
  // with the scary "academy closing" email from our verified Postmark
  // sender. Skip the email blast if we sent one within the last 7 days
  // for this academy.
  //
  // CORRECTNESS (this block used to be a detached `void (async () => …)()`):
  // nothing kept the invocation alive, so on a cold/serverless container the
  // function could return before a single email went out — and the cool-down
  // stamp below was written unconditionally, suppressing every retry for 7
  // days. Net effect: members of a closing academy were never warned their
  // data was about to be deleted. It is now AWAITED, sends are batched so a
  // large academy still fits inside the 60s function budget, and the
  // cool-down is stamped ONLY when every member email actually sent.
  const NOTICE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
  const EMAIL_BATCH_SIZE = 10
  if (body.confirmCascadeAcademy === true && userRoleRow?.role === 'manager') {
    await (async () => {
      try {
        const { data: soleAcademies } = await dbAdmin.rpc(
          'user_sole_managed_academies',
          { p_user_id: user.id }
        )
        const academies = (soleAcademies ?? []) as Array<{
          academy_id: string
          academy_name: string
        }>
        for (const academy of academies) {
          // Cool-down check: skip if a notice went out recently.
          const { data: academyRow } = await dbAdmin
            .from('academies')
            .select('closure_notice_sent_at')
            .eq('id', academy.academy_id)
            .maybeSingle()
          const lastSent = (academyRow as { closure_notice_sent_at?: string } | null)
            ?.closure_notice_sent_at
          if (lastSent) {
            const elapsed = Date.now() - new Date(lastSent).getTime()
            if (elapsed < NOTICE_COOLDOWN_MS) {
              console.warn(
                `[account/delete] skipping closure notice for academy=${academy.academy_id} ` +
                  `(last sent ${Math.floor(elapsed / 86400000)}d ago, cooldown 7d)`
              )
              continue
            }
          }
          // Collect other member user_ids from each role table.
          // (Schema reference: students/parents/teachers/managers each
          // have user_id + academy_id columns. We're the sole manager so
          // managers will only contain ourselves — but defensive anyway.)
          const tables = ['students', 'parents', 'teachers', 'managers'] as const
          const userIds = new Set<string>()
          for (const table of tables) {
            const { data } = await dbAdmin
              .from(table)
              .select('user_id')
              .eq('academy_id', academy.academy_id)
            for (const row of (data ?? []) as Array<{ user_id: string }>) {
              if (row.user_id && row.user_id !== user.id) {
                userIds.add(row.user_id)
              }
            }
          }
          if (userIds.size === 0) continue

          // Fetch emails/names/language preferences in two batches.
          const idArray = Array.from(userIds)
          const { data: members } = await dbAdmin
            .from('users')
            .select('id, email, name')
            .in('id', idArray)
          const { data: prefs } = await dbAdmin
            .from('user_preferences')
            .select('user_id, language')
            .in('user_id', idArray)
          const langByUser = new Map<string, string>()
          for (const p of (prefs ?? []) as Array<{ user_id: string; language?: string }>) {
            if (p.language) langByUser.set(p.user_id, p.language)
          }

          const recipients = (
            (members ?? []) as Array<{ id: string; email: string; name: string }>
          ).filter((m) => m.email)

          const failed: string[] = []
          // Batched rather than fully serial: a 200-member academy at
          // ~300ms/email would blow the 60s function budget serially.
          for (let i = 0; i < recipients.length; i += EMAIL_BATCH_SIZE) {
            const batch = recipients.slice(i, i + EMAIL_BATCH_SIZE)
            const results = await Promise.all(
              batch.map(async (m) => ({
                id: m.id,
                res: await sendAcademyClosureNoticeEmail({
                  email: m.email,
                  name: m.name || 'there',
                  language: langByUser.get(m.id) ?? null,
                  academyName: academy.academy_name,
                  hardDeletionDate,
                }),
              }))
            )
            for (const { id, res } of results) {
              if (!res.sent) {
                failed.push(id)
                console.error(
                  '[account/delete] academy closure email failed:',
                  res.error,
                  'member=',
                  id,
                  'academy=',
                  academy.academy_id
                )
              }
            }
          }

          if (failed.length > 0) {
            // Do NOT stamp the cool-down: leaving it unset is what allows
            // a retry (a second delete request, or an ops re-run) to warn
            // the members who were missed. Stamping here would guarantee
            // silence for 7 days — past which the 30-day window is a
            // third gone.
            await raiseAlert({
              severity: 'critical',
              title: 'Academy closure notices not delivered',
              message:
                `${failed.length} of ${recipients.length} members of academy ` +
                `"${academy.academy_name}" (${academy.academy_id}) were NOT warned ` +
                `that the academy is closing and their data will be deleted on ` +
                `${hardDeletionDate}. Cool-down deliberately not stamped so a retry ` +
                `can reach them.`,
              dedupeKey: `academy-closure-notice:${academy.academy_id}`,
              context: {
                academyId: academy.academy_id,
                triggeredByUserId: user.id,
                failedMemberIds: failed.slice(0, 50),
                totalRecipients: recipients.length,
                hardDeletionDate,
              },
            })
            continue
          }

          // Stamp the cool-down so a subsequent delete/reactivate/delete
          // cycle within 7 days won't re-spam these members. Only reached
          // when every notice actually sent.
          const { error: stampError } = await dbAdmin
            .from('academies')
            .update({ closure_notice_sent_at: new Date().toISOString() })
            .eq('id', academy.academy_id)

          if (stampError) {
            // Not fatal — the members WERE warned. Worst case a repeat
            // delete/reactivate cycle re-sends. Log so the spam-guard
            // regression is visible.
            console.error(
              '[account/delete] closure_notice_sent_at stamp failed for academy=',
              academy.academy_id,
              stampError
            )
          }
        }
      } catch (e) {
        console.error('[account/delete] academy closure email batch failed:', e)
        // Awaited now, so an exception here would 500 the deletion request
        // that already succeeded. Swallow it, but never silently: this is
        // the "members not warned" failure mode.
        await raiseAlert({
          severity: 'critical',
          title: 'Academy closure notice batch crashed',
          message:
            `The academy-closure email blast for user ${user.id} threw before ` +
            `completing. Some or all members of their sole-managed academies ` +
            `were not warned about deletion on ${hardDeletionDate}.`,
          dedupeKey: 'academy-closure-notice:batch-crashed',
          error: e,
          context: { triggeredByUserId: user.id, hardDeletionDate },
        })
      }
    })()
  }

  return NextResponse.json({
    success: true,
    scheduledAt: now.toISOString(),
    // 30 days from now — client uses this for the countdown / message.
    hardDeletionDate,
  })
}
