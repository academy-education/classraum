import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth'
import { refundSessionCredits } from '@/lib/study/admin-session-refund'

/**
 * POST /api/admin/study/sessions/refund-credits
 *   { sessionId, reason, studentId?, allowCompleted? }
 *
 * Give back the credits one test session was charged — idempotently (a
 * repeat call refunds nothing and says so). Admin-only. See
 * src/lib/study/admin-session-refund.ts for the safety properties.
 */

export const dynamic = 'force-dynamic'

const Body = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(200),
  allowCompleted: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req)
  if (!auth.success) return auth.response

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body', details: parsed.error.flatten() }, { status: 400 })

  const out = await refundSessionCredits({ adminId: auth.user.id, ...parsed.data })

  if (out.result) {
    const r = out.result
    await logAdminActivity({
      adminUserId: auth.user.id,
      action: 'STUDY_SESSION_CREDIT_REFUND',
      description:
        `Session ${parsed.data.sessionId}: refunded ${r.refunded} credit(s), ${r.already} already refunded, ` +
        `${r.failed} failed${r.archived ? ', session archived' : ''} — ${parsed.data.reason}`,
      targetType: 'user',
      targetId: r.studentId,
      metadata: {
        sessionId: parsed.data.sessionId,
        refunded: r.refunded,
        already: r.already,
        failed: r.failed,
        sources: r.refundedSources,
        archived: r.archived,
        allowCompleted: parsed.data.allowCompleted ?? false,
      },
    })
  }

  return NextResponse.json(out.body, { status: out.status })
}
