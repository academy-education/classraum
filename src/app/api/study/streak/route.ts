import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/streak — server-authoritative streak count.
 *
 * Reads distinct-day activity from study_sessions.last_active_at
 * over the last 60 days, then walks backward from today counting
 * consecutive days. Server timezone is UTC; a student in KST who
 * studies at 1am might roll over "day" differently. We include
 * yesterday-grace: if the student didn't study today but did
 * yesterday, the streak still counts (matches the app's landing
 * chip behavior).
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`streak:user:${user.id}`, { windowMs: 60 * 1000, max: 30 })
  if (blocked) return blocked

  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('study_sessions')
    .select('last_active_at')
    .eq('student_id', user.id)
    .gte('last_active_at', cutoff)
    .order('last_active_at', { ascending: false })
    .limit(500)

  const days = new Set<string>()
  for (const row of data ?? []) {
    if (!row.last_active_at) continue
    const d = new Date(row.last_active_at as string)
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }

  const today = new Date()
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

  const cursor = new Date(today)
  // Yesterday-grace: if today is empty but yesterday has activity,
  // start counting from yesterday so a student who hasn't opened
  // the app YET today still sees an active streak.
  if (!days.has(dayKey(cursor)) && days.has(dayKey(new Date(cursor.getTime() - 86400_000)))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let count = 0
  while (days.has(dayKey(cursor)) && count < 400) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }

  return NextResponse.json({ streak: count })
}
