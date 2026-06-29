import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/snap/bookmark — toggle bookmark on a snap capture.
 *
 * Bookmarked snaps surface in the 오답노트 page as a "북마크한 사진"
 * section, so students can flag a tricky problem for later review
 * even though it never went through study_attempts.
 */

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  captureId: z.string().uuid(),
  bookmarked: z.boolean(),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(
    `snap-bookmark:user:${user.id}`,
    { windowMs: 60 * 1000, max: 30 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('study_snap_captures')
    .update({ bookmarked_at: parsed.data.bookmarked ? new Date().toISOString() : null })
    .eq('id', parsed.data.captureId)
    .eq('student_id', user.id)

  if (error) {
    console.error('[snap/bookmark]', error)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  return NextResponse.json({ bookmarked: parsed.data.bookmarked })
}
