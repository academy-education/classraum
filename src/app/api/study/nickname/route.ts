import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { validateNickname, normalizeNickname } from '@/lib/study/nickname'

/**
 * Nickname management — the public, unique handle shown on leaderboards
 * and used to find friends.
 *
 * GET  /api/study/nickname?check=<candidate>
 *   Availability + format check for the live "is this taken?" hint as the
 *   user types. Returns { available, reason? }. Case-insensitive; the
 *   caller's OWN current nickname reads as available (re-saving is a no-op).
 *
 * PUT  /api/study/nickname  { nickname }
 *   Claim / change the handle. Validates format, then relies on the DB's
 *   case-insensitive unique index as the source of truth for uniqueness
 *   (a race between two claimers resolves to one winner → the loser gets a
 *   409 'nickname_taken' instead of a 500).
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const raw = req.nextUrl.searchParams.get('check') ?? ''
  const reason = validateNickname(raw)
  if (reason) return NextResponse.json({ available: false, reason })

  const candidate = normalizeNickname(raw)
  const taken = await nicknameTakenByOther(candidate, user.id)
  return NextResponse.json({ available: !taken, reason: taken ? 'taken' : undefined })
}

export async function PUT(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`nickname:user:${user.id}`, { windowMs: 60 * 1000, max: 20 })
  if (blocked) return blocked

  let body: { nickname?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (typeof body.nickname !== 'string') {
    return NextResponse.json({ error: 'missing nickname', code: 'invalid' }, { status: 400 })
  }
  const reason = validateNickname(body.nickname)
  if (reason) return NextResponse.json({ error: 'invalid nickname', code: reason }, { status: 400 })
  const nickname = normalizeNickname(body.nickname)

  // Pre-check for a friendly 409 (the unique index is still the real guard
  // below, in case of a concurrent claim between this read and the write).
  if (await nicknameTakenByOther(nickname, user.id)) {
    return NextResponse.json({ error: 'nickname taken', code: 'taken' }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('study_user_prefs')
    .upsert({ student_id: user.id, nickname, updated_at: new Date().toISOString() }, { onConflict: 'student_id' })
    .select('nickname')
    .single()

  if (error) {
    // 23505 = the case-insensitive unique index — someone claimed it first.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'nickname taken', code: 'taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ nickname: data?.nickname ?? nickname })
}

/** Is this handle owned by someone OTHER than the caller? Case-insensitive.
 *  Escapes ILIKE metacharacters — nicknames allow `_`, which is a wildcard
 *  in ILIKE, so an unescaped "a_b" would spuriously match "axb". */
async function nicknameTakenByOther(nickname: string, selfId: string): Promise<boolean> {
  const pattern = nickname.replace(/([\\%_])/g, '\\$1')
  const { data } = await supabaseAdmin
    .from('study_user_prefs')
    .select('student_id')
    .ilike('nickname', pattern)
    .limit(1)
    .maybeSingle()
  return !!data && data.student_id !== selfId
}
