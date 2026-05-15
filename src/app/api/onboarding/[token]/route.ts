import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Resolves a token → academy. Returns the academy row if the token is valid
// (exists, not expired, not already used). Returns a structured reason
// otherwise so the page can render the right "this link is X" state.
async function resolveToken(token: string): Promise<
  | { ok: true; academy: { id: string; name: string; address: string | null; subscription_tier: string } }
  | { ok: false; reason: 'not_found' | 'expired' | 'completed' }
> {
  const { data: academy } = await supabase
    .from('academies')
    .select('id, name, address, subscription_tier, onboarding_token_expires_at, onboarding_completed_at')
    .eq('onboarding_token', token)
    .maybeSingle()

  if (!academy) return { ok: false, reason: 'not_found' }
  if (academy.onboarding_completed_at) return { ok: false, reason: 'completed' }
  if (
    academy.onboarding_token_expires_at &&
    new Date(academy.onboarding_token_expires_at) < new Date()
  ) {
    return { ok: false, reason: 'expired' }
  }

  return {
    ok: true,
    academy: {
      id: academy.id,
      name: academy.name,
      address: academy.address,
      subscription_tier: academy.subscription_tier,
    },
  }
}

// ---- GET /api/onboarding/[token] ----
//
// Public endpoint. Returns minimal academy info (just enough to show the
// manager what they're signing up for) if the token is valid, or a reason
// code otherwise. Never exposes the academy id when the token is invalid —
// that prevents enumeration.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 })
  }

  const result = await resolveToken(token)
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    academy: {
      // Only the bits the onboarding form needs — id stays internal.
      name: result.academy.name,
      address: result.academy.address,
      subscriptionTier: result.academy.subscription_tier,
    },
  })
}

// ---- POST /api/onboarding/[token] ----
//
// Body: {
//   email: string, password: string, fullName: string, phone?: string,
//   academyName?: string, academyAddress?: string, academyEmail?: string,
//   academyPhone?: string,
// }
//
// Atomic-ish flow:
//   1. Re-validate the token (defense in depth — a stale tab might POST
//      after the token expired)
//   2. Create the auth user via supabase.auth.admin.createUser (auto-confirms
//      the email so the manager can sign in immediately)
//   3. Insert the public users row with role='manager'
//   4. Insert the managers row linking user → academy
//   5. Update the academies row with the (optional) info the manager
//      provided + clear the onboarding token + stamp completed_at
//
// If any step fails after the auth user is created, we attempt to delete
// the auth user so the operation is roughly atomic. Worst case the admin
// can re-issue a new token (the existing one is now consumed).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const result = await resolveToken(token)
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 })
    }
    const academy = result.academy

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null

    // Language preference picked during onboarding. Stored on
    // user_preferences so the dashboard opens in the right language.
    // Falls back to 'english' if missing/invalid.
    const language: 'english' | 'korean' =
      body.language === 'korean' ? 'korean'
      : body.language === 'english' ? 'english'
      : 'english'

    // Required fields validation
    if (!email || !password || !fullName) {
      return NextResponse.json({
        error: 'Email, password, and your full name are required',
      }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long',
      }, { status: 400 })
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // 1. Create the auth user (auto-confirmed so they can log in right after).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: fullName },
    })

    if (authError || !authData.user) {
      console.error('[Onboarding] auth.createUser failed:', authError)
      const msg = authError?.message || 'Failed to create user'
      const status = msg.toLowerCase().includes('already') ? 409 : 500
      return NextResponse.json({ error: msg }, { status })
    }
    const userId = authData.user.id

    // Helper: delete the auth user we just made if a downstream step fails.
    const rollback = async (reason: string) => {
      console.error('[Onboarding] Rolling back auth user', userId, ':', reason)
      try { await supabase.auth.admin.deleteUser(userId) } catch (e) {
        console.error('[Onboarding] Rollback delete failed:', e)
      }
    }

    // 2. Upsert into public users table.
    //
    // The production DB has a `handle_new_user` trigger on auth.users that
    // auto-inserts a row into public.users (likely with a default role).
    // A plain INSERT here would 23505-collide. Upsert handles both cases:
    //   - Row exists (trigger fired) → update name/email/role to what we want
    //   - Row missing (trigger absent) → insert it ourselves
    // We retry briefly to give the trigger a moment to land in case of
    // replication lag.
    let usersError: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from('users')
        .upsert(
          { id: userId, email, name: fullName, role: 'manager' },
          { onConflict: 'id' }
        )
      if (!error) { usersError = null; break }
      usersError = error
      await new Promise(r => setTimeout(r, 250))
    }
    if (usersError) {
      await rollback(usersError.message)
      return NextResponse.json({
        error: 'Failed to create user record',
        detail: usersError.message,
      }, { status: 500 })
    }

    // 3. Insert into managers table.
    const { error: managersError } = await supabase
      .from('managers')
      .insert({ user_id: userId, academy_id: academy.id, phone, active: true })
    if (managersError) {
      await rollback(managersError.message)
      // Best-effort: also delete the public users row we just created.
      await supabase.from('users').delete().eq('id', userId)
      return NextResponse.json({
        error: 'Failed to create manager record',
        detail: managersError.message,
      }, { status: 500 })
    }

    // 3b. Upsert user_preferences with the language picked during onboarding.
    // Non-fatal — if it fails the user just gets the default language and
    // can change it in settings. Using upsert because the auth trigger may
    // have already created a default row.
    {
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, language }, { onConflict: 'user_id' })
      if (prefsError) {
        console.error('[Onboarding] user_preferences upsert failed (non-fatal):', prefsError)
      }
    }

    // 4. Update academy with optional fields + close out the onboarding token.
    // Field values are clamped to reasonable max lengths to avoid abuse.
    const academyUpdates: Record<string, unknown> = {
      onboarding_token: null,             // single-use — clear it
      onboarding_token_expires_at: null,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (typeof body.academyName === 'string' && body.academyName.trim()) {
      academyUpdates.name = body.academyName.trim().slice(0, 200)
    }
    if (typeof body.academyAddress === 'string' && body.academyAddress.trim()) {
      academyUpdates.address = body.academyAddress.trim().slice(0, 500)
    }
    if (typeof body.academyEmail === 'string' && body.academyEmail.trim()) {
      academyUpdates.email = body.academyEmail.trim().toLowerCase().slice(0, 255)
    }
    if (typeof body.academyPhone === 'string' && body.academyPhone.trim()) {
      academyUpdates.phone = body.academyPhone.trim().slice(0, 50)
    }

    const { error: academyError } = await supabase
      .from('academies')
      .update(academyUpdates)
      .eq('id', academy.id)

    if (academyError) {
      // The user + manager rows were created successfully — log this but
      // don't roll back. The manager can still sign in; only the academy
      // metadata + onboarding flag failed to update. Admin can clean up
      // manually if needed.
      console.error('[Onboarding] Academy update failed (non-fatal):', academyError)
    }

    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error('[Onboarding] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
