import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit'
import { isPlausiblePhone } from '@/lib/auth/phone'
import { findAccountsByPhone } from '@/lib/auth/phone-duplicates'

/**
 * POST /api/auth/phone-lookup { phone } → { exists, provider?, since?, emailHint? }
 *
 * Called by the signup form BEFORE creating an account, so a person who
 * already has one is told so — with the sign-in method and a masked email —
 * instead of getting a second account. Unauthenticated by necessity, so:
 * rate-limited per IP, reveals only provider + masked email + month, and
 * never confirms an address. That is the same information a "forgot which
 * method I used" screen would show, and far less than an account-exists
 * error on the signup form itself.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(`phone-lookup:ip:${getClientIp(req)}`, { windowMs: 60 * 1000, max: 10 })
  if (blocked) return blocked
  let body: { phone?: unknown } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const phone = typeof body.phone === 'string' ? body.phone : ''
  if (!isPlausiblePhone(phone)) return NextResponse.json({ exists: false })
  const [first] = await findAccountsByPhone(phone)
  if (!first) return NextResponse.json({ exists: false })
  return NextResponse.json({ exists: true, provider: first.provider, since: first.since, emailHint: first.emailHint })
}
