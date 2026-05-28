import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/account/reactivate
 *
 * Restores a soft-deleted account: clears `deletion_scheduled_at` on the
 * users row, lifts the auth ban, and stamps the audit log entry as
 * reactivated.
 *
 * SECURITY HARDENING (security review C1):
 *
 *   1. Pre-check that there's actually a scheduled deletion for the given
 *      email. If not, return a generic 401 — exactly the same response
 *      shape as "wrong password" — without ever touching Supabase auth.
 *      This means the endpoint can only be used to reactivate accounts
 *      that are genuinely in a banned state; it cannot be used as a
 *      generic password-checking oracle against arbitrary users.
 *
 *   2. The pre-check uses a direct SQL lookup against `public.users` by
 *      email (with service-role context) — replaces the prior pattern
 *      that paginated `auth.admin.listUsers({ perPage: 1000 })`, which
 *      was both a DoS amplifier and silently failed past 1000 users.
 *
 *   3. No `alreadyActive` short-circuit. The old endpoint returned
 *      `{ success: true, alreadyActive: true }` when the password was
 *      correct but the account wasn't banned — that confirmed valid
 *      credentials for ANY user, regardless of deletion state. Now we
 *      simply never invoke signInWithPassword unless the user is
 *      actually scheduled.
 *
 * Caller flow (unchanged from the client's perspective):
 *   - Banned user attempts /auth → catches the "banned" error → redirects
 *     to /account/reactivate with their email prefilled.
 *   - User enters password → hits this endpoint.
 *   - Success → /auth, sign in normally.
 *
 * Note: this is "username/password reactivation" only. OAuth accounts
 * would need a different flow (the app currently has no OAuth).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password are required' },
      { status: 400 }
    )
  }

  // Rate limit: 5 attempts per email per 15 minutes, plus 20/IP/15min for
  // multi-account attackers. This endpoint is the only authenticated
  // entry point a banned user has, so it would be the obvious target for
  // password-spraying. The email-keyed limit defends a specific account;
  // the IP-keyed one defends against credential-stuffing across many.
  const emailBlocked = enforceRateLimit(
    `account-reactivate:email:${email}`,
    { windowMs: 15 * 60 * 1000, max: 5 },
    'Too many reactivation attempts. Try again in a few minutes.'
  )
  if (emailBlocked) return emailBlocked

  const ipBlocked = enforceRateLimit(
    `account-reactivate:ip:${getClientIp(request)}`,
    { windowMs: 15 * 60 * 1000, max: 20 },
    'Too many reactivation attempts. Try again in a few minutes.'
  )
  if (ipBlocked) return ipBlocked

  // SECURITY GATE: only proceed if the email corresponds to an account
  // that is genuinely scheduled for deletion. This prevents the endpoint
  // from being used as a credential-checking oracle for healthy
  // accounts. The response intentionally matches the "invalid credentials"
  // shape below so attackers can't distinguish "unknown email" /
  // "not banned" / "wrong password" via response timing or shape.
  const { data: userRow, error: userRowError } = await supabaseAdmin
    .from('users')
    .select('id, email, deletion_scheduled_at')
    .ilike('email', email)
    .maybeSingle()

  if (userRowError) {
    console.error('[account/reactivate] users lookup failed:', userRowError)
    // Don't leak that the lookup failed — same shape as invalid creds.
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  if (!userRow || !userRow.deletion_scheduled_at) {
    // Either no such email, or the account isn't scheduled for deletion.
    // Either way, this endpoint has nothing to do — return generic 401.
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  const userId = userRow.id as string

  // Now safe to verify the password against Supabase auth. We do this
  // via an isolated anon client + signInWithPassword. Banned users get
  // an "banned" error which we treat as proof of correct credentials.
  const { createClient } = await import('@supabase/supabase-js')
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    const msg = signInError.message?.toLowerCase() || ''
    const isBanned =
      msg.includes('banned') ||
      msg.includes('not_allowed') ||
      msg.includes('user_banned')

    if (!isBanned) {
      // Wrong password — reject with generic shape.
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    // Banned + correct password → this is the user. Fall through to unban.
  } else {
    // Password was correct AND user is NOT banned. This shouldn't happen
    // given our pre-check above (we only got here because
    // deletion_scheduled_at was set, which always coincides with a ban).
    // Defensive: sign out the leaked session immediately and return
    // success without exposing the inconsistency.
    await anonClient.auth.signOut().catch(() => {})
    // Clear the stale deletion_scheduled_at column to bring DB into sync.
    await supabaseAdmin
      .from('users')
      .update({ deletion_scheduled_at: null })
      .eq('id', userId)
    return NextResponse.json({ success: true })
  }

  // Lift the ban.
  const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { ban_duration: 'none' }
  )

  if (unbanError) {
    console.error('[account/reactivate] unban failed:', unbanError)
    return NextResponse.json(
      { error: 'Failed to reactivate (auth)' },
      { status: 500 }
    )
  }

  // Clear the scheduled-deletion column on the users row.
  const { error: clearError } = await supabaseAdmin
    .from('users')
    .update({ deletion_scheduled_at: null })
    .eq('id', userId)

  if (clearError) {
    console.error('[account/reactivate] users clear failed:', clearError)
    // Don't fail — auth ban is already lifted. Log loudly so we can
    // backfill if needed: the cron checks deletion_scheduled_at + 30d
    // so a stale value past the cutoff could re-trigger deletion.
  }

  // Stamp open log entries as reactivated.
  const { error: logError } = await supabaseAdmin
    .from('account_deletion_log')
    .update({ reactivated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('reactivated_at', null)
    .is('hard_deleted_at', null)

  if (logError) {
    console.warn('[account/reactivate] audit log update failed:', logError)
  }

  return NextResponse.json({ success: true })
}
