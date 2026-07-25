import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';
import { getPaymentInfo, cancelPayment } from '@/lib/portone-charge';

/**
 * Admin view of a student's study-system income (the PortOne side of the
 * house) + the ability to issue a refund.
 *
 * GET  /api/admin/study/payments?studentId=<uuid>
 *   → the student's study_payments rows (credit packs / exam passes),
 *     each enriched with its authoritative live PortOne status so the
 *     operator sees PAID vs CANCELLED without trusting stale local state.
 *
 * POST /api/admin/study/payments   { paymentId, reason }
 *   → full refund via PortOne (cancelPayment). The refund is ALWAYS
 *     operator-initiated here; we never auto-refund. Credits are NOT
 *     auto-revoked (a student may already have spent them) — the operator
 *     adjusts the balance separately if needed. Logged to activity.
 *
 * Admin-only; study data is minors' billing info so access is gated.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

  const { data: rows, error } = await supabaseAdmin
    .from('study_payments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[admin/study/payments] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }

  // Enrich each row with live PortOne status (in parallel, bounded by the
  // 100-row cap). A missing/unreadable payment just yields status 'UNKNOWN'
  // rather than failing the whole list.
  const payments = await Promise.all(
    (rows ?? []).map(async (r) => {
      const paymentId = r.payment_id as string;
      const info = await getPaymentInfo(paymentId).catch(() => null);
      return {
        paymentId,
        kind: r.kind as string,
        amountWon: (r.amount_won as number) ?? null,
        createdAt: (r.created_at as string) ?? null,
        // PortOne statuses: PAID, CANCELLED, PARTIAL_CANCELLED, FAILED, …
        portoneStatus: info?.ok ? (info.status ?? 'UNKNOWN') : 'UNKNOWN',
        portoneAmount: info?.ok ? (info.amountTotal ?? null) : null,
      };
    }),
  );

  const grossWon = payments
    .filter((p) => p.portoneStatus === 'PAID')
    .reduce((sum, p) => sum + (p.amountWon ?? 0), 0);

  return NextResponse.json({ payments, grossWon });
}

const RefundSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = RefundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { paymentId, reason } = parsed.data;

  // Only refund payments that are ours (a study_payments row). Prevents this
  // endpoint from being used to cancel arbitrary PortOne payment IDs.
  const { data: row } = await supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, amount_won, kind')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'payment not found' }, { status: 404 });

  const result = await cancelPayment({ paymentId, reason });
  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? 'refund failed' }, { status: 502 });
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_PAYMENT_REFUND',
    description: `Refunded study payment ${paymentId} (${row.kind}, ${row.amount_won ?? '?'} KRW) — ${reason}`,
  });

  return NextResponse.json({ ok: true, status: result.status ?? 'CANCELLED', cancelledAmount: result.cancelledAmount ?? null });
}
