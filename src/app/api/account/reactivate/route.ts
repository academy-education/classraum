import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/account/reactivate
 *
 * Restores a soft-deleted account: clears `deletion_scheduled_at` on the
 * users row, lifts the auth ban, and stamps the audit log entry as
 * reactivated.
 *
 * Auth is intentionally different from /delete: a scheduled-for-deletion
 * user CANNOT sign in (we banned them), so they can't carry a normal
 * `Authorization: Bearer` token. Instead they sign back in via the regular
 * /auth page — Supabase rejects them with an "User is banned" message — and
 * the reactivation page calls this endpoint with their email + password.
 *
 * We verify the password directly via signInWithPassword on a fresh client
 * (which will fail with the banned error but lets us re-check credentials),
 * then admin-update the auth user to clear the ban, then admin-update the
 * public.users row.
 *
 * Note: this is "username/password reactivation" only. OAuth users would
 * need a different flow (we don't have OAuth yet).
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

  // Find the auth user by email. We use admin.listUsers with a filter — a
  // direct lookup-by-email API doesn't exist in supabase-js v2 at the time
  // of writing.
  // Practical scale: this app's user base is small enough that paginating
  // listUsers is fine. If user count grows, replace with a SQL query
  // against auth.users via the service role.
  const { data: usersList, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (listError) {
    console.error('[account/reactivate] listUsers failed:', listError)
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500 }
    )
  }

  const authUser = usersList.users.find(
    (u) => (u.email || '').toLowerCase() === email
  )

  if (!authUser) {
    // Don't leak existence — same response shape as wrong password.
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // Verify the password without actually signing them in (since they're
  // banned). We do this by spinning up an isolated anon client and
  // attempting signInWithPassword — Supabase returns either
  // "Invalid login credentials" (wrong pw) or "User is banned" (right pw,
  // but currently banned). The latter is the success case for us.
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
      msg.includes('banned') || msg.includes('not_allowed') || msg.includes('user_banned')

    if (!isBanned) {
      // Wrong password (or any other error) — reject without leaking detail.
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    // Banned + correct password → this is the user, proceed to reactivate.
  } else {
    // Sign-in succeeded — they weren't banned. Means no active deletion
    // request. Either the user already reactivated, or there was never a
    // scheduled deletion. Either way, harmless to no-op.
    await anonClient.auth.signOut().catch(() => {})
    return NextResponse.json({
      success: true,
      alreadyActive: true,
    })
  }

  // Lift the ban. `ban_duration: 'none'` clears banned_until.
  const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
    authUser.id,
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
    .eq('id', authUser.id)

  if (clearError) {
    console.error('[account/reactivate] users clear failed:', clearError)
    // Don't fail — auth ban is already lifted, user can sign in. But log
    // loudly: the next cron run might re-process this row if the column
    // isn't cleared. (The cron checks deletion_scheduled_at + 30d < now.)
  }

  // Stamp the most recent open log entry as reactivated. If multiple open
  // entries exist (shouldn't, but possible if the user re-requested and
  // reactivated repeatedly), stamp them all — they were all reactivated.
  const { error: logError } = await supabaseAdmin
    .from('account_deletion_log')
    .update({ reactivated_at: new Date().toISOString() })
    .eq('user_id', authUser.id)
    .is('reactivated_at', null)
    .is('hard_deleted_at', null)

  if (logError) {
    console.warn('[account/reactivate] audit log update failed:', logError)
  }

  return NextResponse.json({ success: true })
}
