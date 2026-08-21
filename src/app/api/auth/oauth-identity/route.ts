import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * The facts an OAuth return needs, none of which the browser can see.
 *
 * `auth.users.identities` and `created_at` are only readable through the
 * service role. Without them there is no way to tell a first-time social
 * signup apart from a social identity that Supabase just auto-linked into
 * somebody's pre-existing password account — which is the takeover
 * described in src/lib/auth/oauth-outcome.ts.
 *
 * This route deliberately returns FACTS, not a verdict. The verdict lives
 * in `classifyOAuthOutcome`, which is pure and unit-tested against
 * fixtures for every branch; a decision made here could only be tested
 * against a live Supabase project.
 *
 * It reveals nothing the caller does not already possess: the caller must
 * present a valid Bearer token for the very account being described, so
 * this is not an enumeration oracle.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data, error } = await dbAdmin.auth.admin.getUserById(user.id)
  if (error || !data?.user) {
    return NextResponse.json({ error: 'identity lookup failed' }, { status: 500 })
  }

  // `.maybeSingle()` — a MISSING row is the interesting case here, and
  // `.single()` would turn it into an error we would have to unpick from
  // a genuine failure.
  const { data: profile } = await dbAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    email: data.user.email ?? null,
    userCreatedAt: data.user.created_at ?? null,
    emailConfirmedAt: data.user.email_confirmed_at ?? null,
    identities: (data.user.identities ?? []).map((i) => ({
      provider: i.provider,
      createdAt: i.created_at ?? null,
    })),
    profileExists: Boolean(profile),
  })
}
