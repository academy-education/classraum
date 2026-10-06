import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth'
import { refundSessionCredits, type SessionRefundOutcome } from '@/lib/study/admin-session-refund'
import { notifyCreditRefund } from '@/lib/study/credit-refund-notify'

/**
 * POST /api/admin/study/sessions/refund-credits
 *   { sessionId | sessionIds[], reason, studentId?, allowCompleted?,
 *     notify? (default true), noticeReason?: { ko?, en? } }
 *
 * Give back the credits of one or more test sessions — idempotently (a
 * repeat call refunds nothing and says so). Admin-only. See
 * src/lib/study/admin-session-refund.ts for the safety properties.
 *
 * NOTIFY. Unless `notify: false`, each student whose credits came back gets
 * ONE in-app notice + email covering every session in this request (six
 * sessions → one "12 credits returned"). `reason` is the internal audit
 * label; `noticeReason` is the optional sentence the student reads, per
 * language — omitted, the student gets the generic wording.
 */

export const dynamic = 'force-dynamic'

const NoticeReason = z.object({
  ko: z.string().trim().max(200).optional(),
  en: z.string().trim().max(200).optional(),
}).optional()

const Body = z.object({
  sessionId: z.string().uuid().optional(),
  sessionIds: z.array(z.string().uuid()).min(1).max(20).optional(),
  studentId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(200),
  allowCompleted: z.boolean().optional(),
  notify: z.boolean().optional(),
  noticeReason: NoticeReason,
}).refine(b => !!b.sessionId !== !!b.sessionIds, { message: 'pass exactly one of sessionId or sessionIds' })

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req)
  if (!auth.success) return auth.response

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body', details: parsed.error.flatten() }, { status: 400 })
  const { sessionId, sessionIds, notify = true, noticeReason, ...rest } = parsed.data
  const ids = Array.from(new Set(sessionIds ?? [sessionId!]))

  // Refund every session first, notifying nobody yet.
  const outs: Array<{ sessionId: string; out: SessionRefundOutcome }> = []
  for (const id of ids) {
    const out = await refundSessionCredits({ adminId: auth.user.id, sessionId: id, ...rest, notify: false })
    outs.push({ sessionId: id, out })
    if (out.result) {
      const r = out.result
      await logAdminActivity({
        adminUserId: auth.user.id,
        action: 'STUDY_SESSION_CREDIT_REFUND',
        description:
          `Session ${id}: refunded ${r.refunded} credit(s), ${r.already} already refunded, ` +
          `${r.failed} failed${r.archived ? ', session archived' : ''} — ${rest.reason}`,
        targetType: 'user',
        targetId: r.studentId,
        metadata: {
          sessionId: id,
          refunded: r.refunded,
          already: r.already,
          failed: r.failed,
          sources: r.refundedSources,
          archived: r.archived,
          allowCompleted: rest.allowCompleted ?? false,
        },
      })
    }
  }

  // Then one notice per student, covering every row this request returned.
  const notices: Record<string, string> = {}
  if (notify) {
    const byStudent = new Map<string, { ledgerIds: string[]; sessionIds: string[] }>()
    for (const { sessionId: id, out } of outs) {
      const r = out.result
      if (!r || r.refundLedgerIds.length === 0) continue
      const g = byStudent.get(r.studentId) ?? { ledgerIds: [], sessionIds: [] }
      g.ledgerIds.push(...r.refundLedgerIds)
      g.sessionIds.push(id)
      byStudent.set(r.studentId, g)
    }
    for (const [studentId, g] of byStudent) {
      const n = await notifyCreditRefund(studentId, g.ledgerIds, noticeReason, { sessionIds: g.sessionIds })
      notices[studentId] = n.status === 'skipped' || n.status === 'failed' ? `${n.status}: ${n.reason}` : n.status
    }
  }

  if (!sessionIds) {
    const { out } = outs[0]
    return NextResponse.json({ ...out.body, ...(notify ? { notice: Object.values(notices)[0] ?? 'nothing to notify' } : {}) }, { status: out.status })
  }
  const status = outs.every(o => o.out.status === 200) ? 200 : outs.some(o => o.out.status === 502) ? 502 : 207
  return NextResponse.json(
    { ok: status === 200, results: outs.map(o => ({ status: o.out.status, ...o.out.body })), ...(notify ? { notices } : {}) },
    { status },
  )
}
