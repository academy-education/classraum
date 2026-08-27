import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { enforceRateLimit, userOrIpKey } from '@/lib/rate-limit'
import { buildNameUpdate } from '@/lib/name'
import { normalizePhone } from '@/lib/auth/phone'

/**
 * POST /api/auth/complete-social-onboarding
 *
 * Writes the name and phone collected by the blocking step that a social
 * signup sees on first run. Google, Kakao and Apple hand over an email
 * and at best a display name, so without this `users.phone` stays NULL
 * for every social account and the name is whatever the provider called
 * them — frequently a Kakao nickname rather than a real name.
 *
 * SERVER-SIDE VALIDATION IS THE POINT, not a formality. The client can
 * be skipped: this endpoint is reachable directly with a bearer token,
 * so it re-validates the phone and re-derives the name columns rather
 * than trusting the shapes the form claims to have produced.
 *
 * IT DOES NOT TOUCH ROLE, ACADEMY OR FAMILY. Those are decided by
 * /api/academy/join from a server-read invite, and a first-run form is
 * exactly the self-asserted channel that must not be allowed to set
 * them (see PIN 1 in src/lib/auth/oauth-context.ts).
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generous, but bounded: a real user submits this once. A tighter cap
  // would punish someone fixing a typo on a flaky connection.
  const blocked = enforceRateLimit(
    userOrIpKey('complete-social-onboarding', user.id, request),
    { windowMs: 10 * 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  let body: { familyName?: unknown; givenName?: unknown; phone?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const familyName = typeof body.familyName === 'string' ? body.familyName.trim() : ''
  const givenName = typeof body.givenName === 'string' ? body.givenName.trim() : ''
  const phoneRaw = typeof body.phone === 'string' ? body.phone : ''

  if (!familyName || !givenName) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  // normalizePhone returns null for anything implausible, so this both
  // validates and canonicalises in one step. A null here means the input
  // was not a phone number, NOT that the field was optional.
  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return NextResponse.json({ error: 'phone_invalid' }, { status: 400 })
  }

  // buildNameUpdate sets family_name, given_name, the composed `name`,
  // AND name_confirmed_at — the same writer the name re-prompt uses, so
  // the two cannot disagree about what "settled" means.
  const { error } = await dbAdmin
    .from('users')
    .update({ ...buildNameUpdate(familyName, givenName), phone })
    .eq('id', user.id)

  if (error) {
    // Destructured and checked: supabase-js resolves with { error }, so
    // an un-checked await here would report success for the one failure
    // this route exists to perform.
    console.error('[complete-social-onboarding] update failed:', error)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
