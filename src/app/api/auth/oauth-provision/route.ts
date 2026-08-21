import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { splitName, buildNameUpdate } from '@/lib/name'

/**
 * Repair for an authenticated user with no `public.users` row.
 *
 * `handle_new_user()` swallows every exception (migration 094, design
 * note 5): if its INSERT raises, the signup still succeeds and the user
 * ends up authenticated with no profile. The observed way to reach that
 * on an OAuth signup is a provider that returns no email — `users.email`
 * is NOT NULL — but the trigger can fail for other reasons too, and the
 * end state is identical: every screen queries `users` by id, gets
 * nothing, and renders blank with no error anywhere.
 *
 * This route makes that state recoverable instead of terminal. It is
 * NOT a second signup path:
 *   - it only ever writes the row for the CALLER's own id;
 *   - it refuses when the auth user has no email, because that is the
 *     unfixable case and inventing a placeholder address would create a
 *     row that collides with the real owner of that address later;
 *   - it is a no-op when the row already exists, so a double-tap or a
 *     retry cannot overwrite a real profile;
 *   - it never sets role, academy or family. Role stays at the schema
 *     default ('student', no academy), exactly as the trigger would have
 *     left a study signup. Academy attachment goes through
 *     /api/academy/join, which is server-authoritative.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data: existing } = await dbAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, created: false })

  const { data: adminUser } = await dbAdmin.auth.admin.getUserById(user.id)
  const email = adminUser?.user?.email?.trim()
  if (!email) {
    // Nothing to repair: the NOT NULL column has no value and no
    // defensible substitute. The caller shows the provider-specific
    // "we need an email address" message.
    return NextResponse.json({ error: 'no_email' }, { status: 409 })
  }

  // Providers hand back a display name, not 성/이름. splitName() returns
  // null whenever the rule cannot split confidently — and when it does,
  // BOTH columns stay NULL rather than storing a half split, which is the
  // same discipline the trigger follows and the same predicate the name
  // re-prompt keys off. The re-prompt then asks this user for their name,
  // which is the designed "collect it later" mechanism.
  const meta = (adminUser?.user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    ''
  const split = displayName ? splitName(displayName) : null

  const { error: insertError } = await dbAdmin.from('users').insert({
    id: user.id,
    email,
    // ROLE IS ALWAYS 'student', AND IS NOT TAKEN FROM THE CLIENT.
    //
    // It is tempting to let the caller pass the invite's role along so a
    // provisioned parent lands on the right surface immediately. That
    // would be a self-asserted role over an authenticated-but-unverified
    // channel — precisely what PIN 1 in src/lib/auth/oauth-context.ts
    // exists to refuse, and this route runs with the service role, so it
    // would be the one place the refusal could be bypassed.
    //
    // 'student' is also what the trigger's own default produces for a
    // study signup, so nothing regresses for the common case. When the
    // user really was invited, /api/academy/join runs immediately after
    // this and reconciles users.role itself — that reconciliation is
    // server-authoritative because it re-reads the family_members row.
    role: 'student',
    ...(split
      ? buildNameUpdate(split.family_name, split.given_name)
      : { name: displayName || email }),
  })

  if (insertError) {
    // CHECKED, not swallowed. supabase-js resolves with { error }; an
    // un-destructured await here would report success for the exact
    // failure this route exists to fix.
    console.error('[oauth-provision] users insert failed:', insertError)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  const { error: prefsError } = await dbAdmin
    .from('user_preferences')
    .insert({ user_id: user.id })
  if (prefsError && !prefsError.message.includes('duplicate')) {
    console.error('[oauth-provision] user_preferences insert failed:', prefsError)
    // Non-fatal: preferences have defaults everywhere they are read.
  }

  return NextResponse.json({ ok: true, created: true })
}
