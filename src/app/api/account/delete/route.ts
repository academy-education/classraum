import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

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

  // Parse + validate body.
  let body: { confirmEmail?: string; reason?: string }
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

  // Look up the public.users row to capture audit metadata before anything
  // mutates. If the row is missing, we still proceed — but log it loud since
  // it shouldn't happen in normal flows.
  const { data: userRow, error: userRowError } = await supabaseAdmin
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
  const { error: updateError } = await supabaseAdmin
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
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { ban_duration: '876000h' } // 100 years in hours (100 * 365 * 24)
  )

  if (banError) {
    console.error('[account/delete] auth ban failed, rolling back:', banError)
    await supabaseAdmin
      .from('users')
      .update({ deletion_scheduled_at: null })
      .eq('id', user.id)
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

  const { error: logError } = await supabaseAdmin
    .from('account_deletion_log')
    .insert({
      user_id: user.id,
      user_email: userRow?.email ?? user.email ?? null,
      user_role: userRow?.role ?? null,
      user_name: userRow?.name ?? null,
      scheduled_at: now.toISOString(),
      requested_from_ip: requestedFromIp,
      requested_user_agent: requestedUserAgent,
      reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    })

  if (logError) {
    // Don't fail the request — the user has been scheduled, the audit log
    // is best-effort. But this should fire an alert in a healthy system.
    console.error(
      '[account/delete] audit log insert failed (deletion still applied):',
      logError
    )
  }

  return NextResponse.json({
    success: true,
    scheduledAt: now.toISOString(),
    // 30 days from now — client uses this for the countdown / message.
    hardDeletionDate: new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  })
}
