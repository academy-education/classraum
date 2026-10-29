import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { parseSignupGeo, isWithinSignupWindow } from '@/lib/auth/signup-geo'

/**
 * Records where the CALLER's account signed up from (migration 129). Called
 * once by the client right after sign-in. Writes only when the account is new
 * (created within the signup window) and has no location yet, so a returning
 * user's later travels never overwrite or invent a signup location. The IP is
 * never stored, only Vercel's country / region / city for it.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  if (!isWithinSignupWindow(user.created_at)) return NextResponse.json({ ok: true, recorded: false, reason: 'not_new' })
  const geo = parseSignupGeo(req.headers)
  if (!geo) return NextResponse.json({ ok: true, recorded: false, reason: 'no_geo' })

  const { data, error } = await dbAdmin
    .from('users')
    .update({ signup_country: geo.country, signup_region: geo.region, signup_city: geo.city, signup_geo_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('signup_country', null)
    .select('id')
  if (error) {
    console.error('[signup-geo] update failed', { userId: user.id, error })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, recorded: (data ?? []).length > 0 })
}
