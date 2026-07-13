import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp, type XpEventType } from '@/lib/study/xp'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/xp — client-side XP awarding endpoint.
 *
 * Used by surfaces that write directly to Supabase from the client
 * (flashcards review in FlashcardsSession + the /mobile/study/review
 * page) and so can't call the server-only awardXp helper inline.
 *
 * Allowed event types are restricted to the ones a client should be
 * able to claim — practice grading, snap solving, and response
 * grading go through their own server routes and award XP there.
 */

export const dynamic = 'force-dynamic'

const CLIENT_EVENT_TYPES: readonly XpEventType[] = [
  'flashcard_easy',
  'flashcard_hard',
  'flashcard_again',
] as const

const BodySchema = z.object({
  eventType: z.enum(['flashcard_easy', 'flashcard_hard', 'flashcard_again']),
  sourceId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Tight per-user rate limit — flashcards fire rapidly; we cap the
  // claim rate to prevent a runaway tab from spamming the leagues.
  const blocked = enforceRateLimit(
    `xp-award:user:${user.id}`,
    { windowMs: 60 * 1000, max: 60 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })
  if (!CLIENT_EVENT_TYPES.includes(parsed.data.eventType)) {
    return NextResponse.json({ error: 'event not allowed from client' }, { status: 403 })
  }

  await awardXp(user.id, parsed.data.eventType, parsed.data.sourceId ?? null)
  return NextResponse.json({ ok: true })
}
